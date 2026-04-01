import { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { AppError } from "../utils/AppError";
import Rider from "../models/Rider";

// Register Rider
export const registerRider = asyncHandler(async (req: Request, res: Response) => {
  const { name, email, phone, password, vehicle, documents } = req.body;

  if (!name || !email || !phone || !password) {
    throw new AppError("Please provide all required fields", 400);
  }

  const riderExists = await Rider.findOne({ $or: [{ email }, { phone }] });

  if (riderExists) {
    throw new AppError("Rider with this email or phone already exists", 409);
  }

  const rider = await Rider.create({
    name,
    email,
    phone,
    password,
    vehicle,
    documents,
    status: "inactive",
  });

  res.status(201).json({
    success: true,
    message: "Rider registered successfully. Awaiting verification.",
    riderId: rider._id,
  });
});

// Get Rider Profile
export const getRiderProfile = asyncHandler(async (req: Request, res: Response) => {
  const riderId = req.riderId;

  if (!riderId) {
    throw new AppError("Unauthorized", 401);
  }

  const rider = await Rider.findById(riderId).select("-password");

  if (!rider) {
    throw new AppError("Rider not found", 404);
  }

  res.status(200).json({
    success: true,
    rider,
  });
});

// Update Rider Location
export const updateRiderLocation = asyncHandler(async (req: Request, res: Response) => {
  const { latitude, longitude } = req.body;
  const riderId = req.riderId;

  if (!riderId) {
    throw new AppError("Unauthorized", 401);
  }

  if (!latitude || !longitude) {
    throw new AppError("Please provide latitude and longitude", 400);
  }

  const rider = await Rider.findByIdAndUpdate(
    riderId,
    {
      location: {
        latitude,
        longitude,
        lastUpdated: new Date(),
      },
    },
    { new: true }
  );

  res.status(200).json({
    success: true,
    message: "Location updated successfully",
    rider,
  });
});

// Update Rider Status
export const updateRiderStatus = asyncHandler(async (req: Request, res: Response) => {
  const { status } = req.body;
  const riderId = req.riderId;

  if (!riderId) {
    throw new AppError("Unauthorized", 401);
  }

  const validStatuses = ["active", "inactive", "on_duty", "off_duty", "suspended"];
  if (!validStatuses.includes(status)) {
    throw new AppError("Invalid status", 400);
  }

  const rider = await Rider.findByIdAndUpdate(
    riderId,
    { status },
    { new: true }
  );

  res.status(200).json({
    success: true,
    message: "Status updated successfully",
    rider,
  });
});

// Get All Riders (Admin)
export const getAllRiders = asyncHandler(async (req: Request, res: Response) => {
  const riders = await Rider.find().select("-password");

  res.status(200).json({
    success: true,
    count: riders.length,
    riders,
  });
});

// Get Available Riders Near Location
export const getAvailableRiders = asyncHandler(async (req: Request, res: Response) => {
  const { latitude, longitude, radius = 5 } = req.body;

  if (!latitude || !longitude) {
    throw new AppError("Please provide latitude and longitude", 400);
  }

  // Using MongoDB geospatial query (requires index on location)
  const riders = await Rider.find({
    status: "on_duty",
    isVerified: true,
    location: {
      $near: {
        $geometry: {
          type: "Point",
          coordinates: [longitude, latitude],
        },
        $maxDistance: radius * 1000, // radius in meters
      },
    },
  }).select("-password");

  res.status(200).json({
    success: true,
    count: riders.length,
    riders,
  });
});
