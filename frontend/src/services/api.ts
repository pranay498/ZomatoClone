/**
 * services/api.ts
 * ─────────────────────────────────────────────────────────────────
 * Single source of truth for ALL backend API calls.
 * Each function maps to exactly ONE backend route.
 * ─────────────────────────────────────────────────────────────────
 */
/**
 * services/api.ts
 * All backend API calls. One function = one route.
 */

import apiClient from "./apiClient"; // your axios instance

// ── TYPES ──────────────────────────────────────────────────────────

export interface CreateOrderPayload {
  addressId:     string;
  paymentMethod: "cod" | "upi" | "card";
  totalAmount:   number;  // must match backend cart calculation
  userPhone?:    string;
  restaurantId:  string;
}

export interface CreateOrderResponse {
  success:   boolean;
  orderId?:  string;  // MongoDB _id — use for all subsequent calls
  status?:   string;  // "pending"
  message?:  string;
}

export interface RazorpayOrderResponse {
  success:   boolean;
  orderId?:  string;  // Razorpay order_id e.g. "order_abc123"
  amount?:   number;  // in paise
  currency?: string;
  message?:  string;
}

export interface VerifyPaymentResponse {
  success:  boolean;
  message?: string;
}

export interface ConfirmCODResponse {
  success:  boolean;
  message?: string;
}

// ── ADDRESS ────────────────────────────────────────────────────────

/** POST /api/v1/user/address/validate */
export async function validateAndSaveAddress(payload: {
  fullAddress:  string;
  addressLine2?: string;
  landmark?:    string;
  city:         string;
  state:        string;
  pincode:      string;
  addressType:  "home" | "work" | "other";
  coordinates:  { lat: number; lng: number } | null;
  phoneNumber:  string;
}): Promise<{ success: boolean; message?: string; addressId?: string }> {
  const res = await apiClient.post("/user/address/validate", payload);
  return res.data;
}

export async function reverseGeocodeLatLng(lat: number, lng: number) {
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

// ── ORDER ──────────────────────────────────────────────────────────

/**
 * POST /api/v1/orders/create
 *
 * Called ONCE on CheckoutPage mount.
 * Backend reads cart from DB — frontend only sends addressId + paymentMethod + total.
 * Returns orderId. Store it in state. Never call this again.
 */
export async function createOrder(
  payload: CreateOrderPayload
): Promise<CreateOrderResponse> {
  const res = await apiClient.post("/orders/create", payload);
  return res.data;
}

/**
 * POST /api/v1/orders/confirm-cod
 * COD only. Sets status="placed". Publishes ORDER_CREATED to RabbitMQ.
 */
export async function confirmCODOrder(
  orderId: string
): Promise<ConfirmCODResponse> {
  const res = await apiClient.post("/orders/confirm-cod", { orderId });
  return res.data;
}

/**
 * GET /api/v1/orders/:orderId
 * Poll after payment verify to confirm RabbitMQ consumer updated status.
 */
export async function getOrderStatus(orderId: string) {
  const res = await apiClient.get(`/orders/${orderId}`);
  return res.data as {
    success: boolean;
    order?: { status: string; paymentStatus: string };
  };
}

// ── PAYMENT ────────────────────────────────────────────────────────

/**
 * POST /api/v1/payment/create-order
 * Creates a Razorpay order. Call BEFORE opening Razorpay modal.
 * Does NOT touch your MongoDB order.
 */
export async function createRazorpayOrder(
  amount: number  // in paise (₹1 = 100 paise)
): Promise<RazorpayOrderResponse> {
  const res = await apiClient.post("/payment/create-order", { amount });
  return res.data;
}

/**
 * POST /api/v1/payment/verify
 * Verifies Razorpay HMAC signature.
 * Backend publishes PAYMENT_SUCCESS to RabbitMQ.
 * Order Service consumer sets status="placed", paymentStatus="paid".
 */
export async function verifyRazorpayPayment(payload: {
  orderId:             string;  // YOUR MongoDB orderId
  razorpay_order_id:   string;  // Razorpay's order_id
  razorpay_payment_id: string;
  razorpay_signature:  string;
}): Promise<VerifyPaymentResponse> {
  const res = await apiClient.post("/payment/verify", payload);
  return res.data;
}

// ── CART ───────────────────────────────────────────────────────────

/** DELETE /api/v1/cart/clear — call ONLY after success */
export async function clearCart(): Promise<{ success: boolean }> {
  const res = await apiClient.delete("/cart/clear");
  return res.data;
}

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
