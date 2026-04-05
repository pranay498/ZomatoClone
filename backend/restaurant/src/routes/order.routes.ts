import { Router } from "express";
import { createOrder, confirmCODOrder, fetchOrderForPayment } from "../controllers/order.controller";
import { requireAuth } from "../middlewares/auth.middleware";

const router = Router();

// Create order with full validation (addressId, phone, payment method)
router.post("/create", requireAuth, createOrder);

// Confirm COD order (sets status to "placed" and paymentStatus to "paid")
router.post("/confirm-cod", requireAuth, confirmCODOrder);

router.get("/:id/payment", fetchOrderForPayment);

export default router;
