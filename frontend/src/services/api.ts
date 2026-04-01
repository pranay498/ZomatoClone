
import apiClient from "./apiClient";

// ── TYPES ────────────────────────────────────────────────────

export interface AddressPayload {
    fullAddress: string;
    addressLine2: string;
    landmark: string;
    city: string;
    state: string;
    pincode: string;
    addressType: "home" | "work" | "other";
    coordinates: { lat: number; lng: number } | null;
}

export interface PaymentPayload {
    paymentMethod: "cod" | "upi" | "card";
    orderId?: string;
}

export interface ValidateAddressResponse {
    success: boolean;
    message?: string;
    addressId?: string;
}

export interface SavePaymentResponse {
    success: boolean;
    message?: string;
    checkoutToken?: string;
}

// ── ADDRESS API ───────────────────────────────────────────────

// ✅ Validate + Save Address
export async function validateAndSaveAddress(
    payload: AddressPayload
): Promise<ValidateAddressResponse> {
    const res = await apiClient.post(
        "/user/address/validate",
        payload,
        {
            withCredentials: true, // if using cookies
        }
    );

    return res.data;
}

// ✅ Get Saved Addresses
export async function getSavedAddresses(): Promise<{
    success: boolean;
    addresses: AddressPayload[];
}> {
    const res = await apiClient.get("/user/address/saved", {
        withCredentials: true,
    });

    return res.data;
}

// ── PAYMENT API ───────────────────────────────────────────────

// ✅ Save Payment Method
export async function savePaymentMethod(
    payload: PaymentPayload
): Promise<SavePaymentResponse> {
    const res = await apiClient.post(
        "/checkout/payment/select",
        payload,
        {
            withCredentials: true,
        }
    );

    return res.data;
}

// ── RAZORPAY API ──────────────────────────────────────────────

export interface RazorpayOrderResponse {
    success: boolean;
    orderId: string;
    amount: number;
    currency: string;
}

export interface RazorpayVerifyPayload {
    razorpay_order_id: string;
    razorpay_payment_id: string;
    razorpay_signature: string;
}

export interface RazorpayVerifyResponse {
    success: boolean;
    message: string;
    paymentId?: string;
}

export async function createRazorpayOrder(amount: number): Promise<RazorpayOrderResponse> {
    const res = await apiClient.post("/checkout/razorpay/order", { amount }, { withCredentials: true });
    return res.data;
}

export async function verifyRazorpayPayment(payload: RazorpayVerifyPayload): Promise<RazorpayVerifyResponse> {
    const res = await apiClient.post("/checkout/razorpay/verify", payload, { withCredentials: true });
    return res.data;
}


export async function reverseGeocodeLatLng(
    lat: number,
    lng: number
): Promise<{
    displayName: string;
    city: string;
    state: string;
    pincode: string;
}> {
    const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`,
        {
            headers: { "Accept-Language": "en-US,en;q=0.9" },
        }
    );

    const data = await res.json();

    return {
        displayName: data?.display_name ?? "",
        city:
            data?.address?.city ||
            data?.address?.town ||
            data?.address?.village ||
            "",
        state: data?.address?.state ?? "",
        pincode: data?.address?.postcode ?? "",
    };
}