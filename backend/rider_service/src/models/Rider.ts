import mongoose, { Document, Schema } from "mongoose";

export interface IRider extends Document {
  userId: mongoose.Schema.Types.ObjectId;
  name: string;
  email: string;
  phone: string;
  password: string;
  profileImage?: string;
  vehicle: {
    type: "bike" | "scooter" | "car";
    licensePlate: string;
  };
  documents: {
    licenseNumber: string;
    licenseExpiry: Date;
    licenseImage?: string;
    aadharNumber?: string;
    aadharImage?: string;
  };
  location: {
    latitude: number;
    longitude: number;
    lastUpdated: Date;
  };
  status: "active" | "inactive" | "on_duty" | "off_duty" | "suspended";
  isVerified: boolean;
  rating: number;
  totalDeliveries: number;
  bankDetails?: {
    accountNumber: string;
    ifscCode: string;
    accountHolderName: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

const riderSchema = new Schema<IRider>(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      unique: true,
    },
    name: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
    },
    phone: {
      type: String,
      required: true,
      unique: true,
      match: /^\d{10}$/,
    },
    password: {
      type: String,
      required: true,
      select: false,
    },
    profileImage: {
      type: String,
      default: null,
    },
    vehicle: {
      type: {
        type: String,
        enum: ["bike", "scooter", "car"],
        required: true,
      },
      licensePlate: {
        type: String,
        required: true,
        unique: true,
      },
    },
    documents: {
      licenseNumber: {
        type: String,
        required: true,
      },
      licenseExpiry: {
        type: Date,
        required: true,
      },
      licenseImage: String,
      aadharNumber: String,
      aadharImage: String,
    },
    location: {
      latitude: {
        type: Number,
        default: 0,
      },
      longitude: {
        type: Number,
        default: 0,
      },
      lastUpdated: {
        type: Date,
        default: Date.now,
      },
    },
    status: {
      type: String,
      enum: ["active", "inactive", "on_duty", "off_duty", "suspended"],
      default: "inactive",
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    rating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },
    totalDeliveries: {
      type: Number,
      default: 0,
    },
    bankDetails: {
      accountNumber: String,
      ifscCode: String,
      accountHolderName: String,
    },
  },
  { timestamps: true }
);

const Rider = mongoose.model<IRider>("Rider", riderSchema);

export default Rider;
