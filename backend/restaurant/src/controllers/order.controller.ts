import { Request, Response, NextFunction, } from "express";
import { Order } from "../models/Order";
import { Cart } from "../models/Cart";
import { Address } from "../models/Address";
import { asyncHandler } from "../utils/asyncHandler";
import { AppError } from "../utils/AppError";

export const createOrder = asyncHandler(
  async (req:Request, res: Response, next: NextFunction) => {

    const userId = req.userId;

    if (!userId) return next(new AppError("Unauthorized", 401));

    const { addressId, paymentMethod, totalAmount, userPhone, restaurantId } = req.body;

    if (!addressId) return next(new AppError("addressId is required", 400));

    if (!paymentMethod || !["cod","upi","card"].includes(paymentMethod))
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
export const confirmCODOrder = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const userId = req.userId;

    if (!userId) return next(new AppError("Unauthorized", 401));

    const { orderId } = req.body;

    if (!orderId) return next(new AppError("orderId is required", 400));

    // Find order
    const order = await Order.findOne({ _id: orderId, userId });
    if (!order) return next(new AppError("Order not found or not authorized", 403));

    // Validate payment method is COD
    if (order.paymentMethod !== "cod") {
      return next(new AppError("This order is not COD", 400));
    }

    // Validate order hasn't been confirmed already
    if (order.status !== "pending") {
      return next(new AppError(`Order already ${order.status}`, 400));
    }

    // ✅ Update order status
    order.status = "placed";
    order.paymentStatus = "paid";
    const updatedOrder = await order.save();

    console.log(`✅ [COD] Order ${orderId} placed by user ${userId}`);

    // TODO: Publish ORDER_CONFIRMED to RabbitMQ if using messaging queue
    // await publishToRabbitMQ("orders", {
    //   event: "ORDER_CONFIRMED",
    //   orderId: updatedOrder._id,
    //   userId,
    //   restaurantId: updatedOrder.restaurantId,
    // });

    res.status(200).json({
      success: true,
      message: "Order confirmed",
      orderId: updatedOrder._id,
      status: updatedOrder.status,
    });
  }
);
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
    const restaurantId = req.restaurantId; // From JWT restaurantId field

    console.log("📋 [Fetch Orders] Request received");
    console.log("  Owner ID:", userId);
    console.log("  Restaurant ID:", restaurantId);

    if (!userId) {
      return next(new AppError("Unauthorized - Missing user ID", 401));
    }

    if (!restaurantId) {
      return next(new AppError("Unauthorized - Missing restaurant ID in token", 403));
    }

    // 🔥 Fetch orders for this restaurant
    const orders = await Order.find({ restaurantId })
      .populate("userId", "name email phone") // Get customer details
      .sort({ createdAt: -1 });

    console.log(`✅ [Fetch Orders] Found ${orders.length} orders for restaurant ${restaurantId}`);

    return res.status(200).json({
      success: true,
      message: `Found ${orders.length} orders`,
      data: orders,
    });
  }
);