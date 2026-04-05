/**
 * services/api.ts
 * ─────────────────────────────────────────────────────────────────
 * Single source of truth for ALL backend API calls.
 * Each function maps to exactly ONE backend route.
 * ─────────────────────────────────────────────────────────────────
 */

import apiClient from "./apiClient"; // axios instance with baseURL + credentials

// ══════════════════════════════════════════════════════════════════
//  TYPES
// ══════════════════════════════════════════════════════════════════

export interface AddressPayload {
  fullAddress: string;
  addressLine2?: string;
  landmark?: string;
  city: string;
  state: string;
  pincode: string;
  addressType: "home" | "work" | "other";
  coordinates: { lat: number; lng: number } | null;
  phoneNumber: string;
}

export interface ValidateAddressResponse {
  success: boolean;
  message?: string;
  addressId?: string; // MongoDB _id — pass to createOrder
}

export interface CreateOrderPayload {
  addressId: string;
  restaurantId: string;
  items: {
    menuItemId: string;
    name: string;
    price: number;
    quantity: number;
    imageUrl?: string;
  }[];
  paymentMethod: "cod" | "upi" | "card";
  subtotal: number;
  deliveryFee: number;
  platformFee: number;
  gst: number;
  tip: number;
  totalAmount: number;
  userPhone?: string;
  deliveryAddress: {
    fullAddress: string;
    addressLine2?: string;
    landmark?: string;
    city: string;
    state: string;
    pincode: string;
    addressType: "home" | "work" | "other";
    coordinates?: { lat: number; lng: number } | null;
  };
}

export interface CreateOrderResponse {
  success: boolean;
  orderId?: string;   // MongoDB _id — store this, use for payment
  status?: string;    // "pending"
  message?: string;
}

export interface RazorpayOrderResponse {
  success: boolean;
  orderId?: string;   // Razorpay order_id "order_xxx"
  amount?: number;    // paise
  currency?: string;
  message?: string;
}

export interface VerifyPaymentResponse {
  success: boolean;
  message?: string;
}

export interface OrderStatusResponse {
  success: boolean;
  order?: {
    _id: string;
    status: "pending" | "placed" | "rider_assigned" | "picked_up" | "delivered" | "cancelled";
    paymentStatus: "pending" | "paid" | "failed" | "refunded";
  };
}

// ══════════════════════════════════════════════════════════════════
//  ADDRESS  ←  Step1_AddressPage.tsx
// ══════════════════════════════════════════════════════════════════

/**
 * POST /api/v1/user/address/validate
 * Validates + saves delivery address.
 * Returns addressId — store in sessionStorage for next steps.
 */
export async function validateAndSaveAddress(
  payload: AddressPayload
): Promise<ValidateAddressResponse> {
  const res = await apiClient.post("/user/address/validate", payload);
  return res.data;
}

/**
 * Reverse geocode lat/lng → address using OpenStreetMap.
 * Free. No API key needed.
 */
export async function reverseGeocodeLatLng(lat: number, lng: number): Promise<{
  displayName: string;
  city: string;
  state: string;
  pincode: string;
}> {
  const res = await fetch(
    `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`,
    { headers: { "Accept-Language": "en-US,en;q=0.9" } }
  );
  const d = await res.json();
  return {
    displayName: d?.display_name ?? "",
    city:    d?.address?.city ?? d?.address?.town ?? d?.address?.village ?? "",
    state:   d?.address?.state ?? "",
    pincode: d?.address?.postcode ?? "",
  };
}

// ══════════════════════════════════════════════════════════════════
//  ORDER  ←  Step2_OrderSummaryPage.tsx
// ══════════════════════════════════════════════════════════════════

/**
 * POST /api/v1/orders/create
 *
 * RULES:
 *   - Called ONCE, from OrderSummaryPage when user clicks "Proceed to Payment"
 *   - Creates order with status="pending", paymentStatus="pending"
 *   - Returns orderId — stored in sessionStorage
 *   - NEVER call this again after payment starts
 */
export async function createOrder(
  payload: CreateOrderPayload
): Promise<CreateOrderResponse> {
  const res = await apiClient.post("/orders/create", payload);
  return res.data;
}

/**
 * GET /api/v1/orders/:orderId
 * Poll this after payment verify to confirm RabbitMQ consumer updated order.
 */
export async function getOrderStatus(
  orderId: string
): Promise<OrderStatusResponse> {
  const res = await apiClient.get(`/orders/${orderId}`);
  return res.data;
}

// ══════════════════════════════════════════════════════════════════
//  COD  ←  Step3_PaymentPage.tsx
// ══════════════════════════════════════════════════════════════════

/**
 * POST /api/v1/orders/confirm-cod
 *
 * COD ONLY. Sets status="placed".
 * Backend also publishes ORDER_CREATED event to RabbitMQ
 * so Rider Service can assign a rider.
 */
export async function confirmCODOrder(
  orderId: string
): Promise<{ success: boolean; message?: string }> {
  const res = await apiClient.post("/orders/confirm-cod", { orderId });
  return res.data;
}

// ══════════════════════════════════════════════════════════════════
//  RAZORPAY  ←  Step3_PaymentPage.tsx
// ══════════════════════════════════════════════════════════════════

/**
 * POST /api/v1/payment/razorpay/create-order
 *
 * Creates a Razorpay order on backend.
 * Call this BEFORE opening Razorpay modal.
 * NEVER creates/modifies your MongoDB order — only creates Razorpay order.
 */
export async function createRazorpayOrder(
  amount: number
): Promise<RazorpayOrderResponse> {
  const res = await apiClient.post("/payment/razorpay/create-order", { amount });
  return res.data;
}

/**
 * POST /api/v1/payment/razorpay/verify
 *
 * Verifies Razorpay signature AFTER user pays.
 * Backend:
 *   1. Verifies HMAC signature
 *   2. Publishes PAYMENT_SUCCESS to RabbitMQ
 *   3. Order Service consumer sets status="placed", paymentStatus="paid"
 *   4. Rider Service consumer assigns a rider
 *
 * Pass your MongoDB orderId so backend links the payment to the order.
 */
export async function verifyRazorpayPayment(payload: {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
  orderId: string; // your MongoDB orderId — NOT Razorpay's order_id
}): Promise<VerifyPaymentResponse> {
  const res = await apiClient.post("/payment/razorpay/verify", payload);
  return res.data;
}

// ══════════════════════════════════════════════════════════════════
//  CART  ←  Step2_OrderSummaryPage.tsx
// ══════════════════════════════════════════════════════════════════

/**
 * POST /api/v1/cart/sync
 * Syncs local cart to backend before order creation.
 */
export async function syncCart(payload: {
  items: { menuItemId: string; name: string; price: number; quantity: number; imageUrl?: string }[];
}): Promise<{ success: boolean }> {
  const res = await apiClient.post("/cart/sync", payload);
  return res.data;
}

/**
 * DELETE /api/v1/cart/clear
 * Clears backend cart. Call ONLY after order confirmed (COD or payment verified).
 */
export async function clearCart(): Promise<{ success: boolean }> {
  const res = await apiClient.delete("/cart/clear");
  return res.data;
}