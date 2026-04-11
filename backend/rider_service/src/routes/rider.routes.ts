import express from "express";
import { createRiderProfile, fetchMyProfile, toggleRiderAvailability, acceptOrder, getCurrentOrder, updateOrderStatus } from "../controllers/rider.controller";
import { singleUpload } from "../middlewares/multer";
import { requireAuth, requireRider } from "../middlewares/auth.middleware";

const router = express.Router();

// ── Profile Routes ─────────────────────────────────────────────
// GET /api/v1/riders/profile (Fetch Profile)
router.get("/profile", requireAuth, requireRider, fetchMyProfile);

// POST /api/v1/riders/profile (Create Profile)
router.post("/profile", requireAuth, requireRider, singleUpload, createRiderProfile);

// PUT /api/v1/riders/availability (Toggle Availability)
router.put("/availability", requireAuth, requireRider, toggleRiderAvailability);

// ── Order Routes ───────────────────────────────────────────────
// PUT /api/v1/riders/orders/accept (Accept an order)
router.put("/orders/accept", requireAuth, requireRider, acceptOrder);

// GET /api/v1/riders/orders/current (Get active order)
router.get("/orders/current", requireAuth, requireRider, getCurrentOrder);

// PUT /api/v1/riders/orders/status (Update order status: picked_up / delivered)
router.put("/orders/status", requireAuth, requireRider, updateOrderStatus);

export default router;
