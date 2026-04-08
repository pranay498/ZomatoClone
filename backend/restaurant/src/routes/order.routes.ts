import { Router } from "express";
import { createOrder, fetchOrderForPayment, fetchRestaurantOrders, updateOrderStatus, getMyOrders, fetchSingleOrder } from "../controllers/order.controller";
import { requireAuth, requireSeller } from "../middlewares/auth.middleware";

const router = Router();

// Create order with full validation (addressId, phone, payment method)
router.post("/create", requireAuth, createOrder);

router.get("/my", requireAuth, getMyOrders);

// 🔥 Fetch orders for restaurant owner (requires restaurantId in JWT)
router.get("/seller/:restaurantId", requireAuth, requireSeller, fetchRestaurantOrders);

// 🍽️ Update order status (restaurant owner only)
router.put("/:orderId/status", requireAuth, updateOrderStatus);

router.get("/:id/payment", fetchOrderForPayment);

router.get("/:id", requireAuth, fetchSingleOrder);


export default router;
