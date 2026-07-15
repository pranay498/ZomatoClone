import { Router } from "express";
import { 
    savePaymentMethod, 
    createRazorpayOrder, 
    verifyRazorpayPayment 
} from "../controllers/checkout.controller";
import { requireAuth } from "../middlewares/auth.middleware";

const router = Router();

router.post("/payment/select", requireAuth, savePaymentMethod);

// Razorpay Routes
router.post("/razorpay/order", requireAuth, createRazorpayOrder);
router.post("/razorpay/verify", requireAuth, verifyRazorpayPayment);

export default router;
