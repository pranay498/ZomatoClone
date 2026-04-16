import { Request, Response, NextFunction } from "express";
import axios from "axios";
import { Order } from "../models/Order";
import { Cart } from "../models/Cart";
import { Address } from "../models/Address";
import { asyncHandler } from "../utils/asyncHandler";
import { AppError } from "../utils/AppError";
import { Restaurant } from "../models/Restaurnent";
import { publishEvent } from "../config/order.publisher";

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

    const subtotal = cart.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const deliveryFee = subtotal > 299 ? 0 : 40;
    const platformFee = 5;
    const gst = Math.round(subtotal * 0.05);
    const calculatedTotal = subtotal + deliveryFee + platformFee + gst;

    if (calculatedTotal !== totalAmount)
      return next(new AppError(`Total mismatch: calculated ${calculatedTotal}, received ${totalAmount}`, 400));

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
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// FETCH ORDER FOR PAYMENT (Internal)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export const fetchOrderForPayment = asyncHandler(
  async (req: Request, res: Response) => {
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
    const order = await Order.findById(id);

    if (!order) throw new AppError("Order not found", 404);

    if (order.paymentStatus === "paid") throw new AppError("Order already paid", 400);

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
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// FETCH RESTAURANT ORDERS (Restaurant Owner)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export const fetchRestaurantOrders = asyncHandler(
  async (req: any, res: Response, next: NextFunction) => {
    const userId = req.userId;
    const restaurantId = req.restaurantId || req.params.restaurantId;

    console.log("📋 [Fetch Orders] Request received");
    console.log("  Owner ID:", userId);
    console.log("  Restaurant ID:", restaurantId);

    if (!userId) return next(new AppError("Unauthorized - Missing user ID", 401));
    if (!restaurantId) return next(new AppError("Unauthorized - Missing restaurant ID", 403));

    const restaurant = await Restaurant.findOne({ _id: restaurantId, ownerId: userId });
    if (!restaurant) return next(new AppError("Forbidden - You do not own this restaurant", 403));

    const { limit } = req.query;

    const allOrders = await Order.find({ restaurantId });
    console.log(`🔎 [Fetch Orders] Total orders (all statuses): ${allOrders.length}`);
    allOrders.forEach(o =>
      console.log(`  -> Order ${o._id}: status=${o.status}, paymentStatus=${o.paymentStatus}, method=${o.paymentMethod}`)
    );

    const orders = await Order.find({ restaurantId, paymentStatus: "paid" })
      .sort({ createdAt: -1 })
      .limit(Number(limit) || 50);

    console.log(`✅ [Fetch Orders] Found ${orders.length} paid orders for restaurant ${restaurantId}`);

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

    if (!userId) return next(new AppError("Unauthorized - Missing user ID", 401));
    if (!orderId || !status) return next(new AppError("orderId and status are required", 400));

    const validStatuses = ["accepted", "preparing", "ready_for_rider"];
    if (!validStatuses.includes(status))
      return next(new AppError("Invalid status value", 400));

    const order = await Order.findOne({ _id: orderId });
    if (!order) return next(new AppError("Order not found", 404));

    const restaurant = await Restaurant.findOne({ _id: order.restaurantId, ownerId: userId });
    if (!restaurant) return next(new AppError("Unauthorized - You don't own this order's restaurant", 403));

    const restaurantId = restaurant._id;

    if (order.paymentStatus !== "paid")
      return next(new AppError("Cannot update unpaid order", 400));

    order.status = status;
    const updatedOrder = await order.save();

    console.log(`✅ [Update Order Status] Order ${orderId} updated to ${status}`);

    // 📡 Real-time events to both Restaurant and Customer
    const notifyParties = async () => {
      const notifications = [
        { room: `restaurant:${restaurantId}`, label: "Restaurant" },
        { room: updatedOrder.userId.toString(), label: "Customer" }
      ];

      for (const party of notifications) {
        try {
          await axios.post(
            `${process.env.REALTIME_SERVICE_URL}/internal/notify`,
            {
              event: "ORDER_STATUS_UPDATED",
              room: party.room,
              payload: {
                orderId: updatedOrder._id,
                status: updatedOrder.status,
                restaurantId,
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
          console.log(`📡 [Update Order Status] ${party.label} notified — ${status}`);
        } catch (error: any) {
          console.error(`❌ [Update Order Status] Failed to notify ${party.label}:`, error.message);
        }
      }
    };

    notifyParties();

    // 🚀 Publish to RabbitMQ → Rider Service when order is ready for pickup
    if (status === "ready_for_rider") {
      try {
        await publishEvent("ORDER_READY", {
          orderId: updatedOrder._id.toString(),
          restaurantId: updatedOrder.restaurantId?.toString() || "",
          restaurantName: restaurant.name || "Restaurant",
          restaurantLocation: restaurant.autoLocation, // 📍 Added restaurant location for rider search
          deliveryAddress: updatedOrder.deliveryAddress,
          totalAmount: updatedOrder.totalAmount,
          items: updatedOrder.items.map((item: any) => ({
            itemId: item.itemId.toString(),
            name: item.name,
            price: item.price,
            quantity: item.quantity,
          })),
        });
        console.log(`🚀 [Update Order Status] ORDER_READY published to RabbitMQ`);
      } catch (error: any) {
        console.error(`❌ [Update Order Status] Failed to publish ORDER_READY:`, error.message);
      }
    }

    return res.status(200).json({
      success: true,
      message: `Order status updated to ${status}`,
      data: updatedOrder,
    });
  }
);
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// GET MY ORDERS (Customer)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export const getMyOrders = asyncHandler(
  async (req: any, res: Response, next: NextFunction) => {
    const userId = req.userId;

    if (!userId) return next(new AppError("Unauthorized - Missing user ID", 401));

    const orders = await Order.find({ userId, paymentStatus: "paid" }).sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      data: orders,
    });
  }
);
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// FETCH SINGLE ORDER (Customer)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export const fetchSingleOrder = asyncHandler(
  async (req: any, res: Response, next: NextFunction) => {
    const userId = req.userId;
    const { orderId } = req.params;

    if (!userId) return next(new AppError("Unauthorized - Missing user ID", 401));
    if (!orderId) return next(new AppError("orderId is required", 400));

    const order = await Order.findOne({ _id: orderId, userId });

    if (!order) return next(new AppError("Order not found or not authorized", 404));

    if (order.userId.toString() !== userId)
      return next(new AppError("Unauthorized - You can only access your own orders", 403));

    return res.status(200).json({
      success: true,
      data: order,
    });
  }
);
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ASSIGN RIDER TO ORDER (Internal — called by Rider Service)
// POST /orders/assign-rider
// Headers: x-internal-key
// Body: { orderId, riderId, riderName, riderPhone }
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export const assignRiderToOrder = asyncHandler(
  async (req: any, res: Response, next: NextFunction) => {

    // 🔐 Internal service key check
    const receivedKey = req.headers["x-internal-key"];
    const expectedKey = process.env.INTERNAL_SERVICE_KEY;

    console.log("🟡 [assignRiderToOrder] Security check:");
    console.log("  Received x-internal-key:", receivedKey ? "present" : "missing");
    console.log("  Match:", receivedKey === expectedKey ? "✅" : "❌");

    if (receivedKey !== expectedKey) {
      console.error("❌ [assignRiderToOrder] Forbidden - key mismatch");
      throw new AppError("Forbidden", 403);
    }

    const { orderId, riderId, riderName, riderPhone } = req.body;

    if (!orderId || !riderId || !riderName || !riderPhone) {
      return next(new AppError("orderId, riderId, riderName and riderPhone are required", 400));
    }

    // 🔍 Pre-flight checks
    const order = await Order.findById(orderId);
    if (!order) throw new AppError("Order not found", 404);

    if (order.riderId) throw new AppError("A rider is already assigned to this order", 400);

    if (order.status !== "ready_for_rider") {
      throw new AppError(
        `Cannot assign rider — order status is "${order.status}", expected "ready_for_rider"`,
        400
      );
    }

    // ==========================================
    // 🚨 NEW ADDITION: Block multiple active orders for a single rider
    // ==========================================
    const activeRiderOrder = await Order.findOne({
      riderId,
      status: { $in: ["rider_assigned", "picked_up"] }
    });

    if (activeRiderOrder) {
      throw new AppError("This rider is currently on an active delivery. Cannot assign.", 409);
    }

    // ✅ Atomic update — guards against race condition (two riders accepting at the same time)
    const updatedOrder = await Order.findOneAndUpdate(
      { _id: orderId, status: "ready_for_rider", riderId: null },
      {
        $set: {
          riderId,
          riderName,
          riderPhone,
          status: "rider_assigned",
        },
      },
      { new: true }
    );

    if (!updatedOrder) {
      // Another rider grabbed it between the check and update
      throw new AppError("Order was just assigned to another rider", 409);
    }

    console.log(`✅ [assignRiderToOrder] Rider ${riderId} assigned to order ${orderId}`);

    // 📡 Notify BOTH Customer and Restaurant via Realtime Service
    const notifyPartiesAssign = async () => {
      const notifications = [
        { room: updatedOrder.userId.toString(), label: "Customer" },
        { room: `restaurant:${updatedOrder.restaurantId}`, label: "Restaurant" }
      ];

      for (const party of notifications) {
        try {
          await axios.post(
            `${process.env.REALTIME_SERVICE_URL}/internal/notify`,
            {
              event: "ORDER_STATUS_UPDATED",
              room: party.room,
              payload: {
                orderId: updatedOrder._id,
                status: updatedOrder.status,
                riderId,
                riderName,
                riderPhone,
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
          console.log(`📡 [assignRiderToOrder] ${party.label} notified via Socket.IO`);
        } catch (error: any) {
          console.error(`❌ [assignRiderToOrder] Failed to notify ${party.label}:`, error.message);
        }
      }
    };

    notifyPartiesAssign();

    return res.status(200).json({
      success: true,
      message: "Rider assigned to order",
      data: updatedOrder,
    });
  }
);
export const getCurrentOrderForRider = asyncHandler(
  async (req: any, res: Response, next: NextFunction) => {


    const riderId = req.headers["x-user-id"]

    if (!riderId) return next(new AppError("Unauthorized - Missing user ID", 401));

    const order = await Order.findOne({
      riderId,
      status: { $ne: "delivered" },
    }).populate("restaurantId");

    // Order Service expected 404 behavior if no order is found
    if (!order) return next(new AppError("No current order found", 404));

    return res.status(200).json({
      success: true,
      data: order,
    });
  }
);
export const updateOrderStatusRider = asyncHandler(
  async (req: any, res: Response, next: NextFunction) => {

    // 🔐 1. Internal service key check (MUST HAVE FOR MICROSERVICES)
    const receivedKey = req.headers["x-internal-key"];
    const expectedKey = process.env.INTERNAL_SERVICE_KEY;

    if (receivedKey !== expectedKey) {
      console.error("❌ [updateOrderStatusRider] Forbidden - key mismatch");
      throw new AppError("Forbidden", 403);
    }

    // 🚨 2. MICROSERVICE FIX: ID Header Check
    const riderId = req.headers["x-user-id"] || req.userId;
    const { orderId, status } = req.body;

    console.log("🚴 [Rider Status Update] Request received");
    console.log("  Rider ID:", riderId);
    console.log("  Order ID:", orderId);
    console.log("  New Status:", status);

    if (!riderId) return next(new AppError("Unauthorized - Missing user ID", 401));
    if (!orderId || !status) return next(new AppError("orderId and status are required", 400));

    // ✅ Only allow rider-specific statuses
    const validStatuses = ["picked_up", "delivered"];
    if (!validStatuses.includes(status))
      return next(new AppError(`Invalid status. Allowed: ${validStatuses.join(", ")}`, 400));

    const order = await Order.findById(orderId);
    if (!order) return next(new AppError("Order not found", 404));

    // 🔐 Verify the rider owns this order
    if (!order.riderId || order.riderId.toString() !== riderId)
      return next(new AppError("Unauthorized - This order is not assigned to you", 403));

    order.status = status;
    const updatedOrder = await order.save();

    console.log(`✅ [Rider Status Update] Order ${orderId} updated to ${status}`);

    // 📡 Notify BOTH Customer and Restaurant via Realtime Service
    const notifyPartiesRiderUpdate = async () => {
      const notifications = [
        { room: updatedOrder.userId.toString(), label: "Customer" },
        { room: `restaurant:${updatedOrder.restaurantId}`, label: "Restaurant" }
      ];

      for (const party of notifications) {
        try {
          await axios.post(
            `${process.env.REALTIME_SERVICE_URL}/internal/notify`,
            {
              event: "ORDER_STATUS_UPDATED",
              room: party.room,
              payload: {
                orderId: updatedOrder._id,
                status: updatedOrder.status,
                riderId,
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
          console.log(`📡 [Rider Status Update] ${party.label} notified — ${status}`);
        } catch (error: any) {
          console.error(`❌ [Rider Status Update] Failed to notify ${party.label}:`, error.message);
        }
      }
    };

    notifyPartiesRiderUpdate();

    return res.status(200).json({
      success: true,
      message: `Order status updated to ${status}`,
      data: updatedOrder,
    });
  }
);

