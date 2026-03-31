import mongoose from "mongoose";
import {AppError} from "../utils/AppError";

const connectDB = async (): Promise<void> => {
  try {
    await mongoose.connect(process.env.MONGO_URI as string);
    console.log("MongoDB connected ✅");
  } catch (error) {
    throw new AppError("Database connection failed", 500);
  }
};

export default connectDB;
