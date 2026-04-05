import { Router } from "express";
import { createOrder, confirmCODOrder } from "../controllers/order.controller";
import { requireAuth } from "../middlewares/auth.middleware";

const router = Router();

// Create order with full validation (addressId, phone, payment method)
router.post("/create", requireAuth, createOrder);

// Confirm COD order (sets status to "placed" and paymentStatus to "paid")
router.post("/confirm-cod", requireAuth, confirmCODOrder);

export default router;
