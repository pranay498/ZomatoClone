import { Router } from "express";
import {
  registerRider,
  getRiderProfile,
  updateRiderLocation,
  updateRiderStatus,
  getAllRiders,
  getAvailableRiders,
} from "../controllers/rider.controller";
import { authenticateRider } from "../middlewares/auth.middleware";

const router = Router();

// Public routes
/**
 * @route   POST /api/riders/register
 * @desc    Register a new rider
 * @access  Public
 */
router.post("/register", registerRider);

// Protected routes
/**
 * @route   GET /api/riders/profile
 * @desc    Get rider profile
 * @access  Private
 */
router.get("/profile", authenticateRider, getRiderProfile);

/**
 * @route   PUT /api/riders/location
 * @desc    Update rider location
 * @access  Private
 */
router.put("/location", authenticateRider, updateRiderLocation);

/**
 * @route   PUT /api/riders/status
 * @desc    Update rider status
 * @access  Private
 */
router.put("/status", authenticateRider, updateRiderStatus);

/**
 * @route   GET /api/riders/available
 * @desc    Get available riders near location
 * @access  Private
 */
router.post("/available", authenticateRider, getAvailableRiders);

// Admin routes
/**
 * @route   GET /api/riders
 * @desc    Get all riders
 * @access  Private (Admin only)
 */
router.get("/", getAllRiders);

export default router;
