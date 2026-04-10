import mongoose, { Schema, Document } from "mongoose";

export interface IRider extends Document {
  userId: string;
  picture: string;
  phoneNumber: string;
  addharNumber: string; // From the provided schema (typo kept for compatibility)
  drivingLicenseNumber: string;
  isVerified: boolean;
  location: {
    type: "Point";
    coordinates: [number, number]; // [Longitude, Latitude]
  };
  isAvailable: boolean; // Fixed typo "isAvailble" from video to "isAvailable"
  lastActiveAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const RiderSchema: Schema = new Schema(
  {
    userId: { type: String, required: true, unique: true },
    picture: { type: String, default: "" },
    phoneNumber: { type: String, required: true },
    addharNumber: { type: String, required: true },
    drivingLicenseNumber: { type: String, required: true },
    isVerified: { type: Boolean, default: false },
    location: {
      type: {
        type: String,
        enum: ["Point"],
        default: "Point",
      },
      coordinates: {
        type: [Number], // [Longitude, Latitude]
        default: [0, 0],
      },
    },
    isAvailable: { type: Boolean, default: false },
    lastActiveAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

// Create a geospatial index for location-based queries (e.g. find nearest riders)
RiderSchema.index({ location: "2dsphere" });

export const Rider = mongoose.model<IRider>("Rider", RiderSchema);
