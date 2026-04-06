import { Router } from "express";
import { createOrder, confirmCODOrder, fetchOrderForPayment, fetchRestaurantOrders } from "../controllers/order.controller";
import { requireAuth } from "../middlewares/auth.middleware";

const router = Router();

// Create order with full validation (addressId, phone, payment method)
router.post("/create", requireAuth, createOrder);

// Confirm COD order (sets status to "placed" and paymentStatus to "paid")
router.post("/confirm-cod", requireAuth, confirmCODOrder);

// 🔥 Fetch orders for restaurant owner (requires restaurantId in JWT)
router.get("/restaurant/orders", requireAuth, fetchRestaurantOrders);

router.get("/:id/payment", fetchOrderForPayment);

export default router;
