import mongoose, { Schema, Document } from "mongoose";

export interface IOrder extends Document {
  userId: string;
  restaurantId?: string; // Optional depending on how you structure multi-restaurant carts
  restaurantName?: string;

  // Rider information (Will be populated later via RabbitMQ/Socket)
  riderId?: string | null;
  riderPhone?: string | null;  // Changed to string for better phone number formatting
  riderName?: string | null;

  // The food items they bought
  items: {
    itemId: string;
    name: string;
    price: number;
    quantity: number;
  }[];

  // The checkout details we just built!
  addressId?: string; // Reference to the Address they picked

  // Specific delivery structure expected by Rider Service
  deliveryAddress: {
    formattedAddress: string;  // Note: Fixed typo from 'fromattedAddress' in screenshot
    mobile: number;
    latitude: number;
    longitude: number;
  };

  paymentMethod: "cod" | "upi" | "card";
  paymentId?: string; // Store Razorpay Payment ID if paid online
  paymentStatus: "pending" | "paid" | "failed";

  status: "placed" | "accepted" | "preparing" | "ready_for_rider" | "rider_assigned" | "picked_up" | "delivered" | "cancelled";

  totalAmount: number;

  createdAt: Date;
  updatedAt: Date;
}

const OrderSchema: Schema = new Schema(
  {
    userId: { type: String, required: true },
    restaurantId: { type: String, required: false },
    restaurantName: { type: String, required: false },

    // Rider Details
    riderId: { type: String, default: null },
    riderPhone: { type: String, default: null },
    riderName: { type: String, default: null },

    // Items
    items: [
      {
        itemId: { type: String, required: true },
        name: { type: String, required: true },
        price: { type: Number, required: true },
        quantity: { type: Number, required: true, default: 1 }
      }
    ],

    // Checkout Details
    addressId: { 
      type: Schema.Types.ObjectId,
      ref: "Address",
      required: [true, "Address ID is required"],
      index: true
    },

    // Rider Service Address Structure
    deliveryAddress: {
      formattedAddress: { 
        type: String, 
        required: [true, "Formatted address is required"] 
      },
      mobile: { 
        type: Number, 
        required: [true, "Phone number is required"]
      },
      latitude: { 
        type: Number, 
        required: [true, "Latitude is required"],
        default: 0
      },
      longitude: { 
        type: Number, 
        required: [true, "Longitude is required"],
        default: 0
      }
    },

    paymentMethod: { type: String, enum: ["cod", "upi", "card"], required: true },
    paymentId: { type: String, default: null }, // e.g. "pay_N2abc12345"
    paymentStatus: { type: String, enum: ["pending", "paid", "failed"], default: "pending" },

    status: {
      type: String,
      enum: ["placed", "accepted", "preparing", "ready_for_rider", "rider_assigned", "picked_up", "delivered", "cancelled"],
      default: "placed"
    },
    totalAmount: { type: Number, required: true }
  },
  { timestamps: true }
);

export const Order = mongoose.model<IOrder>("Order", OrderSchema);
