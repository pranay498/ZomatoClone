import { Request, Response } from "express";
import crypto from "crypto";
import Razorpay from "razorpay";

// Initialize Razorpay
// Note: You must add RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET to your .env file
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || "rzp_test_placeholder",
  key_secret: process.env.RAZORPAY_KEY_SECRET || "placeholder_secret",
});

export const savePaymentMethod = async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = req.headers["x-user-id"] as string;
        
        if (!userId) {
            res.status(401).json({ success: false, message: "Unauthorized" });
            return;
        }

        const { paymentMethod, orderId } = req.body;

        if (!paymentMethod) {
            res.status(400).json({ success: false, message: "Payment method is required" });
            return;
        }

        // This returns a token for the user to proceed to the final checkout confirmation
        const checkoutToken = `chk_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        res.status(200).json({
            success: true,
            message: "Payment method selected",
            checkoutToken
        });
    } catch (error: any) {
        console.error("Save payment method error:", error);
        res.status(500).json({ success: false, message: "Server error", error: error.message });
    }
};

/**
 * Creates a new Razorpay Order for online payments
 * POST /api/v1/checkout/razorpay/order
 */
export const createRazorpayOrder = async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = req.headers["x-user-id"] as string;
        if (!userId) {
            res.status(401).json({ success: false, message: "Unauthorized" });
            return;
        }

        const { amount } = req.body; // Amount in INR

        if (!amount || isNaN(amount)) {
            res.status(400).json({ success: false, message: "Valid amount is required" });
            return;
        }

        const options = {
            amount: Math.round(amount * 100), // Convert INR to paise
            currency: "INR",
            receipt: `rcpt_${userId}_${Date.now()}`,
            payment_capture: 1 // Auto capture
        };

        const order = await razorpay.orders.create(options);

        res.status(200).json({
            success: true,
            orderId: order.id,
            amount: order.amount,
            currency: order.currency
        });

    } catch (error: any) {
        console.error("Create Razorpay Order error:", error);
        res.status(500).json({ success: false, message: "Payment gateway error", error: error.message });
    }
};

/**
 * Verifies the Razorpay payment signature
 * POST /api/v1/checkout/razorpay/verify
 */
export const verifyRazorpayPayment = async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = req.headers["x-user-id"] as string;
        if (!userId) {
            res.status(401).json({ success: false, message: "Unauthorized" });
            return;
        }

        const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

        if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
            res.status(400).json({ success: false, message: "Missing Razorpay payment payload" });
            return;
        }

        const secret = process.env.RAZORPAY_KEY_SECRET || "placeholder_secret";
        
        // Generate the expected signature
        const shasum = crypto.createHmac("sha256", secret);
        shasum.update(`${razorpay_order_id}|${razorpay_payment_id}`);
        const expectedSignature = shasum.digest("hex");

        if (expectedSignature === razorpay_signature) {
            // Signature is valid. Payment is successful.
            // TODO: Create the Order in the database here with Payment attached.
            
            res.status(200).json({
                success: true,
                message: "Payment verified successfully",
                paymentId: razorpay_payment_id
            });
        } else {
            res.status(400).json({
                success: false,
                message: "Invalid signature. Payment verification failed."
            });
        }
    } catch (error: any) {
        console.error("Verify Razorpay Payment error:", error);
        res.status(500).json({ success: false, message: "Payment verification error", error: error.message });
    }
};
