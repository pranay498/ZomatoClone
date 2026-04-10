import { Request, Response, NextFunction, } from "express";
import axios from "axios";
import { Order } from "../models/Order";
import { Cart } from "../models/Cart";
import { Address } from "../models/Address";
import { asyncHandler } from "../utils/asyncHandler";
import { AppError } from "../utils/AppError";
import { Restaurant } from "../models/Restaurnent";
export const createOrder = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {

    const userId = req.userId;

    if (!userId) return next(new AppError("Unauthorized", 401));

    const { addressId, paymentMethod, totalAmount, userPhone, restaurantId } = req.body;

    if (!addressId) return next(new AppError("addressId is required", 400));

    if (!paymentMethod || !["cod", "upi", "card"].includes(paymentMethod))
      return next(new AppError("Invalid payment method", 400));

    const address = await Address.findOne({ _id: addressId, userId });
    if (!address) return next(new AppError("Address not found or not authorized", 403));

    const cart = await Cart.findOne({ userId });
    if (!cart || cart.items.length === 0)
      return next(new AppError("Cart is empty", 400));

    // ✅ Secure total calculation (INCLUDING all fees like frontend)
    const subtotal = cart.items.reduce((sum, item) => {
      return sum + item.price * item.quantity;
    }, 0);

    const deliveryFee = subtotal > 299 ? 0 : 40;
    const platformFee = 5;
    const gst = Math.round(subtotal * 0.05);
    const calculatedTotal = subtotal + deliveryFee + platformFee + gst;

    if (calculatedTotal !== totalAmount)
      return next(new AppError(`Total mismatch: calculated ${calculatedTotal}, received ${totalAmount}`, 400));

    // ✅ Restaurant check — trust cart's restaurantId (already validated during sync)
    // Use cart's restaurantId as source of truth
    const finalRestaurantId = cart.restaurantId;

    console.log(`🟢 [Order] Creating order with restaurantId: ${finalRestaurantId}`);

    const orderItems = cart.items.map((item: any) => ({
      itemId: item.menuItemId,
      name: item.name,
      price: item.price,
      quantity: item.quantity,
    }));

    const deliveryAddress = {
      formattedAddress: [address.fullAddress, address.addressLine2, address.landmark]
        .filter(Boolean).join(", "),
      mobile: userPhone || "",
      latitude: address.coordinates?.lat ?? 0,
      longitude: address.coordinates?.lng ?? 0,
    };

    const newOrder = new Order({
      userId,
      restaurantId: restaurantId || cart.restaurantId,
      restaurantName: cart.restaurantName || "Restaurant",
      items: orderItems,
      addressId,
      deliveryAddress,
      paymentMethod,
      paymentStatus: "pending",
      totalAmount: calculatedTotal,
      riderId: null,
      riderName: null,
      riderPhone: null,
    });

    const savedOrder = await newOrder.save();

    res.status(201).json({
      success: true,
      message: "Order created",
      orderId: savedOrder._id,
      status: savedOrder.status,
    });
  }
);

/**
 * Confirm COD Order
 * POST /orders/confirm-cod
 * Sets order status to "placed" and paymentStatus to "paid"
 * Publishes ORDER_CONFIRMED event to RabbitMQ
 */

export const fetchOrderForPayment = asyncHandler(
  async (req: Request, res: Response) => {

    // 🔐 INTERNAL SECURITY CHECK
    const receivedKey = req.headers["x-internal-key"];
    const expectedKey = process.env.INTERNAL_SERVICE_KEY;

    console.log("🟡 [fetchOrderForPayment] Security check:");
    console.log("  Received x-internal-key:", receivedKey ? "present" : "missing");
    console.log("  Expected key exists:", expectedKey ? "yes" : "no");
    console.log("  Match:", receivedKey === expectedKey ? "✅" : "❌");
    console.log("  All headers:", Object.keys(req.headers));

    if (receivedKey !== expectedKey) {
      console.error("❌ [fetchOrderForPayment] Forbidden - key mismatch");
      throw new AppError("Forbidden", 403);
    }

    const { id } = req.params;

    // 🔍 FIND ORDER
    const order = await Order.findById(id);

    if (!order) {
      throw new AppError("Order not found", 404);
    }

    // ❌ Prevent duplicate payment
    if (order.paymentStatus === "paid") {
      throw new AppError("Order already paid", 400);
    }

    // ✅ SEND ONLY REQUIRED DATA
    res.status(200).json({
      success: true,
      data: {
        orderId: order._id,
        amount: order.totalAmount,
        currency: "INR",
      },
    });
  }
);

export const fetchRestaurantOrders = asyncHandler(
  async (req: any, res: Response, next: NextFunction) => {
    // 🔑 Auth middleware provides userId from JWT
    const userId = req.userId;
    const restaurantId = req.restaurantId || req.params.restaurantId;

    console.log("📋 [Fetch Orders] Request received");
    console.log("  Owner ID:", userId);
    console.log("  Restaurant ID:", restaurantId);

    if (!userId) {
      return next(new AppError("Unauthorized - Missing user ID", 401));
    }

    if (!restaurantId) {
      return next(new AppError("Unauthorized - Missing restaurant ID", 403));
    }

    // 🔥 Verify ownership since JWT might not contain restaurantId natively yet 
    const restaurant = await Restaurant.findOne({ _id: restaurantId, ownerId: userId });
    if (!restaurant) return next(new AppError("Forbidden - You do not own this restaurant", 403));

    const { limit } = req.query;

    const allOrders = await Order.find({ restaurantId });
    console.log(`🔎 [Fetch Orders] Debug: Total orders in DB for this restaurant irrespective of payment status: ${allOrders.length}`);
    allOrders.forEach(o => console.log(`  -> Order ${o._id}: status=${o.status}, paymentStatus=${o.paymentStatus}, method=${o.paymentMethod}`));

    // 🔥 Fetch orders for this restaurant
    const orders = await Order.find({ restaurantId, paymentStatus: "paid" }) // Get customer details
      .sort({ createdAt: -1 }).limit(Number(limit) || 50); // Optional limit query param

    console.log(`✅ [Fetch Orders] Found ${orders.length} orders for restaurant ${restaurantId}`);



    return res.status(200).json({
      success: true,
      message: `Found ${orders.length} orders`,
      data: orders,
    });
  }
);


export const updateOrderStatus = asyncHandler(
  async (req: any, res: Response, next: NextFunction) => {
    const userId = req.userId;
    const { orderId } = req.params;
    const { status } = req.body;

    console.log("📋 [Update Order Status] Request received");
    console.log("  Owner ID:", userId);
    console.log("  Order ID:", orderId);

    if (!userId) {
      return next(new AppError("Unauthorized - Missing user ID", 401));
    }

    if (!orderId || !status) {
      return next(new AppError("orderId and status are required", 400));
    }

    // Validate status value
    const validStatuses = ["accepted", "preparing", "ready_for_rider", "rider_assigned", "picked_up", "delivered"];
    if (!validStatuses.includes(status)) {
      return next(new AppError("Invalid status value", 400));
    }

    // 🔥 Find order
    const order = await Order.findOne({ _id: orderId });
    if (!order) {
      return next(new AppError("Order not found", 404));
    }

    // Verify ownership
    const restaurant = await Restaurant.findOne({ _id: order.restaurantId, ownerId: userId });
    if (!restaurant) {
      return next(new AppError("Unauthorized - You don't own this order's restaurant", 403));
    }

    const restaurantId = restaurant._id;

    // Validate payment
    if (order.paymentStatus !== "paid") {
      return next(new AppError("Cannot update unpaid order", 400));
    }

    // ✅ Update status
    order.status = status;
    const updatedOrder = await order.save();

    console.log(`✅ [Update Order Status] Order ${orderId} status updated to ${status}`);

    // 📡 Emit real-time event to RealTime service
    try {
      await axios.post(
        `${process.env.REALTIME_SERVICE_URL}/internal/notify`,
        {
          event: "ORDER_STATUS_UPDATED",
          room: `restaurant:${restaurantId}`,
          payload: {
            orderId: updatedOrder._id,
            status: updatedOrder.status,
            restaurantId: restaurantId,
            updatedAt: updatedOrder.updatedAt,
          },
        },
        {
          headers: {
            "x-internal-key": process.env.INTERNAL_SERVICE_KEY,
            "Content-Type": "application/json",
          },
        }
      );
      console.log(`📡 [Update Order Status] Real-time event sent to restaurant`);
    } catch (error: any) {
      console.error(
        `❌ [Update Order Status] Failed to emit event:`,
        error.message
      );
    }

    return res.status(200).json({
      success: true,
      message: `Order status updated to ${status}`,
      data: updatedOrder,
    });
  }
);

export const getMyOrders = asyncHandler(
  async (req: any, res: Response, next: NextFunction) => {
    const userId = req.userId;

    if (!userId) {
      return next(new AppError("Unauthorized - Missing user ID", 401));
    }

    const orders = await Order.find({ userId, paymentStatus: "paid" }).sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      data: orders,
    });
  }
);

export const fetchSingleOrder = asyncHandler(
  async (req: any, res: Response, next: NextFunction) => {
    const userId = req.userId;
    const { orderId } = req.params;

    if (!userId) {
      return next(new AppError("Unauthorized - Missing user ID", 401));
    }

    if (!orderId) {
      return next(new AppError("orderId is required", 400));
    }

    const order = await Order.findOne({ _id: orderId, userId });

    if (!order) {
      return next(new AppError("Order not found or not authorized", 404));
    }

    if (order.userId.toString() !== userId) {
      return next(new AppError("Unauthorized - You can only access your own orders", 403));
    }

    return res.status(200).json({
      success: true,
      data: order,
    });
  }
);

