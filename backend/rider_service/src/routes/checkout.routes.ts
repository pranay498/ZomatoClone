import { Router } from "express";
import {
  confirmCODOrder,
  createRazorpayOrder,
  verifyRazorpaySignatureController,
} from "../controllers/checkout.controller";
import { authMiddleware } from "../middlewares/auth.middleware";

const router = Router();

/**
 * @route   POST /api/v1/checkout/razorpay/order
 * @desc    Create Razorpay order (user can create order for their own account)
 * @access  Protected (requires x-user-id header from API Gateway)
 */
router.post("/razorpay/order", authMiddleware, createRazorpayOrder);

/**
 * @route   POST /api/v1/checkout/razorpay/verify
 * @desc    Verify Razorpay payment signature (user can verify their own payment)
 * @access  Protected (requires x-user-id header from API Gateway)
 */
router.post("/razorpay/verify", authMiddleware, verifyRazorpaySignatureController);

/**
 * @route   POST /api/v1/checkout/confirm-cod
 * @desc    Confirm COD order (calls restaurant service to confirm)
 * @access  Protected (requires userId from auth middleware)
 */
router.post("/confirm-cod", authMiddleware, confirmCODOrder);

export default router;
