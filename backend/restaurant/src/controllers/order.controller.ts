import { Request, Response, NextFunction } from "express";
import { Order } from "../models/Order";
import { Cart } from "../models/Cart";
import { Address } from "../models/Address";
import { asyncHandler } from "../utils/asyncHandler";
import { AppError } from "../utils/AppError";

export const createOrder = asyncHandler(
async (req: Request, res: Response, next: NextFunction) => {
const userId = (req as any).userId;


// ✅ GUARD 1: Auth check
if (!userId) {
  return next(new AppError("Unauthorized - User ID missing", 401));
}

const { addressId, paymentMethod, totalAmount, userPhone } = req.body;

console.log("🟢 createOrder - userId:", userId);
console.log("🟢 Request body:", { addressId, paymentMethod, totalAmount });

// ✅ GUARD 2: Basic validation
if (!addressId) {
  return next(new AppError("addressId is required", 400));
}

if (!paymentMethod || !["cod", "upi", "card"].includes(paymentMethod)) {
  return next(new AppError("Invalid payment method", 400));
}

if (!totalAmount || totalAmount <= 0) {
  return next(new AppError("Invalid total amount", 400));
}

// ✅ Phone validation
if (userPhone && !/^\d{10}$/.test(String(userPhone))) {
  return next(new AppError("Invalid phone number", 400));
}

// ✅ GUARD 3: Address verify (VERY IMPORTANT)
const address = await Address.findOne({
  _id: addressId,
  userId,
});

if (!address) {
  return next(
    new AppError(
      "Address not found or not authorized",
      403
    )
  );
}

// ✅ GUARD 4: Fetch cart (NO populate ❌)
const cart = await Cart.findOne({ userId });

if (!cart || cart.items.length === 0) {
  return next(new AppError("Cart is empty", 400));
}

console.log("🟢 Cart items:", cart.items.length);

// ✅ FIXED: Correct mapping (NO menuItem ❌)
const orderItems = cart.items.map((item: any) => ({
  itemId: item.menuItemId,   // ✅ correct
  name: item.name,
  price: item.price,
  quantity: item.quantity,
}));

// ✅ Payment logic
const paymentStatus =
  paymentMethod === "cod" ? "pending" : "paid";

// ✅ Delivery address formatting
const deliveryAddress = {
  formattedAddress: [
    address.fullAddress,
    address.addressLine2,
    address.landmark,
  ]
    .filter(Boolean)
    .join(", "),
  mobile: userPhone ? parseInt(userPhone) : 0,
  latitude: address.coordinates?.lat ?? 0,
  longitude: address.coordinates?.lng ?? 0,
};

console.log("🟢 Creating order...");

// ✅ Create order
const newOrder = new Order({
  userId,
  restaurantId: cart.restaurantId,
  restaurantName: cart.restaurantName || "Restaurant",
  items: orderItems,
  addressId,
  deliveryAddress,
  paymentMethod,
  paymentStatus,
  status: "placed",
  totalAmount,
  riderId: null,
  riderName: null,
  riderPhone: null,
});

const savedOrder = await newOrder.save();

console.log("🟢 Order created:", savedOrder._id);

// ✅ Clear cart
await Cart.findOneAndDelete({ userId });

res.status(201).json({
  success: true,
  message: "Order placed successfully",
  data: {
    orderId: savedOrder._id,
    totalAmount: savedOrder.totalAmount,
    status: savedOrder.status,
  },
});
});
