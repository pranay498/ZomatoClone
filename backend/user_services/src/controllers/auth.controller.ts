import { Request, Response } from "express";
import { User } from "../models/user.model";
import { AppError } from "../utils/AppError";
import { hashPassword, comparePassword } from "../utils/password.util";
import { generateToken, generateRefreshToken } from "../utils/jwt.util";
import { googleClient } from "../config/googleConfig";
import { asyncHandler } from "../middlewares/asyncHandler";

// Email/Password Login
export const login = asyncHandler(async (req: Request, res: Response) => {
  const { email, password } = req.body;

  // Validation
  if (!email || !password) {
    throw new AppError("Email and password are required", 400);
  }

  // Find user by email
  console.log("🔵 [Login] Attempt for:", email);
  const user = await User.findOne({ email }).select("+password");
  
  if (!user) {
    console.log("❌ [Login] User not found");
    throw new AppError("Invalid email or password", 401);
  }

  console.log("🟢 [Login] User found. ID:", user._id);
  console.log("🟢 [Login] Password hash in DB:", user.password ? "Found (" + user.password.substring(0, 15) + "...)" : "Missing!");

  // Check if password is correct
  if (!user.password) {
    throw new AppError("This account uses social login. Please sign in with Google.", 401);
  }

  const isPasswordValid = await comparePassword(password, user.password);
  console.log("🔍 [Login] isPasswordValid:", isPasswordValid);

  if (!isPasswordValid) {
    throw new AppError("Invalid email or password", 401);
  }

  // Generate tokens
  const accessToken = generateToken({
    id: user._id.toString(),
    role: user.role,
  });
  const refreshToken = generateRefreshToken({
    id: user._id.toString(),
    role: user.role,
  });

  res.status(200).json({
    success: true,
    message: "Login successful",
    data: {
      user: {
        _id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        phoneNumber: user.phoneNumber,
        role: user.role,
      },
      accessToken,
      refreshToken,
    },
  });
});

// Email/Password Registration
export const register = asyncHandler(async (req: Request, res: Response) => {
  const { firstName, lastName, email, password, phoneNumber } = req.body;

  // Validation
  if (!firstName || !lastName || !email || !password || !phoneNumber) {
    throw new AppError("All fields are required", 400);
  }

  // Email format check
  const emailRegex = /.+\@.+\..+/;
  if (!emailRegex.test(email)) {
    throw new AppError("Please provide a valid email address", 400);
  }

  // Password strength check
  if (password.length < 6) {
    throw new AppError("Password must be at least 6 characters", 400);
  }

  // Check if email already exists
  const existingEmail = await User.findOne({ email });
  if (existingEmail) {
    throw new AppError("Email is already registered", 409);
  }

  // Check if phone number already exists
  const existingPhone = await User.findOne({ phoneNumber });
  if (existingPhone) {
    throw new AppError("Phone number is already registered", 409);
  }

  // Hash password
  const hashedPassword = await hashPassword(password);
  console.log("🔵 [Register] Hashing password for:", email);
  console.log("🔵 [Register] Hash generated:", hashedPassword.substring(0, 15) + "...");

  // Create user
  const user = await User.create({
    firstName,
    lastName,
    email,
    password: hashedPassword,
    phoneNumber,
    isActive: true,
  });

  console.log("🟢 [Register] User created. Password field in object:", user.password ? "Present" : "Missing (select:false)");


  // Generate tokens
  const accessToken = generateToken({
    id: user._id.toString(),
    role: user.role,
  });
  const refreshToken = generateRefreshToken({
    id: user._id.toString(),
    role: user.role,
  });

  res.status(201).json({
    success: true,
    message: "Registration successful",
    data: {
      user: {
        _id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        phoneNumber: user.phoneNumber,
        role: user.role,
      },
      accessToken,
      refreshToken,
    },
  });
});

export const googleCallback = asyncHandler(async (req, res) => {
  console.log("Google callback hit");
  console.log("Request body:", req.body);
  console.log("Request query:", req.query);
  const { credential } = req.body;

  console.log("Code received:", credential);
  if (!credential) {
    throw new AppError("Authorization code is required", 400);
  }

  // Exchange code for tokens
  const { tokens } = await googleClient.getToken({
    code: credential,
    redirect_uri: "postmessage",
  });
  console.log("2. Tokens:", tokens);
  googleClient.setCredentials(tokens);

  if (!tokens.id_token) {
    throw new AppError("Failed to retrieve ID token from Google", 400);
  }

  // Verify and decode Google ID token
  const ticket = await googleClient.verifyIdToken({
    idToken: tokens.id_token,
    audience: process.env.GOOGLE_CLIENT_ID,
  });

  const payload = ticket.getPayload();

  if (!payload?.email) {
    throw new AppError("Failed to get user information from Google", 400);
  }

  // Upsert user
  let user = await User.findOne({
    $or: [{ googleId: payload.sub }, { email: payload.email }],
  });

  if (!user) {
    user = await User.create({
      email: payload.email,
      firstName: payload.given_name ?? payload.name?.split(" ")[0] ?? "User",
      lastName: payload.family_name ?? payload.name?.split(" ")[1] ?? "Unknown",
      profilePicture: payload.picture ?? "",
      googleId: payload.sub,
      isActive: true,
    });
  } else if (!user.googleId) {
    user.googleId = payload.sub;
    await user.save();
  }


  // Generate tokens
  const accessToken = generateToken({
    id: user._id.toString(),
    role: user.role,
  });
  const refreshToken = generateRefreshToken({
    id: user._id.toString(),
    role: user.role,
  });

  res.status(200).json({
    success: true,
    message: "Google login successful",
    data: {
      user: {
        _id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
      },
      accessToken,
      refreshToken,
    },
  });
});

const VALID_ROLES = ["customer", "rider", "seller"] as const;
type ValidRole = typeof VALID_ROLES[number];

export const addRole = asyncHandler(async (req: Request, res: Response) => {
  const { role } = req.body;
  const userId = req.headers["x-user-id"] as string; // ✅ comes from proxy gateway

  if (!userId) {
    throw new AppError("Unauthorized", 401);
  }

  if (!role) {
    throw new AppError("Role is required", 400);
  }

  if (!VALID_ROLES.includes(role as ValidRole)) {
    throw new AppError(`Invalid role. Must be one of: ${VALID_ROLES.join(", ")}`, 400);
  }

  const user = await User.findByIdAndUpdate(userId, { role }, { returnDocument: "after" });

  if (!user) {
    throw new AppError("User not found", 404);
  }

  const accessToken = generateToken({ id: user._id.toString(), role: user.role });
  const refreshToken = generateRefreshToken({ id: user._id.toString(), role: user.role });

  res.status(200).json({
    success: true,
    message: `Role updated to ${role} successfully`,
    data: {
      user: {
        _id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        phoneNumber: user.phoneNumber,
        role: user.role,
      },
      accessToken,
      refreshToken,
    },
  });
});

// Fetch Current User Account
export const getProfile = asyncHandler(
  async (req: Request & { userId?: string }, res: Response) => {
    const userId = req.userId;

    if (!userId) {
      throw new AppError("User ID is required", 400);
    }

    const user = await User.findById(userId).select(
      "-password -googleId -createdAt -updatedAt",
    );

    if (!user) {
      throw new AppError("User not found", 404);
    }

    res.status(200).json({
      success: true,
      message: "User profile fetched successfully",
      data: {
        user,
      },
    });
  },
);
