import { Request, Response, NextFunction } from "express";
import { MenuItem } from "../models/MenuItem";
import { Restaurant } from "../models/Restaurnent";
import { AppError } from "../utils/AppError";
import { asyncHandler } from "../utils/asyncHandler";
import cloudinary from "../config/cloudinary";
import { fileToDataUri } from "../config/datauri";

/**
 * Create menu item with image upload
 * Route: POST /api/v1/menu/create
 * Middleware: requireAuth, requireSeller, uploadSingleFile
 */
export const createMenuItemWithImage = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    console.log("🟢 [MenuItemController] createMenuItemWithImage called");

    const { restaurantId, name, description, price, isAvailable } = req.body;
    const ownerId = req.userId;

    console.log("🟢 [MenuItemController] Request data:", {
      restaurantId,
      name,
      description,
      price,

      isAvailable,
      fileProvided: !!req.file,
    });

    // Validate required fields
    if (!restaurantId || !name || !description || !price) {
      console.error("🔴 [MenuItemController] Missing required fields");
      return next(
        new AppError(
          "Missing required fields: restaurantId, name, description, price",
          400
        )
      );
    }

    // Verify restaurant exists and belongs to the user
    console.log("🟢 [MenuItemController] Verifying restaurant ownership");
    const restaurant = await Restaurant.findOne({
      _id: restaurantId,
      ownerId,
    });

    if (!restaurant) {
      console.log("🔴 [MenuItemController] Restaurant not found or unauthorized");
      return next(
        new AppError("Restaurant not found or you are not authorized", 404)
      );
    }

    console.log("🟢 [MenuItemController] Restaurant verified:", restaurant.name);

    // Validate price - convert to number first (FormData sends as string)
    const numPrice = parseFloat(price);
    if (isNaN(numPrice) || numPrice <= 0) {
      console.error("🔴 [MenuItemController] Invalid price:", price);
      return next(new AppError("Price must be a positive number", 400));
    }

    let imageUrl: string | null = null;

    // Handle file upload - CloudinaryStorage already uploads it
    if (req.file) {
      try {
        console.log("🟢 [MenuItemController] File received from multer");
        console.log("🟢 [MenuItemController] File details:", {
          originalname: req.file.originalname,
          mimetype: req.file.mimetype,
          size: req.file.size,
        });

        // CloudinaryStorage automatically uploads to Cloudinary and returns the URL
        imageUrl = (req.file as any).path || null;
        console.log("🟢 [MenuItemController] Image uploaded to Cloudinary");
        console.log("🟢 [MenuItemController] Cloudinary URL:", imageUrl);
      } catch (uploadError) {
        console.error("🔴 [MenuItemController] Cloudinary upload error:", uploadError);
        return next(
          new AppError(`Failed to upload image: ${uploadError || "Unknown error"}`, 500)
        );
      }
    } else {
      console.log("🟡 [MenuItemController] No file provided - image is optional");
    }

    // Create menu item in database
    console.log("🟢 [MenuItemController] Creating menu item in database");
    const menuItem = await MenuItem.create({
      restaurantId,
      name: name.trim(),
      description: description.trim(),
      image: imageUrl, // Cloudinary secure URL or null
      price: numPrice,
      isAvailable: isAvailable !== false, // defaults to true
    });

    console.log("🟢 [MenuItemController] Menu item created successfully");
    console.log("🟢 [MenuItemController] Sending response");

    res.status(201).json({
      success: true,
      message: "Menu item created successfully",
      data: menuItem,
    });
  }
);

/**
 * Get menu items by restaurant
 * Route: GET /api/v1/menu/restaurant/:restaurantId
 * Middleware: None (public)
 */
export const getMenuItemsByRestaurant = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    console.log("🟢 [MenuItemController] getMenuItemsByRestaurant called");

    const { restaurantId } = req.params;
    const { isAvailable } = req.query;

    console.log("🟢 [MenuItemController] Request params:", {
      restaurantId,
      filterByAvailability: isAvailable,
    });

    // Verify restaurant exists
    console.log("🟢 [MenuItemController] Verifying restaurant exists");
    const restaurant = await Restaurant.findById(restaurantId);

    if (!restaurant) {
      console.log("🔴 [MenuItemController] Restaurant not found");
      return next(new AppError("Restaurant not found", 404));
    }

    // Build query
    const query: any = { restaurantId };
    if (isAvailable !== undefined) {
      query.isAvailable = isAvailable === "true";
    }

    console.log("🟢 [MenuItemController] Querying menu items");
    const menuItems = await MenuItem.find(query).sort({ createdAt: -1 });

    console.log("🟢 [MenuItemController] Found", menuItems.length, "menu items");
    console.log("🟢 [MenuItemController] Sending response");

    res.status(200).json({
      success: true,
      message: "Menu items retrieved successfully",
      count: menuItems.length,
      data: menuItems,
    });
  }
);

/**
 * Get single menu item
 * Route: GET /api/v1/menu/:id
 * Middleware: None
 */
export const getMenuItemById = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    console.log("🟢 [MenuItemController] getMenuItemById called");

    const { id } = req.params;

    console.log("🟢 [MenuItemController] Fetching menu item:", id);
    const menuItem = await MenuItem.findById(id).populate(
      "restaurantId",
      "name description imageUrl phone"
    );

    if (!menuItem) {
      console.log("🔴 [MenuItemController] Menu item not found");
      return next(new AppError("Menu item not found", 404));
    }

    console.log("🟢 [MenuItemController] Menu item found");
    console.log("🟢 [MenuItemController] Sending response");

    res.status(200).json({
      success: true,
      message: "Menu item retrieved successfully",
      data: menuItem,
    });
  }
);

/**
 * Update menu item
 * Route: PATCH /api/v1/menu/:id
 * Middleware: requireAuth, requireSeller, uploadSingleFile (optional)
 */
export const updateMenuItem = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    console.log("🟢 [MenuItemController] updateMenuItem called");

    const { id } = req.params;
    const ownerId = req.userId;
    const { name, description, price, isAvailable } = req.body;

    console.log("🟢 [MenuItemController] Update data:", {
      id,
      nameProvided: !!name,
      descriptionProvided: !!description,
      priceProvided: !!price,
      isAvailableProvided: isAvailable !== undefined,
      fileProvided: !!req.file,
    });

    // Fetch menu item
    console.log("🟢 [MenuItemController] Fetching menu item");
    let menuItem = await MenuItem.findById(id);

    if (!menuItem) {
      console.log("🔴 [MenuItemController] Menu item not found");
      return next(new AppError("Menu item not found", 404));
    }

    // Verify ownership
    console.log("🟢 [MenuItemController] Verifying ownership");
    const restaurant = await Restaurant.findOne({
      _id: menuItem.restaurantId,
      ownerId,
    });

    if (!restaurant) {
      console.log(
        "🔴 [MenuItemController] Unauthorized: You are not the restaurant owner"
      );
      return next(
        new AppError("You are not authorized to update this menu item", 403)
      );
    }

    console.log("🟢 [MenuItemController] Ownership verified");

    // Validate price if updating - convert to number first (FormData sends as string)
    let numPrice: number | undefined;
    if (price !== undefined) {
      numPrice = parseFloat(price);
      if (isNaN(numPrice) || numPrice <= 0) {
        console.error("🔴 [MenuItemController] Invalid price:", price);
        return next(new AppError("Price must be a positive number", 400));
      }
    }

    // Handle image upload - CloudinaryStorage already uploads it
    if (req.file) {
      try {
        console.log("🟢 [MenuItemController] New image file provided");
        console.log("🟢 [MenuItemController] File details:", {
          originalname: req.file.originalname,
          mimetype: req.file.mimetype,
          size: req.file.size,
        });

        // CloudinaryStorage automatically uploads to Cloudinary and returns the URL
        const imageUrl = (req.file as any).path || null;
        if (imageUrl) {
          menuItem.image = imageUrl;
          console.log("🟢 [MenuItemController] Image uploaded to Cloudinary successfully");
          console.log("🟢 [MenuItemController] Cloudinary URL:", menuItem.image);
        }
      } catch (uploadError) {
        console.error("🔴 [MenuItemController] Cloudinary upload error:", uploadError);
        return next(
          new AppError(`Failed to upload image: ${uploadError || "Unknown error"}`, 500)
        );
      }
    }

    // Update fields
    console.log("🟢 [MenuItemController] Updating menu item fields");
    if (name) menuItem.name = name.trim();
    if (description) menuItem.description = description.trim();
    if (numPrice !== undefined) menuItem.price = numPrice;
    if (isAvailable !== undefined) menuItem.isAvailable = isAvailable;

    await menuItem.save();

    console.log("🟢 [MenuItemController] Menu item updated successfully");
    console.log("🟢 [MenuItemController] Sending response");

    res.status(200).json({
      success: true,
      message: "Menu item updated successfully",
      data: menuItem,
    });
  }
);

/**
 * Delete menu item
 * Route: DELETE /api/v1/menu/:id
 * Middleware: requireAuth, requireSeller
 */
export const deleteMenuItem = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    console.log("🟢 [MenuItemController] deleteMenuItem called");

    const { id } = req.params;
    const ownerId = req.userId;

    console.log("🟢 [MenuItemController] Request to delete menu item:", id);

    // Fetch menu item
    console.log("🟢 [MenuItemController] Fetching menu item");
    const menuItem = await MenuItem.findById(id);

    if (!menuItem) {
      console.log("🔴 [MenuItemController] Menu item not found");
      return next(new AppError("Menu item not found", 404));
    }

    // Verify ownership
    console.log("🟢 [MenuItemController] Verifying ownership");
    const restaurant = await Restaurant.findOne({
      _id: menuItem.restaurantId,
      ownerId,
    });

    if (!restaurant) {
      console.log(
        "🔴 [MenuItemController] Unauthorized: You are not the restaurant owner"
      );
      return next(
        new AppError("You are not authorized to delete this menu item", 403)
      );
    }

    console.log("🟢 [MenuItemController] Ownership verified");

    // Delete menu item
    console.log("🟢 [MenuItemController] Deleting menu item from database");
    await MenuItem.findByIdAndDelete(id);

    console.log("🟢 [MenuItemController] Menu item deleted successfully");
    console.log("🟢 [MenuItemController] Sending response");

    res.status(200).json({
      success: true,
      message: "Menu item deleted successfully",
      data: null,
    });
  }
);

/**
 * Toggle menu item availability
 * Route: PATCH /api/v1/menu/:id/toggle
 * Middleware: requireAuth, requireSeller
 */
export const toggleMenuItemAvailability = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    console.log("🟢 [MenuItemController] toggleMenuItemAvailability called");

    const { id } = req.params;
    const ownerId = req.userId;

    console.log("🟢 [MenuItemController] Request to toggle availability for:", id);

    // Fetch menu item
    console.log("🟢 [MenuItemController] Fetching menu item");
    let menuItem = await MenuItem.findById(id);

    if (!menuItem) {
      console.log("🔴 [MenuItemController] Menu item not found");
      return next(new AppError("Menu item not found", 404));
    }

    // Verify ownership
    console.log("🟢 [MenuItemController] Verifying ownership");
    const restaurant = await Restaurant.findOne({
      _id: menuItem.restaurantId,
      ownerId,
    });

    if (!restaurant) {
      console.log(
        "🔴 [MenuItemController] Unauthorized: You are not the restaurant owner"
      );
      return next(
        new AppError("You are not authorized to toggle this menu item", 403)
      );
    }

    console.log("🟢 [MenuItemController] Ownership verified");

    // Toggle availability
    console.log(
      "🟢 [MenuItemController] Toggling isAvailable from",
      menuItem.isAvailable,
      "to",
      !menuItem.isAvailable
    );
    menuItem.isAvailable = !menuItem.isAvailable;

    await menuItem.save();

    console.log("🟢 [MenuItemController] Availability toggled successfully");
    console.log("🟢 [MenuItemController] Sending response");

    res.status(200).json({
      success: true,
      message: `Menu item is now ${menuItem.isAvailable ? "available" : "unavailable"}`,
      data: menuItem,
    });
  }
);
