import mongoose, { Schema, Document } from "mongoose";

export interface IMenuItem extends Document {
  menuItemId: string;
  restaurantId: string;
  restaurantName: string;

  name: string;
  description: string;
  image?: string;

  price: number;

  isAvailable: boolean;
}

const menuItemSchema = new Schema<IMenuItem>(
  {
    menuItemId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },

    restaurantId: {
      type: String,
      required: true,
      index: true,
    },

    restaurantName: {
      type: String,
      required: true,
      trim: true,
    },

    name: {
      type: String,
      required: true,
      trim: true,
    },

    description: {
      type: String,
      required: true,
      trim: true,
    },

    image: {
      type: String,
    },

    price: {
      type: Number,
      required: true,
    },

    isAvailable: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

menuItemSchema.index({
  restaurantName: "text",
  name: "text",
});

export const MenuItem = mongoose.model<IMenuItem>(
  "MenuItem",
  menuItemSchema
);