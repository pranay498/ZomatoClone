import { Router } from "express";

import { authProxy } from "../proxy/auth.proxy";
import { restaurantProxy } from "../proxy/restaurant.proxy";
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

export default router;