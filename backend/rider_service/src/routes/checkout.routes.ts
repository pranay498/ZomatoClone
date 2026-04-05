import { Router } from "express";
import {
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

export default router;
