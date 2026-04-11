import { Request, Response, NextFunction } from "express";
import { Rider } from "../models/Rider";
import axios from "axios";
import cloudinary, { getDataUri } from "../config/cloudinary";
import { asyncHandler } from "../utils/asyncHandler";
import { AppError } from "../utils/AppError";

export const createRiderProfile = asyncHandler(async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  const userId = req.userId;
  const { phoneNumber, addharNumber, drivingLicenseNumber, longitude, latitude } = req.body;

  if (!userId) {
    return next(new AppError("User ID not provided. Ensure you are authenticated.", 401));
  }

  if (!phoneNumber || !addharNumber || !drivingLicenseNumber) {
    return next(new AppError("Missing required fields", 400));
  }

  // Check if rider already exists
  const existingRider = await Rider.findOne({ userId });
  if (existingRider) {
    return next(new AppError("Rider profile already exists", 400));
  }

  let pictureUrl = "";

  // Upload picture to Cloudinary if file exists
  if (req.file) {
    const fileUri = getDataUri(req.file);
    if (fileUri.content) {
      const cloudResponse = await cloudinary.uploader.upload(fileUri.content);
      pictureUrl = cloudResponse.secure_url;
    }
  }

  // Process Location
  let coordinates: [number, number] = [0, 0];
  if (longitude && latitude) {
    coordinates = [parseFloat(longitude), parseFloat(latitude)];
  }

  // Create Rider
  const newRider = new Rider({
    userId,
    phoneNumber,
    addharNumber,
    drivingLicenseNumber,
    picture: pictureUrl,
    location: {
      type: "Point",
      coordinates,
    },
    isAvailable: false,    // Default to false upon creation
    isVerified: false,     // Admin needs to verify
  });

  await newRider.save();

  return res.status(201).json({
    success: true,
    message: "Rider profile created successfully",
    rider: newRider,
  });
});

export const fetchMyProfile = asyncHandler(async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  const userId = req.userId;

  if (!userId) {
    return next(new AppError("User ID not provided. Ensure you are authenticated.", 401));
  }

  const rider = await Rider.findOne({ userId });

  if (!rider) {
    return next(new AppError("Rider profile not found", 404));
  }

  return res.status(200).json({
    success: true,
    rider,
  });
});


export const toggleRiderAvailability = asyncHandler(async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  const userId = req.userId;
  const userRole = req.userRole;
  const { longitude, latitude } = req.body;

  if (!userId) {
    return next(new AppError("User ID not provided. Ensure you are authenticated.", 401));
  }

  if (userRole !== "rider") {
    return next(new AppError("Access denied. Only riders can toggle availability.", 403));
  }

  // ==========================================
  // 🚨 MICROSERVICE FIX: Ask Order Service if rider is busy
  // ==========================================
  try {
    const orderResponse = await axios.get(
      `${process.env.ORDER_SERVICE_URL}/orders/rider/current`, // Make sure URL matches your setup
      {
        headers: {
          "x-user-id": userId // Pass the Rider's ID to the order service
        }
      }
    );

    // Agar data mein order mil gaya, matlab rider busy hai!
    if (orderResponse.data && orderResponse.data.data) {
      return next(new AppError("You cannot go offline while delivering an active order!", 403));
    }
  } catch (error: any) {
    // Aapke Order Service ka logic kehta hai ki agar order nahi mila toh woh 404 (ya null) phekta hai
    // Agar 404 aaya hai, toh yeh Achi baat hai! Matlab rider free hai.
    const status = error.response?.status;
    if (status !== 404) {
      console.error("Order Service Error:", error.message);
      return next(new AppError("Could not verify order status. Try again.", 500));
    }
  }
  // ==========================================

  const rider = await Rider.findOne({ userId });

  if (!rider) {
    return next(new AppError("Rider profile not found", 404));
  }

  // Update location if provided
  if (longitude !== undefined && latitude !== undefined) {
    rider.location.coordinates = [parseFloat(longitude), parseFloat(latitude)];
  }

  rider.isAvailable = !rider.isAvailable;
  await rider.save();

  return res.status(200).json({
    success: true,
    message: `Rider is now ${rider.isAvailable ? 'available' : 'unavailable'}`,
    rider,
  });
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ACCEPT ORDER — Rider accepts a NEW_ORDER_AVAILABLE
// Calls Restaurant Service → PUT /orders/assign/rider
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export const acceptOrder = asyncHandler(async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  const riderId = req.userId;
  const { orderId } = req.body;

  console.log("🚴 [Accept Order] Request received");
  console.log("  Rider ID:", riderId);
  console.log("  Order ID:", orderId);

  if (!riderId) return next(new AppError("Unauthorized - Missing user ID", 401));
  if (!orderId) return next(new AppError("orderId is required", 400));

  // 🔍 Get rider profile for name & phone
  const rider = await Rider.findOne({ userId: riderId });
  if (!rider) return next(new AppError("Rider profile not found", 404));

  if (!rider.isVerified) return next(new AppError("Rider is not verified", 403));
  if (!rider.isAvailable) return next(new AppError("Rider is not available", 400));

  console.log(`  Rider Phone: ${rider.phoneNumber}`);

  // 🚀 Call Restaurant Service to assign this rider to the order
  try {
    const response = await axios.put(
      `${process.env.RESTAURANT_SERVICE_URL}/orders/assign/rider`,
      {
        orderId,
        riderId,
        riderName: riderId,
        riderPhone: rider.phoneNumber,
      },
      {
        headers: {
          "x-internal-key": process.env.INTERNAL_SERVICE_KEY,
          "x-user-id": riderId,
          "Content-Type": "application/json",
        },
      }
    );

    console.log(`✅ [Accept Order] Rider ${riderId} assigned to order ${orderId}`);

    // 📴 Mark rider as unavailable (they're now on a delivery)
    rider.isAvailable = false;
    await rider.save();
    console.log(`📴 [Accept Order] Rider ${riderId} marked unavailable`);

    return res.status(200).json({
      success: true,
      message: "Order accepted successfully",
      data: response.data.data,
    });
  } catch (error: any) {
    const status = error.response?.status || 500;
    const message = error.response?.data?.message || "Failed to accept order";

    console.error(`❌ [Accept Order] Failed:`, message);

    // 409 = another rider grabbed it
    if (status === 409) {
      return next(new AppError("This order was already taken by another rider", 409));
    }

    return next(new AppError(message, status));
  }
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// GET CURRENT ORDER — Rider's active (non-delivered) order
// Calls Restaurant Service → GET /orders/rider/current
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// In rider.controller.ts (Rider Service)

export const getCurrentOrder = asyncHandler(async (req: Request, res: Response, next: NextFunction): Promise<any> => {

  // API Gateway se aayi hui ID pakdo
  const riderId = req.userId || req.headers["x-user-id"];

  console.log("🚴 [Get Current Order] Request received");
  console.log("  Rider ID:", riderId);

  if (!riderId) return next(new AppError("Unauthorized - Missing user ID", 401));

  try {
    // 🚨 FIX: Make sure this points to the ORDER service, not restaurant service
    const response = await axios.get(
      `${process.env.ORDER_SERVICE_URL}/orders/rider/current`,
      {
        headers: {
          "x-internal-key": process.env.INTERNAL_SERVICE_KEY,
          "x-user-id": riderId, // 🔥 Pushing the ID to the next service
          "Content-Type": "application/json",
        },
      }
    );

    console.log(`✅ [Get Current Order] Found order for rider ${riderId}`);

    return res.status(200).json({
      success: true,
      data: response.data.data,
    });
  } catch (error: any) {
    const status = error.response?.status || 500;
    const message = error.response?.data?.message || "Failed to fetch current order";

    if (status === 404) {
      return res.status(200).json({
        success: true,
        data: null,
        message: "No active order",
      });
    }

    return next(new AppError(message, status));
  }
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// UPDATE ORDER STATUS — Rider updates to picked_up / delivered
// Calls Restaurant Service → PUT /orders/rider/status
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export const updateOrderStatus = asyncHandler(async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  const riderId = req.userId;
  const { orderId, status } = req.body;

  console.log("🚴 [Update Order Status] Request received");
  console.log("  Rider ID:", riderId);
  console.log("  Order ID:", orderId);
  console.log("  New Status:", status);

  if (!riderId) return next(new AppError("Unauthorized - Missing user ID", 401));
  if (!orderId || !status) return next(new AppError("orderId and status are required", 400));

  const validStatuses = ["picked_up", "delivered"];
  if (!validStatuses.includes(status))
    return next(new AppError(`Invalid status. Allowed: ${validStatuses.join(", ")}`, 400));

  try {
    const response = await axios.put(
      `${process.env.RESTAURANT_SERVICE_URL}/orders/rider/status`,
      { orderId, status },
      {
        headers: {
          "x-internal-key": process.env.INTERNAL_SERVICE_KEY,
          "x-user-id": riderId,
          "Content-Type": "application/json",
        },
      }
    );

    console.log(`✅ [Update Order Status] Order ${orderId} → ${status}`);

    // 🟢 If delivered, mark rider available again
    if (status === "delivered") {
      const rider = await Rider.findOne({ userId: riderId });
      if (rider) {
        rider.isAvailable = true;
        await rider.save();
        console.log(`🟢 [Update Order Status] Rider ${riderId} marked available again`);
      }
    }

    return res.status(200).json({
      success: true,
      message: `Order status updated to ${status}`,
      data: response.data.data,
    });
  } catch (error: any) {
    const statusCode = error.response?.status || 500;
    const message = error.response?.data?.message || "Failed to update order status";

    console.error(`❌ [Update Order Status] Failed:`, message);
    return next(new AppError(message, statusCode));
  }
});
