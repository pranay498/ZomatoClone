import mongoose, { Document, Schema } from "mongoose";

export type UserRole = "customer" | "rider" | "seller" | "admin";

export interface IUser extends Document {
  firstName: string;
  lastName: string;
  email: string;
  password?: string;
  phoneNumber?: string;
  profilePicture?: string;
  googleId?: string;
  isActive: boolean;
  role: UserRole;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema: Schema = new Schema(
  {
    firstName: { type: String, required: true, trim: true, default: "User" },

    lastName: { type: String, required: false, trim: true, default: "Unknown" },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      match: [/.+\@.+\..+/, "Please fill a valid email address"],
    },
    password: {
      type: String,
      required: false, // ✅ optional — OAuth users have no password
      select: false,
    },
    profilePicture: {
      type: String,
      default: "",
    },
    googleId: {
      type: String,
      sparse: true, // ✅ optional, but indexed for fast lookup
      unique: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    role: {
      type: String,
      default: null,
      enum: ["customer", "rider", "seller"],
    },
  },
  { timestamps: true },
);

export const User = mongoose.model<IUser>("User", UserSchema);
