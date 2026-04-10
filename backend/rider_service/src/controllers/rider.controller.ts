import { Request, Response, NextFunction } from "express";
import { Rider } from "../models/Rider";
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

  // Extra safety check for role as requested
  if (userRole !== "rider") {
    return next(new AppError("Access denied. Only riders can toggle availability.", 403));
  }

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
