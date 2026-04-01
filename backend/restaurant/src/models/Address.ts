import mongoose, { Schema, Document } from "mongoose";

export interface IAddress extends Document {
  userId: string; // Kept as string rather than ObjectId reference since User model lives in user_services
  fullAddress: string;
  addressLine2?: string;
  landmark?: string;
  city: string;
  state: string;
  pincode: string;
  addressType: "home" | "work" | "other";
  coordinates?: {
    lat: number;
    lng: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

const AddressSchema: Schema = new Schema(
  {
    userId: { 
      type: String, 
      required: true, 
      index: true // Index for fast lookup when querying saved addresses for a user
    },
    fullAddress: { 
      type: String, 
      required: true, 
      trim: true 
    },
    addressLine2: { 
      type: String, 
      trim: true, 
      default: "" 
    },
    landmark: { 
      type: String, 
      trim: true, 
      default: "" 
    },
    city: { 
      type: String, 
      required: true, 
      trim: true 
    },
    state: { 
      type: String, 
      required: true, 
      trim: true 
    },
    pincode: { 
      type: String, 
      required: true, 
      trim: true 
    },
    addressType: {
      type: String,
      enum: ["home", "work", "other"],
      default: "home",
    },
    coordinates: {
      lat: { type: Number, required: false },
      lng: { type: Number, required: false },
    },
  },
  { timestamps: true }
);

export const Address = mongoose.model<IAddress>("Address", AddressSchema);
