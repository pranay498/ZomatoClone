import express from "express";
import { createRiderProfile, fetchMyProfile, toggleRiderAvailability } from "../controllers/rider.controller";
import { singleUpload } from "../middlewares/multer";
import { requireAuth, requireRider } from "../middlewares/auth.middleware";

const router = express.Router();

// GET /api/v1/riders/profile (Fetch Profile)
router.get("/profile", requireAuth, requireRider, fetchMyProfile);

// POST /api/v1/riders/profile (Create Profile)
router.post("/profile", requireAuth, requireRider, singleUpload, createRiderProfile);

// PUT /api/v1/riders/availability (Toggle Availability)
router.put("/availability", requireAuth, requireRider, toggleRiderAvailability);

export default router;
