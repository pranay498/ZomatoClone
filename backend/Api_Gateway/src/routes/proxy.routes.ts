import { Router } from "express";

import { authProxy } from "../proxy/auth.proxy";
import { restaurantProxy } from "../proxy/restaurant.proxy";
import { paymentProxy } from "../proxy/payment.proxy";
import { realtimeProxy } from "../proxy/realtime.proxy";
import { riderProxy } from "../proxy/rider.proxy";
import { verifyToken } from "../middlewares/auth.middleware";

const router = Router();

// Public auth routes (login, register, logout, refresh)
router.use("/auth", authProxy);

// Restaurant service routes (protected)
router.use("/restaurant", verifyToken, restaurantProxy);

// Menu service routes (protected)
router.use("/menu", verifyToken, restaurantProxy);

// Cart service routes (protected)
router.use("/cart", verifyToken, restaurantProxy);

// Address and Checkout routes -> handled by restaurant service
router.use("/user/address", verifyToken, restaurantProxy);

// Order routes - some need JWT (user endpoints), some need internal key (service-to-service)
// The restaurantProxy will handle the authentication verification based on the endpoint
// User endpoints: POST /create, /confirm-cod (need JWT via verifyToken)
// Internal endpoints: GET /:id/payment (need x-internal-key header)
router.use("/orders",verifyToken, restaurantProxy);

// Payment routes -> handled by rider service (Razorpay)

router.use("/checkout", verifyToken, paymentProxy);

router.use("/payment", verifyToken, paymentProxy);

// RealTime service routes (notifications)
router.use("/notifications", realtimeProxy);

// Rider service routes (protected via gateway or handled inside)
router.use("/riders", verifyToken, riderProxy);

export default router;