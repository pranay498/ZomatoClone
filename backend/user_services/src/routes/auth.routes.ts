import express, { Router } from "express";
import { login, register, googleCallback, addRole, getProfile } from "../controllers/auth.controller";
import { googleClient } from "../config/googleConfig";
import { AppError } from "../utils/AppError";
import { requireAuth } from "../middlewares/auth.middleware";

const router: Router = express.Router();


/**
 * POST /auth/login
 * Email/Password Login
 * Body: { email, password }
 */
router.post("/login", login);

/**
 * POST /auth/register
 * User Registration
 * Body: { firstName, lastName, email, password, phoneNumber }
 */
router.post("/register", register);


/**
 * GET /auth/google/callback
 * Google OAuth Callback Handler
 * Receives authorization code and exchanges for tokens
 */
router.post("/google", googleCallback);

/**
 * PUT /auth/add-role
 * Add/Update User Role after Login
 * Requires: Authentication (x-user-id header from gateway)
 * Body: { role: "customer" | "rider" | "seller" | "admin" }
 * Returns: Updated user data + new accessToken + refreshToken
 */
router.put("/add-role", requireAuth, addRole);

/**
 * GET /auth/profile
 * Fetch Current User Account Information
 * Requires: Authentication (x-user-id header from gateway)
 * Returns: User profile data (email, firstName, lastName, phoneNumber, role, etc.)
 */
router.get("/profile", requireAuth, getProfile);

export default router;
