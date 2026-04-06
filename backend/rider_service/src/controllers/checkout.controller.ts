import { Request, Response, NextFunction } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { verifyRazorpayPayment } from "../config/verifyRazorpay";
import { publishPaymentSuccess } from "../config/payment.producer";
import { getRazorpayInstance } from "../config/razorpay";
import { AppError } from "../utils/AppError";
import axiosClient, { addAuthHeader } from "../config/axiosClient";

/**
 * Creates a new Razorpay Order for online payments
 * POST /api/v1/checkout/razorpay/order
 */
export const createRazorpayOrder = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = req.userId;
    const { orderId, amount } = req.body;

    console.log(`🟡 [createRazorpayOrder] Received payload:`, {
      userId,
      orderId,
      amount,
      fullBody: req.body,
    });

    if (!orderId) {
      console.error("❌ [createRazorpayOrder] Missing orderId - payload:", req.body);
      throw new AppError("orderId is required", 400);
    }

    if (!amount) {
      console.error("❌ [createRazorpayOrder] Missing amount - payload:", req.body);
      throw new AppError("amount is required", 400);
    }

    // 🔥 CALL ORDER SERVICE (via API Gateway)
    // GET /api/v1/orders/:id/payment → routes to restaurant service
    const orderServiceUrl = `/api/v1/orders/${orderId}/payment`;
    console.log(`🟡 [createRazorpayOrder] Calling: ${orderServiceUrl}`);
    
    // Add auth token to axios
    const token = req.headers.authorization?.split(" ")[1];
    if (token) {
      addAuthHeader(token);
    }

    try {
      const response = await axiosClient.get(orderServiceUrl);
      console.log(`🟢 [createRazorpayOrder] Order service responded successfully`);
      
      const orderData = response.data?.data;

      if (!orderData) {
        throw new AppError("Order not found", 404);
      }

      // 🔥 CREATE RAZORPAY ORDER
      const razorpayInstance = getRazorpayInstance();
      const razorpayOrder = await razorpayInstance.orders.create({
        amount: amount, 
        currency: "INR",
        receipt: orderData.orderId.toString(),
      });

      res.status(200).json({
        success: true,
        razorpayOrderId: razorpayOrder.id,
        amount: razorpayOrder.amount,
        currency: razorpayOrder.currency,
      });
    } catch (error: any) {
      // Log the actual error for debugging
      console.error(`❌ [createRazorpayOrder] Error calling order service:`, {
        error: error.message,
        status: error.statusCode || error.response?.status,
        data: error.response?.data || error,
      });
      throw error;
    }
  }
);

/**
 * Verifies the Razorpay payment signature
 * POST /api/v1/checkout/razorpay/verify
 */
export const verifyRazorpaySignatureController = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = req.userId;
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      orderId,
    } = req.body;

    console.log(`🟡 [verifyRazorpaySignature] userId: ${userId}, orderId: ${orderId}`);

    if (
      !razorpay_order_id ||
      !razorpay_payment_id ||
      !razorpay_signature ||
      !orderId
    ) {
      throw new AppError("Missing payment fields", 400);
    }

    const isValid = await verifyRazorpayPayment(
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature
    );

    if (!isValid) {
      throw new AppError("Payment verification failed", 400);
    }

    // 🔥 SEND TO RABBITMQ
    await publishPaymentSuccess({
      orderId,
      paymentId: razorpay_payment_id,
      provider: "razorpay",
    });

    res.status(200).json({
      success: true,
      message: "Payment verified successfully",
    });
  }
);
