import { Router } from "express";
import { createOrder } from "../controllers/order.controller";
import { requireAuth } from "../middlewares/auth.middleware";

const router = Router();

// Create order with full validation (addressId, phone, payment method)
router.post("/create", requireAuth, createOrder);

export default router;
