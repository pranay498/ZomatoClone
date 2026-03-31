import { Request, Response, NextFunction, query } from "express";
import jwt from "jsonwebtoken";
import { Restaurant } from "../models/Restaurnent";
import { AppError } from "../utils/AppError";
import { asyncHandler } from "../utils/asyncHandler";

/**
 * Create restaurant with image upload
 * Route: POST /api/v1/restaurant/create
 * Middleware: requireAuth, requireSeller, uploadSingleFile
 */
export const createRestaurantWithImage = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    console.log("🟢 [Controller] createRestaurantWithImage called");

    let { name, description, phone, autoLocation } = req.body;
    const ownerId = req.userId;

    console.log("🟢 [Controller] Raw request body:", req.body);
    console.log("🟢 [Controller] ownerId:", ownerId);
    console.log("🟢 [Controller] autoLocation type:", typeof autoLocation);
    console.log("🟢 [Controller] autoLocation value:", autoLocation);

    // Parse autoLocation if it's a JSON string (from FormData)
    if (typeof autoLocation === "string") {
      console.log("🟢 [Controller] Parsing autoLocation from JSON string");
      try {
        autoLocation = JSON.parse(autoLocation);
        console.log("🟢 [Controller] Parsed autoLocation:", autoLocation);
      } catch (error) {
        console.error("🔴 [Controller] Failed to parse autoLocation:", error);
        return next(new AppError("Invalid autoLocation format", 400));
      }
    }

    // Validate required fields
    console.log("🟢 [Controller] Validating required fields");
    if (!name || !description || !phone || !autoLocation) {
      console.error(
        "🔴 [Controller] Missing fields - name:",
        name,
        "description:",
        description,
        "phone:",
        phone,
        "autoLocation:",
        autoLocation,
      );
      return next(
        new AppError(
          "Missing required fields: name, description, phone, autoLocation",
          400,
        ),
      );
    }

    // Validate location object
    console.log("🟢 [Controller] Validating location object");
    if (
      !autoLocation.coordinates ||
      !autoLocation.formattedAddress ||
      autoLocation.coordinates.length !== 2
    ) {
      console.error("🔴 [Controller] Invalid location");
      return next(
        new AppError(
          "Invalid location. Provide coordinates [longitude, latitude] and address",
          400,
        ),
      );
    }

    // Check if restaurant already exists for this owner
    console.log(
      "🟢 [Controller] Checking if restaurant exists for owner:",
      ownerId,
    );
    const existingRestaurant = await Restaurant.findOne({ ownerId });
    if (existingRestaurant) {
      console.error("🔴 [Controller] Restaurant already exists for this owner");
      return next(new AppError("You already have a restaurant", 400));
    }

    let imageUrl: string | null = null;

    // If file is uploaded, multer-storage-cloudinary already uploaded it
    if (req.file) {
      console.log("🟢 [Controller] File uploaded, req.file:", req.file);
      // req.file.path contains the Cloudinary URL when using CloudinaryStorage
      imageUrl = (req.file as any).path || null;
      console.log("🟢 [Controller] Image URL from file:", imageUrl);
    } else {
      console.log("🟢 [Controller] No file uploaded");
    }

    // Create restaurant
    console.log("🟢 [Controller] Creating restaurant document");
    const restaurant = new Restaurant({
      name: name.trim(),
      description: description.trim(),
      ownerId,
      phone,
      imageUrl: imageUrl,
      autoLocation: {
        type: "Point",
        coordinates: autoLocation.coordinates, // [longitude, latitude]
        formattedAddress: autoLocation.formattedAddress.trim(),
      },
      isOpen: true,
      isVerified: false,
    });

    // Save to database
    console.log("🟢 [Controller] Saving restaurant to database");
    await restaurant.save();
    console.log(
      "🟢 [Controller] Restaurant saved successfully with ID:",
      restaurant._id,
    );

    // Generate JWT token with restaurantId (convert ObjectId to string)

    console.log("🟢 [Controller] Sending response");
    res.status(201).json({
      success: true,
      message: "Restaurant created successfully",
      restaurantId: restaurant._id,
      data: restaurant,
    });
  },
);

/**
 * Get my restaurant (fetch restaurant of logged-in seller)
 * Route: GET /api/v1/restaurant/my-restaurant
 * Middleware: requireAuth
 */
export const getMyRestaurant = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const ownerId = req.userId;

    console.log("🟢 [Controller] getMyRestaurant called");
    console.log("🟢 [Controller] ownerId:", ownerId);

    const restaurant = await Restaurant.findOne({ ownerId });

    console.log(
      "🟢 [Controller] Database query result:",
      restaurant ? "FOUND ✅" : "NOT FOUND ❌",
    );

    if (!restaurant) {
      console.log("🟡 [Controller] No restaurant found for ownerId:", ownerId);
      return next(new AppError("You don't have a restaurant yet", 404));
    }

    console.log("🟢 [Controller] Found restaurant:", {
      _id: restaurant._id,
      name: restaurant.name,
      ownerId: restaurant.ownerId,
    });

    const token = jwt.sign(
      {
        userId: ownerId,
        restaurantId: restaurant._id.toString(),
      },
      process.env.JWT_SECRET as string,
      { expiresIn: "7d" },
    );

    console.log("🟢 [Controller] Generated JWT token");
    console.log("🟢 [Controller] Sending success response");

    res.status(200).json({
      success: true,
      token,
      restaurantId: restaurant._id,
      data: restaurant,
    });
  },
);

/**
 * Update restaurant by ID (full update with image upload)
 * Route: PUT /api/v1/restaurant/:id
 * Middleware: requireAuth, requireSeller, uploadSingleFile
 */
export const updateRestaurantById = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const { id } = req.params;
    const ownerId = req.userId;
    let { name, description, phone, autoLocation, isOpen } = req.body;

    console.log("🟢 [Controller] updateRestaurantById called");
    console.log("🟢 [Controller] Restaurant ID:", id);
    console.log("🟢 [Controller] Owner ID:", ownerId);
    console.log("🟢 [Controller] Update data:", {
      name,
      description,
      phone,
      autoLocation,
      isOpen,
    });

    // Find restaurant and verify ownership
    const restaurant = await Restaurant.findById(id);
    if (!restaurant) {
      console.error("🔴 [Controller] Restaurant not found");
      return next(new AppError("Restaurant not found", 404));
    }

    if (restaurant.ownerId.toString() !== ownerId) {
      console.error("🔴 [Controller] Not authorized to update this restaurant");
      return next(
        new AppError("Not authorized to update this restaurant", 403),
      );
    }

    // Parse autoLocation if it's a JSON string (from FormData)
    if (typeof autoLocation === "string") {
      console.log("🟢 [Controller] Parsing autoLocation from JSON string");
      try {
        autoLocation = JSON.parse(autoLocation);
      } catch (error) {
        console.error("🔴 [Controller] Failed to parse autoLocation:", error);
        return next(new AppError("Invalid autoLocation format", 400));
      }
    }

    // Build update object
    const updateData: any = {};
    if (name) updateData.name = name.trim();
    if (description) updateData.description = description.trim();
    if (phone) updateData.phone = phone;
    if (isOpen !== undefined) updateData.isOpen = isOpen === "true" || isOpen === true;
    if (autoLocation) {
      if (
        !autoLocation.coordinates ||
        !autoLocation.formattedAddress ||
        autoLocation.coordinates.length !== 2
      ) {
        console.error("🔴 [Controller] Invalid location");
        return next(
          new AppError(
            "Invalid location. Provide coordinates [longitude, latitude] and address",
            400,
          ),
        );
      }
      updateData.autoLocation = {
        type: "Point",
        coordinates: autoLocation.coordinates,
        formattedAddress: autoLocation.formattedAddress.trim(),
      };
    }

    // Handle image upload
    if (req.file) {
      console.log("🟢 [Controller] File uploaded, req.file:", req.file);
      updateData.imageUrl = (req.file as any).path || null;
      console.log("🟢 [Controller] Image URL from file:", updateData.imageUrl);
    }

    // Update restaurant
    console.log("🟢 [Controller] Updating restaurant with:", updateData);
    const updatedRestaurant = await Restaurant.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true },
    );

    console.log("🟢 [Controller] Restaurant updated successfully");
    res.status(200).json({
      success: true,
      message: "Restaurant updated successfully",
      data: updatedRestaurant,
    });
  },
);

/**
 * Get nearby restaurants based on user location
 * Route: GET /api/v1/restaurant/nearby?lat=28.6139&lng=77.2090&distance=5000
 * Middleware: None (public)
 * Query params:
 *   - lat: user latitude (required)
 *   - lng: user longitude (required)
 *   - distance: search radius in meters (optional, default: 5000)
 */
// controllers/restaurant.controller.ts

export const getNearbyRestaurants = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const { lng, lat, radius = 5000, city, search = "" } = req.query;

    let restaurants;

    let query: any = { isVerified: true };

    if (search && typeof search === "string") {
      query.name = { $regex: search, $options: "i" };
    }

    if (lng && lat) {
      restaurants = await Restaurant.aggregate([
        {
          $geoNear: {
            near: {
              type: "Point",
              coordinates: [
                parseFloat(lng as string),
                parseFloat(lat as string),
              ],
            },
            distanceField: "distance", // adds distance in metres to each doc
            maxDistance: parseFloat(radius as string), // metres, default 5km
            spherical: true, // use spherical (Earth) math
            query: { isOpen: true }, // pre-filter: only open restaurants
          },
        },

        // ② $project — shape the output, hide internal fields
        {
          $project: {
            name: 1,
            description: 1,
            imageUrl: 1,
            phone: 1,
            isOpen: 1,
            isVerified: 1,
            "autoLocation.formattedAddress": 1,
            "autoLocation.coordinates": 1,
            distance: 1, // metres from user
            distanceKm: {
              $round: [{ $divide: ["$distance", 1000] }, 1], // e.g. 2.4 km
            },
          },
        },

        // ③ $sort — closest first
        { $sort: { distance: 1 } },

        // ④ $limit — cap results
        { $limit: 20 },
      ]);

      // ── Strategy 2: Fallback — filter by city name ──
    } else if (city) {
      restaurants = await Restaurant.aggregate([
        // ① $match — filter docs where address contains city string
        {
          $match: {
            isOpen: true,
            "autoLocation.formattedAddress": {
              $regex: city as string,
              $options: "i", // case-insensitive
            },
          },
        },

        // ② $project — same shape as GPS results, distance is null here
        {
          $project: {
            name: 1,
            description: 1,
            imageUrl: 1,
            phone: 1,
            isOpen: 1,
            isVerified: 1,
            "autoLocation.formattedAddress": 1,
            "autoLocation.coordinates": 1,
            distance: { $literal: null },
            distanceKm: { $literal: null },
          },
        },

        // ③ $sort — alphabetical when no distance
        { $sort: { name: 1 } },

        // ④ $limit
        { $limit: 20 },
      ]);
    } else {
      return next(new AppError("Provide coordinates (lng, lat) or city", 400));
    }

    res.status(200).json({
      success: true,
      count: restaurants.length,
      data: restaurants,
    });
  },
);

export const fetchingSingleRestaurant = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const { id } = req.params;

    const restaurant = await Restaurant.findById(id);

    if (!restaurant) {
      return next(new AppError("Restaurant not found", 404));
    }

    res.status(200).json({
      success: true,
      data: restaurant,
    });
  },
);

export const getRestaurantById = asyncHandler(async (req, res, next) => {
  const restaurant = await Restaurant.findById(req.params.id);
  if (!restaurant) return next(new AppError("Restaurant not found", 404));
  res.status(200).json({ success: true, data: restaurant });
});