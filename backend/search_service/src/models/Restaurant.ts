import mongoose, { Schema, Document } from "mongoose";

export interface IRestaurant extends Document {
  restaurantId: string;
  name: string;
}

const restaurantSchema = new Schema<IRestaurant>(
  {
    restaurantId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },

    name: {
      type: String,
      required: true,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

export const Restaurant = mongoose.model<IRestaurant>(
  "Restaurant",
  restaurantSchema
);