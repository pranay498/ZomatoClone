import { Request, Response, NextFunction } from "express";
import { Order } from "../models/Order";
import { Cart } from "../models/Cart";
import { Address } from "../models/Address";
import { asyncHandler } from "../utils/asyncHandler";
import { AppError } from "../utils/AppError";

/**
 * Create Order with full validation
 * Route: POST /api/v1/order/create
 * Auth: requireAuth (sets req.userId)
 * Body: {
 *   addressId: string (MongoDB ObjectId of saved address),
 *   paymentMethod: "cod" | "upi" | "card",
 *   totalAmount: number,
 *   userPhone?: string (optional for delivery contact)
 * }
 */
export const createOrder = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const userId = req.userId; // From auth middleware

    // ✅ GUARD 1: Verify user is authenticated
    if (!userId) {
      return next(new AppError("Unauthorized - User ID missing", 401));
    }

  const { addressId, paymentMethod, totalAmount, userPhone } = req.body;

    console.log("🟢 [OrderController] createOrder - userId:", userId);
    console.log("🟢 [OrderController] Request body:", {
      addressId,
      paymentMethod,
      totalAmount,
      userPhone,
    });

    // ✅ GUARD 2: Validate required fields
    if (!addressId) {
      return next(new AppError("addressId is required", 400));
    }
    if (!paymentMethod || !["cod", "upi", "card"].includes(paymentMethod)) {
      return next(new AppError("Invalid payment method", 400));
    }
    if (!totalAmount || totalAmount <= 0) {
      return next(new AppError("Invalid total amount", 400));
    }

    // Validate phone if provided (10-digit Indian number)
    if (userPhone && (!/^\d{10}$/.test(String(userPhone)))) {
      return next(new AppError("Invalid phone number. Must be 10 digits", 400));
    }

    // ✅ GUARD 3: Verify address exists AND belongs to this user
    console.log("🟢 [OrderController] Verifying address ownership...");
    const address = await Address.findOne({
      _id: addressId,
      userId, // ← CRITICAL: Must belong to THIS user
    });

    if (!address) {
      console.log("🔴 [OrderController] Address not found or unauthorized");
      return next(
        new AppError(
          "Address not found or you are not authorized to use it",
          403
        )
      );
    }

    console.log("🟢 [OrderController] Address verified:", address.fullAddress);

    // ✅ GUARD 4: Fetch user's cart to transfer items
    console.log("🟢 [OrderController] Fetching user cart...");
    const cart = await Cart.findOne({ userId }).populate("items.menuItem");

    if (!cart || cart.items.length === 0) {
      return next(
        new AppError(
          "Cart is empty. Please add items before placing an order",
          400
        )
      );
    }

    console.log("🟢 [OrderController] Cart found:", cart.items.length, "items");

    // ✅ Format items for the Order model
    const orderItems = cart.items.map((item: any) => ({
      itemId: item.menuItem?._id || item.menuItemId,
      name: item.name || "Unknown Item",
      price: item.price,
      quantity: item.quantity,
    }));

    // ✅ Determine payment status based on chosen method
    const paymentStatus = paymentMethod === "cod" ? "pending" : "paid";

    // ✅ Format delivery address with coordinates from saved address
    const deliveryAddress = {
      formattedAddress: [
        address.fullAddress,
        address.addressLine2,
        address.landmark,
      ]
        .filter((x) => x)
        .join(", "),
      mobile: userPhone ? parseInt(userPhone) : 0, // ← Use provided phone or default to 0
      latitude: address.coordinates?.lat ?? 0,
      longitude: address.coordinates?.lng ?? 0,
    };

    console.log("🟢 [OrderController] Creating order with:");
    console.log("  - Restaurant:", cart.restaurantId, cart.restaurantName);
    console.log("  - Items:", orderItems.length);
    console.log("  - Address:", deliveryAddress.formattedAddress);

    // ✅ Create the new Order with all validations passed
    const newOrder = new Order({
      userId,
      restaurantId: cart.restaurantId,
      restaurantName: cart.restaurantName || "Zomato Restaurant",
      items: orderItems,
      addressId, // ← Store reference to the address document
      deliveryAddress,
      paymentMethod,
      paymentStatus,
      status: "placed",
      totalAmount,
      // ← Rider fields will be populated later when rider is assigned
      riderId: null,
      riderName: null,
      riderPhone: null,
    });

    const savedOrder = await newOrder.save();
    console.log("🟢 [OrderController] Order saved:", savedOrder._id);

    // ✅ Clear user's cart after successful order
    await Cart.findOneAndDelete({ userId });
    console.log("🟢 [OrderController] Cart cleared for user");

    res.status(201).json({
      success: true,
      message: "Order placed successfully",
      data: {
        orderId: savedOrder._id,
        status: savedOrder.status,
        totalAmount: savedOrder.totalAmount,
        restaurantName: savedOrder.restaurantName,
      },
    });
  }
);
