import apiClient from "./apiClient"; // your axios instance
import { RiderProfile, CreateOrderPayload, CreateOrderResponse, RazorpayOrderResponse, VerifyPaymentResponse, ConfirmCODResponse, IMenuItem } from "../types";


export async function registerUser(payload: any): Promise<any> {
  const res = await apiClient.post("/auth/register", payload);
  return res.data;
}

/** POST /api/v1/user/address/validate */
export async function validateAndSaveAddress(payload: {
  fullAddress: string;
  addressLine2?: string;
  landmark?: string;
  city: string;
  state: string;
  pincode: string;
  addressType: "home" | "work" | "other";
  coordinates: { lat: number; lng: number } | null;
  phoneNumber: string;
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
    city: d?.address?.city ?? d?.address?.town ?? d?.address?.village ?? "",
    state: d?.address?.state ?? "",
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
  const res = await apiClient.post("/checkout/confirm-cod", { orderId });
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

/**
 * GET /api/v1/orders/seller/:restaurantId
 * Fetch all active orders for the owner's restaurant.
 */
export async function fetchRestaurantOrders(restaurantId: string): Promise<{ success: boolean; data: any[] }> {
  const res = await apiClient.get(`/orders/seller/${restaurantId}`);
  return res.data;
}

/**
 * GET /api/v1/orders/my
 * Fetch all past and active orders for the currently logged in customer.
 */
export async function fetchMyOrders(): Promise<{ success: boolean; data: any[] }> {
  const res = await apiClient.get(`/orders/my`);
  return res.data;
}

/**
 * PUT /api/v1/orders/:orderId/status
 * Update order status inside the restaurant logic.
 */
export async function updateOrderStatus(orderId: string, status: string): Promise<{ success: boolean; data: any; message?: string }> {
  const res = await apiClient.put(`/orders/${orderId}/status`, { status });
  return res.data;
}

// ── PAYMENT ────────────────────────────────────────────────────────

/**
 * POST /api/v1/checkout/razorpay/order
 * Creates a Razorpay order. Call BEFORE opening Razorpay modal.
 * Frontend sends orderId + amount (already calculated with all fees).
 */
export async function createRazorpayOrder(payload: {
  orderId: string;
  amount: number;  // in rupees (₹)
}): Promise<RazorpayOrderResponse> {
  console.log("🔵 API: createRazorpayOrder payload:", payload);
  try {
    const res = await apiClient.post("/checkout/razorpay/order", payload);
    console.log("🟢 API: createRazorpayOrder response:", res.data);
    return res.data;
  } catch (err: any) {
    console.error("❌ API: createRazorpayOrder error:", {
      status: err.response?.status,
      data: err.response?.data,
      message: err.message,
    });
    throw err;
  }
}

/**
 * POST /api/v1/checkout/razorpay/verify
 * Verifies Razorpay HMAC signature.
 * Backend publishes PAYMENT_SUCCESS to RabbitMQ.
 * Rider Service consumer updates order status to "placed", paymentStatus to "paid".
 */
export async function verifyRazorpayPayment(payload: {
  orderId: string;  // YOUR MongoDB orderId
  razorpay_order_id: string;  // Razorpay's order_id
  razorpay_payment_id: string;
  razorpay_signature: string;
}): Promise<VerifyPaymentResponse> {
  console.log("🔵 API: verifyRazorpayPayment payload:", payload);
  try {
    const res = await apiClient.post("/checkout/razorpay/verify", payload);
    console.log("🟢 API: verifyRazorpayPayment response:", res.data);
    return res.data;
  } catch (err: any) {
    console.error("❌ API: verifyRazorpayPayment error:", {
      status: err.response?.status,
      data: err.response?.data,
      message: err.message,
    });
    throw err;
  }
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

export const menuApi = {
  /** GET  /api/v1/menu/restaurant/:restaurantId  — fetch all items for a restaurant */
  getAll: async (restaurantId: string): Promise<IMenuItem[]> => {
    const res = await apiClient.get(`/menu/restaurant/${restaurantId}`);
    return res.data.data;
  },

  /** POST  /api/v1/menu/create  — add a new menu item */
  add: async (restaurantId: string, data: FormData): Promise<IMenuItem> => {
    const res = await apiClient.post(`/menu/create`, data);
    return res.data.data;
  },

  /** DELETE  /api/v1/menu/:itemId  — remove a menu item */
  remove: async (itemId: string): Promise<void> => {
    await apiClient.delete(`/menu/${itemId}`);
  },

  /** PATCH  /api/v1/menu/:itemId/toggle  — toggle availability */
  toggleAvailability: async (itemId: string, isAvailable: boolean): Promise<void> => {
    await apiClient.patch(`/menu/${itemId}/toggle`);
  },
};
/**
 * DELETE /api/v1/cart/clear
 * Clears backend cart. Call ONLY after order confirmed (COD or payment verified).
 */

// ── RIDER ──────────────────────────────────────────────────────────


/**
 * GET /api/v1/riders/profile
 * Fetch the authenticated rider's profile.
 * Returns 404 if no profile exists yet (triggers onboarding form).
 */
export async function fetchRiderProfile(): Promise<{ success: boolean; rider: RiderProfile }> {
  const res = await apiClient.get("/riders/profile");
  return res.data;
}

/**
 * POST /api/v1/riders/profile
 * Create rider profile with optional picture upload (multipart/form-data).
 * Accepts phoneNumber, addharNumber, drivingLicenseNumber, picture, longitude, latitude.
 */
export async function createRiderProfile(formData: FormData): Promise<{ success: boolean; message: string; rider: RiderProfile }> {
  const res = await apiClient.post("/riders/profile", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return res.data;
}

/**
 * PUT /api/v1/riders/availability
 * Toggle rider's isAvailable status. Optionally updates current location.
 */
export async function toggleRiderAvailability(payload: {
  longitude?: number;
  latitude?: number;
}): Promise<{ success: boolean; message: string; rider: RiderProfile }> {
  const res = await apiClient.put("/riders/availability", payload);
  return res.data;
}

/**
 * PUT /api/v1/riders/orders/accept
 * Rider accepts a NEW_ORDER_AVAILABLE notification.
 */
export async function acceptRiderOrder(orderId: string): Promise<{ success: boolean; message: string; data?: any }> {
  const res = await apiClient.put("/riders/orders/accept", { orderId });
  return res.data;
}

/**
 * GET /api/v1/riders/orders/current
 * Fetch the rider's active (non-delivered) order.
 */
export async function getCurrentRiderOrder(): Promise<{ success: boolean; data: any; message?: string }> {
  try {
    const res = await apiClient.get("/riders/orders/current");
    return res.data;
  } catch (error: any) {
    if (error.response?.status === 404) {
      return { success: true, data: null, message: "No active order" };
    }
    throw error;
  }
}

/**
 * PUT /api/v1/riders/orders/status
 * Update order status to "picked_up" or "delivered".
 */
export async function updateRiderOrderStatus(orderId: string, status: "picked_up" | "delivered"): Promise<{ success: boolean; message: string; data?: any }> {
  const res = await apiClient.put("/riders/orders/status", { orderId, status });
  return res.data;
}

// ── ADMIN ──────────────────────────────────────────────────────────

export async function fetchPendingRestaurants(): Promise<{ success: boolean; data: any[] }> {
  const res = await apiClient.get("/admin/restaurants/pending");
  return res.data;
}

export async function verifyRestaurant(id: string): Promise<{ success: boolean; message: string }> {
  const res = await apiClient.patch(`/admin/restaurants/${id}/verify`);
  return res.data;
}

export async function fetchPendingRiders(): Promise<{ success: boolean; data: any[] }> {
  const res = await apiClient.get("/admin/riders/pending");
  return res.data;
}

export async function verifyRider(id: string): Promise<{ success: boolean; message: string }> {
  const res = await apiClient.patch(`/admin/riders/${id}/verify`);
  return res.data;
}
