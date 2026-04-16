import { Router } from "express";
import {
  createOrder,
  fetchOrderForPayment,
  fetchRestaurantOrders,
  updateOrderStatus,
  getMyOrders,
  fetchSingleOrder,
  assignRiderToOrder,
  updateOrderStatusRider,
  getCurrentOrderForRider,
} from "../controllers/order.controller";
import { requireAuth, requireSeller } from "../middlewares/auth.middleware";

const router = Router();

// ── Customer ─────────────────────────────────────────────────────────────
router.post("/create", requireAuth, createOrder);
router.get("/my", requireAuth, getMyOrders);



router.get("/rider/current", getCurrentOrderForRider);         // GET /rider/current
router.put("/assign/rider", assignRiderToOrder);               // PUT /assign/rider
router.put("/rider/status", updateOrderStatusRider);           // PUT /rider/status


// ── Restaurant Owner (DYNAMIC ROUTES MIDDLE) ──────────────────────────────
router.get("/seller/:restaurantId", requireAuth, requireSeller, fetchRestaurantOrders);

// Now safe to place here. "rider" will no longer be mistaken for an orderId.
router.put("/:orderId/status", requireAuth, updateOrderStatus);
router.put("/:orderId", updateOrderStatus);


// ── Internal (Payment Service) ────────────────────────────────────────────
router.get("/:id/payment", fetchOrderForPayment);

// ── Customer (DYNAMIC CATCH-ALL LAST) ─────────────────────────────────────
router.get("/:id", requireAuth, fetchSingleOrder);

export default router;
