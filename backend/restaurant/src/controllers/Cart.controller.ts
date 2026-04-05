import { Request, Response, NextFunction } from "express";
import { Cart } from "../models/Cart";
import { MenuItem } from "../models/MenuItem";
import { Restaurant } from "../models/Restaurnent";
import { asyncHandler } from "../utils/asyncHandler";
import { AppError } from "../utils/AppError";

// ─────────────────────────────────────────────
//  GET CART
//  Route: GET /api/v1/cart
//  Auth:  requireAuth
// ─────────────────────────────────────────────
export const getCart = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const userId = req.userId;

    console.log("🟢 [CartController] getCart called for userId:", userId);

    const cart = await Cart.findOne({ userId });

    if (!cart) {
      return res.status(200).json({
        success: true,
        data: null,
        message: "Cart is empty",
      });
    }

    res.status(200).json({
      success: true,
      data: cart,
    });
  }
);

// ─────────────────────────────────────────────
//  ADD ITEM TO CART  (optimistic — no DB write)
//  Route: POST /api/v1/cart/add
//  Auth:  requireAuth
//  Body:  { menuItemId, quantity?, specialInstructions? }
//
//  ⚡ Only validates & returns updated cart state.
//  ⚡ Actual DB write happens via /sync (debounced from frontend).
// ─────────────────────────────────────────────
export const addToCart = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const userId = req.userId;
    const { menuItemId, quantity = 1, specialInstructions } = req.body;

    console.log("🟢 [CartController] addToCart (optimistic) — userId:", userId);

    // ── Validate ──
    if (!menuItemId) {
      return next(new AppError("menuItemId is required", 400));
    }
    if (quantity < 1) {
      return next(new AppError("Quantity must be at least 1", 400));
    }

    // ── Fetch menu item ──
    const menuItem = await MenuItem.findById(menuItemId);
    if (!menuItem) return next(new AppError("Menu item not found", 404));
    if (!menuItem.isAvailable) {
      return next(new AppError("This item is currently unavailable", 400));
    }

    // ── Fetch restaurant ──
    const restaurant = await Restaurant.findById(menuItem.restaurantId);
    if (!restaurant) return next(new AppError("Restaurant not found", 404));

    // ── Load current cart (read-only, no save here) ──
    let cart = await Cart.findOne({ userId });

    // ── Different restaurant guard ──
    if (cart && cart.restaurantId.toString() !== menuItem.restaurantId.toString()) {
      return next(
        new AppError(
          "Your cart has items from a different restaurant. Clear cart first.",
          400
        )
      );
    }

    // ── Build optimistic cart state in memory ──
    //    We compute what the cart WILL look like and return it.
    //    The frontend holds this state and syncs later via /sync.

    const existingItems = cart ? [...cart.items] : [];

    const existingIndex = existingItems.findIndex(
      (i) => i.menuItemId.toString() === menuItemId
    );

    if (existingIndex > -1) {
      existingItems[existingIndex] = {
        ...existingItems[existingIndex],
        quantity: existingItems[existingIndex].quantity + quantity,
      };
    } else {
      existingItems.push({
        menuItemId,
        name:menuItem.name,
        price:menuItem.price,
        quantity,
        specialInstructions: specialInstructions ?? "",
      });
    }

    // ── Compute totals in memory ──
    const totalPrice = existingItems.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    );
    const itemCount = existingItems.reduce(
      (sum, item) => sum + item.quantity,
      0
    );

    const optimisticCart = {
      userId,
      restaurantId:   menuItem.restaurantId,
      restaurantName: restaurant.name,
      items:          existingItems,
      totalPrice,
      itemCount,
    };

    console.log("🟡 [CartController] Optimistic state built — NOT saved to DB yet");

    // ── Return optimistic state (no DB write) ──
    res.status(200).json({
      success: true,
      message: "Item added (pending sync)",
      data:    optimisticCart,
      synced:  false,   // frontend uses this flag to know a sync is needed
    });
  }
);

// ─────────────────────────────────────────────
//  SYNC CART  ← the ONLY place DB gets written
//  Route: POST /api/v1/cart/sync
//  Auth:  requireAuth
//  Body:  { items: CartItem[] }
//
//  Frontend calls this:
//    • 2 seconds after the last cart change (debounce)
//    • On "Proceed to Checkout" click (force flush)
//    • On page/tab unload (beforeunload event)
// ─────────────────────────────────────────────
export const syncCart = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const userId = req.userId;
    const { items, restaurantId: clientRestaurantId, restaurantName: clientRestaurantName } = req.body;

    console.log("🔵 [CartController] syncCart called — writing to DB");
    console.log("🔵 [CartController] Received restaurantId from client:", clientRestaurantId);

    // ── Validate payload ──
    if (!items || !Array.isArray(items)) {
      return next(new AppError("items array is required", 400));
    }

    // ── If items is empty — delete cart ──
    if (items.length === 0) {
      await Cart.findOneAndDelete({ userId });
      console.log("🔵 [CartController] Sync received empty cart — deleted");
      return res.status(200).json({
        success: true,
        message: "Cart cleared",
        data:    null,
        synced:  true,
      });
    }

    // ── Validate each item quantity ──
    for (const item of items) {
      if (!item.menuItemId) {
        return next(new AppError("Each item must have a menuItemId", 400));
      }
      if (!item.quantity || item.quantity < 1) {
        return next(new AppError(`Invalid quantity for item ${item.menuItemId}`, 400));
      }
    }

    // ── Fetch restaurantId from first item to verify ──
    const firstMenuItem = await MenuItem.findById(items[0].menuItemId);
    if (!firstMenuItem) return next(new AppError("Menu item not found", 404));

    const restaurant = await Restaurant.findById(firstMenuItem.restaurantId);
    if (!restaurant) return next(new AppError("Restaurant not found", 404));

    // ── Use derived restaurantId (from menu item) as source of truth ──
    const derivedRestaurantId = firstMenuItem.restaurantId.toString();
    const derivedRestaurantName = restaurant.name;

    console.log("🟢 [CartController] Derived restaurantId:", derivedRestaurantId, "restaurantName:", derivedRestaurantName);

    // ── Upsert cart (create or overwrite) ──
    const cart = await Cart.findOneAndUpdate(
      { userId },
      {
        userId,
        restaurantId:   derivedRestaurantId,
        restaurantName: derivedRestaurantName,
        items,
      },
      {
        new:    true,   // return updated doc
        upsert: true,   // create if not exists
        runValidators: true,
      }
    );

    console.log("🟢 [CartController] Cart synced to DB with restaurantId:", cart?.restaurantId);

    res.status(200).json({
      success: true,
      message: "Cart synced",
      data:    cart,
      synced:  true,
    });
  }
);

// ─────────────────────────────────────────────
//  REMOVE / DECREMENT ITEM  (optimistic)
//  Route: DELETE /api/v1/cart/remove/:menuItemId
//  Auth:  requireAuth
//
//  Returns updated in-memory state.
//  Frontend debounces the actual /sync call.
// ─────────────────────────────────────────────
export const removeFromCart = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const userId         = req.userId;
    const { menuItemId } = req.params;

    console.log("🟢 [CartController] removeFromCart (optimistic):", menuItemId);

    const cart = await Cart.findOne({ userId });
    if (!cart) return next(new AppError("Cart not found", 404));

    const itemIndex = cart.items.findIndex(
      (i) => i.menuItemId.toString() === menuItemId
    );

    if (itemIndex === -1) {
      return next(new AppError("Item not in cart", 404));
    }

    const updatedItems = [...cart.items];

    if (updatedItems[itemIndex].quantity > 1) {
      updatedItems[itemIndex] = {
        ...updatedItems[itemIndex],
        quantity: updatedItems[itemIndex].quantity - 1,
      };
    } else {
      updatedItems.splice(itemIndex, 1);
    }

    // ── Compute totals in memory ──
    const totalPrice = updatedItems.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    );
    const itemCount = updatedItems.reduce(
      (sum, item) => sum + item.quantity,
      0
    );

    const optimisticCart = updatedItems.length === 0
      ? null
      : {
          userId,
          restaurantId:   cart.restaurantId,
          restaurantName: cart.restaurantName,
          items:          updatedItems,
          totalPrice,
          itemCount,
        };

    console.log("🟡 [CartController] Remove optimistic — NOT saved to DB yet");

    res.status(200).json({
      success: true,
      message: updatedItems.length === 0 ? "Cart will be cleared on sync" : "Item removed (pending sync)",
      data:    optimisticCart,
      synced:  false,
    });
  }
);

// ─────────────────────────────────────────────
//  UPDATE ITEM QUANTITY  (optimistic)
//  Route: PATCH /api/v1/cart/update/:menuItemId
//  Auth:  requireAuth
//  Body:  { quantity }
// ─────────────────────────────────────────────
export const updateCartItemQuantity = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const userId         = req.userId;
    const { menuItemId } = req.params;
    const { quantity }   = req.body;

    console.log("🟢 [CartController] updateCartItemQuantity (optimistic):", menuItemId, "→", quantity);

    if (!quantity || quantity < 1) {
      return next(new AppError("Quantity must be at least 1", 400));
    }

    const cart = await Cart.findOne({ userId });
    if (!cart) return next(new AppError("Cart not found", 404));

    const itemIndex = cart.items.findIndex(
      (i) => i.menuItemId.toString() === menuItemId
    );

    if (itemIndex === -1) {
      return next(new AppError("Item not in cart", 404));
    }

    const updatedItems = [...cart.items];
    updatedItems[itemIndex] = {
      ...updatedItems[itemIndex],
      quantity,
    };

    const totalPrice = updatedItems.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    );
    const itemCount = updatedItems.reduce(
      (sum, item) => sum + item.quantity,
      0
    );

    console.log("🟡 [CartController] Quantity update optimistic — NOT saved to DB yet");

    res.status(200).json({
      success: true,
      message: "Quantity updated (pending sync)",
      data: {
        userId,
        restaurantId:   cart.restaurantId,
        restaurantName: cart.restaurantName,
        items:          updatedItems,
        totalPrice,
        itemCount,
      },
      synced: false,
    });
  }
);

// ─────────────────────────────────────────────
//  CLEAR ENTIRE CART
//  Route: DELETE /api/v1/cart/clear
//  Auth:  requireAuth
//  ✅ This one writes to DB immediately — intentional hard clear
// ─────────────────────────────────────────────
export const clearCart = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const userId = req.userId;

    console.log("🟢 [CartController] clearCart for userId:", userId);

    await Cart.findOneAndDelete({ userId });

    res.status(200).json({
      success: true,
      message: "Cart cleared",
      data:    null,
      synced:  true,
    });
  }
);