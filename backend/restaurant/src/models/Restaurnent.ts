import mongoose, { Schema, Document } from "mongoose";

export interface IRestaurant extends Document {
    name: string;
    description: string;
    ownerId: string;
    phone: number;
    isVerified: boolean;
    imageUrl?: string;
    autoLocation: {
        type: string;
        coordinates: [number, number];
        formattedAddress: string;
    };
    isOpen: boolean;
    createdAt: Date;
}

const restaurantSchema = new Schema<IRestaurant>(
  {
    name: {
      type: String,
      required: [true, "Restaurant name is required"],
      trim: true,
      minlength: [3, "Name must be at least 3 characters"],
      maxlength: [100, "Name cannot exceed 100 characters"]
    },

    description: {
      type: String,
      required: [true, "Description is required"],
      trim: true,
      minlength: [3, "Description must be at least 3 characters"]
    },

    ownerId: {
      type: String,
      required: [true, "Owner ID is required"],
      trim: true
    },

    phone: {
      type: Number,
      required: [true, "Phone number is required"],
      validate: {
        validator: function (v: number) {
          return /^[6-9]\d{9}$/.test(v.toString()); // Indian phone validation
        },
        message: "Invalid phone number"
      }
    },

    isVerified: {
      type: Boolean,
      default: false
    },

    imageUrl: {
      type: String,
      validate: {
        validator: function (v: string) {
          return !v || /^https?:\/\/.+\..+/.test(v);
        },
        message: "Invalid image URL"
      }
    },

    autoLocation: {
      type: {
        type: String,
        enum: ["Point"],
        default: "Point",
        required: true
      },
      coordinates: {
        type: [Number],
        required: true,
        validate: {
          validator: function (v: number[]) {
            return (
              v.length === 2 &&
              v[0] >= -180 && v[0] <= 180 && // longitude
              v[1] >= -90 && v[1] <= 90      // latitude
            );
          },
          message: "Coordinates must be [longitude, latitude]"
        }
      },
      formattedAddress: {
        type: String,
        required: [true, "Address is required"],
        trim: true
      }
    },

    isOpen: {
      type: Boolean,
      default: true
    }
  },
  {
    timestamps: true
  }
);

// 🔥 Geo Index (important for nearby search)
restaurantSchema.index({ autoLocation: "2dsphere" });

export const Restaurant = mongoose.model<IRestaurant>(
  "Restaurant",
  restaurantSchema
);