import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useApp } from "../Context/MainContext";
import { ICartItem } from "../types";
import apiClient from "../services/apiClient";
import { createRazorpayOrder, verifyRazorpayPayment } from "../services/api";

// ── Checkout data interface ──
interface CheckoutData {
  addressId: string; // Changed: MongoDB ObjectId of saved address
  paymentMethod: "cod" | "upi" | "card";
  addressLine1?: string; // For reference/backup
  addressLine2?: string;
  landmark?: string;
  city?: string;
  state?: string;
  pincode?: string;
  addressType?: "home" | "work" | "other";
  lat?: number;
  lng?: number;
  phoneNumber?: string;
}

// ── Styling constants ──────────────────────────────────────────────
const gold = "#d4af64";
const goldBorder = "rgba(212,175,100,0.25)";
const goldFaint = "rgba(212,175,100,0.06)";
const textMuted = "rgba(200,175,130,0.5)";
const textBody = "rgba(200,175,130,0.7)";
const cardBg = "linear-gradient(155deg, rgba(20,15,7,0.98) 0%, rgba(11,8,3,0.99) 100%)";

const CHECKOUT_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;500;600&family=DM+Sans:wght@300;400;500;600&display=swap');
  @keyframes shimmer { 0%{background-position:0% center;} 100%{background-position:200% center;} }
  @keyframes drift1  { 0%,100%{transform:translate(0,0);} 50%{transform:translate(28px,-20px);} }
  @keyframes drift2  { 0%,100%{transform:translate(0,0);} 50%{transform:translate(-22px,-26px);} }
  @keyframes fadeUp  { from{opacity:0;transform:translateY(14px);} to{opacity:1;transform:translateY(0);} }
  @keyframes spin    { to{transform:rotate(360deg);} }
  @keyframes pulse   { 0%,100%{opacity:1;} 50%{opacity:0.4;} }
  @keyframes checkmark { from{stroke-dashoffset:24;} to{stroke-dashoffset:0;} }
  .co-root *, .co-root *::before, .co-root *::after { box-sizing: border-box; margin: 0; padding: 0; }
  .co-input:focus { border-bottom-color: rgba(212,175,100,0.7) !important; outline: none; }
  .co-input::placeholder { color: rgba(200,180,140,0.22); font-style: italic; }
  .co-input:-webkit-autofill { -webkit-box-shadow: 0 0 0 1000px #0d0a05 inset !important; -webkit-text-fill-color: #f0e6cc !important; }
  .payment-option { transition: all 0.25s ease; cursor: pointer; }
  .payment-option:hover { border-color: rgba(212,175,100,0.5) !important; background: rgba(212,175,100,0.06) !important; }
  .cart-item-row { transition: all 0.2s ease; }
  .cart-item-row:hover { background: rgba(212,175,100,0.04) !important; }
`;

const inputStyle: React.CSSProperties = {
  width: "100%", background: "transparent", border: "none",
  borderBottom: `1px solid ${goldBorder}`,
  padding: "10px 0", color: "#f0e6cc",
  fontFamily: "'DM Sans', sans-serif", fontSize: 14, fontWeight: 300,
  letterSpacing: "0.04em", caretColor: gold,
  outline: "none", transition: "border-color 0.3s",
};

const labelStyle: React.CSSProperties = {
  display: "block", fontSize: 10, letterSpacing: "0.2em",
  textTransform: "uppercase", color: "rgba(200,175,130,0.45)",
  marginBottom: 8, fontWeight: 500,
};

type PaymentMethod = "cod" | "upi" | "card";

interface CartData {
  items: ICartItem[];
  restaurantName?: string;
  restaurantId?: string;
}

const Spinner = ({ size = 16 }: { size?: number }) => (
  <svg style={{ animation: "spin 0.8s linear infinite", flexShrink: 0 }} width={size} height={size} viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" opacity="0.2" />
    <path d="M12 2a10 10 0 0110 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
  </svg>
);

// ── Corner brackets component ──
const CornerBrackets = () => (
  <>
    {[
      { top: 0, left: 0, borderTop: `1px solid ${goldBorder}`, borderLeft: `1px solid ${goldBorder}` },
      { top: 0, right: 0, borderTop: `1px solid ${goldBorder}`, borderRight: `1px solid ${goldBorder}` },
      { bottom: 0, left: 0, borderBottom: `1px solid ${goldBorder}`, borderLeft: `1px solid ${goldBorder}` },
      { bottom: 0, right: 0, borderBottom: `1px solid ${goldBorder}`, borderRight: `1px solid ${goldBorder}` },
    ].map((s, i) => (
      <div key={i} style={{ position: "absolute", width: 20, height: 20, ...s, zIndex: 2 }} />
    ))}
  </>
);

// ── Section Header ──
const SectionHeader: React.FC<{ icon: React.ReactNode; title: string; step: number }> = ({ icon, title, step }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 20 }}>
    <div style={{
      width: 32, height: 32, borderRadius: "50%",
      background: "rgba(212,175,100,0.08)",
      border: `1px solid ${goldBorder}`,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: 12, color: gold, fontWeight: 600,
      fontFamily: "'Playfair Display', serif",
    }}>
      {step}
    </div>
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <span style={{ color: gold }}>{icon}</span>
      <h3 style={{
        fontFamily: "'Playfair Display', serif",
        fontSize: 18, fontWeight: 500, color: "#f0e6cc",
      }}>
        {title}
      </h3>
    </div>
    <div style={{ flex: 1, height: 1, background: "rgba(212,175,100,0.1)" }} />
  </div>
);

// ── Razorpay Script Loader ──
function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if ((window as any).Razorpay) return resolve(true);
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

const CheckoutPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useApp();

  const [cartData, setCartData] = useState<CartData | null>(null);
  const [checkoutData, setCheckoutData] = useState<CheckoutData | null>(null);
  const [ready, setReady] = useState(false);
  const [placing, setPlacing] = useState(false);
  const [orderPlaced, setOrderPlaced] = useState(false);
  const [paymentProcessing, setPaymentProcessing] = useState(false);

  // Tip
  const [tip, setTip] = useState(0);
  const tipOptions = [0, 20, 30, 50];

  // ── Load cart and address/payment data ──
  useEffect(() => {
    try {
      // Load cart
      const raw = localStorage.getItem("checkoutCart");
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed?.items?.length > 0) {
          setCartData(parsed);
        } else {
          navigate("/address-payment");
          return;
        }
      } else {
        navigate("/address-payment");
        return;
      }

      // Load address and payment data
      const savedCheckout = sessionStorage.getItem("checkoutAddressPayment");
      if (savedCheckout) {
        const parsed = JSON.parse(savedCheckout) as CheckoutData;
        setCheckoutData(parsed);
      } else {
        navigate("/address-payment");
        return;
      }
    } catch {
      navigate("/address-payment");
      return;
    }
    setTimeout(() => setReady(true), 60);
  }, []);

  // ── Calculations ──
  const subtotal = useMemo(() =>
    cartData?.items.reduce((sum, i) => sum + i.price * i.quantity, 0) ?? 0
    , [cartData]);

  const deliveryFee = subtotal > 500 ? 0 : 40;
  const platformFee = 5;
  const gstRate = 0.05;
  const gst = Math.round(subtotal * gstRate);
  const grandTotal = subtotal + deliveryFee + platformFee + gst + tip;
  const totalItems = cartData?.items.reduce((sum, i) => sum + i.quantity, 0) ?? 0;

  // ── Razorpay Integration ──
  const handleRazorpayPayment = async (amount: number): Promise<boolean> => {
    return new Promise(async (resolve) => {
      console.log("[Razorpay] Opening payment gateway for amount: ₹" + amount);

      const loaded = await loadRazorpayScript();
      if (!loaded) {
        alert("Razorpay SDK failed to load. Please check your connection.");
        return resolve(false);
      }

      try {
        console.log("🔵 [Razorpay] Creating order on backend...");
        const orderData = await createRazorpayOrder(amount);

        if (!orderData.success) {
          alert("Failed to create Razorpay order");
          return resolve(false);
        }

        const options = {
          key: (import.meta as any).env.VITE_RAZORPAY_KEY_ID || "rzp_test_placeholder",
          amount: orderData.amount,
          currency: orderData.currency,
          name: "Zomato Clone",
          description: "Food Delivery Payment",
          order_id: orderData.orderId,
          handler: async function (response: any) {
            console.log("🔵 [Razorpay] Payment successful, verifying signature...", response);
            try {
              const verifyRes = await verifyRazorpayPayment({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature
              });

              if (verifyRes.success) {
                console.log("✅ [Razorpay] Verification successful");
                resolve(true);
              } else {
                console.error("❌ [Razorpay] Verification failed:", verifyRes.message);
                resolve(false);
              }
            } catch (err) {
              console.error("❌ [Razorpay] Verification caught error:", err);
              resolve(false);
            }
          },
          prefill: {
            name: user?.firstName || "Guest User",
            email: user?.email || "guest@example.com"
          },
          theme: {
            color: "#d4af64"
          }
        };

        const paymentObject = new (window as any).Razorpay(options);

        paymentObject.on('payment.failed', function (response: any) {
          console.error("❌ [Razorpay] Payment failed event:", response.error);
          resolve(false);
        });

        paymentObject.open();

      } catch (err) {
        console.error("❌ [Razorpay] Payment setup error:", err);
        resolve(false);
      }
    });
  };

  // ── Place Order ──
  const handlePlaceOrder = async () => {
    if (!checkoutData) {
      alert("Address and payment data missing. Please go back.");
      return;
    }

    setPlacing(true);

    try {
      console.log("🛒 [Checkout] Starting order placement...");
      console.log("🛒 [Checkout] Cart items:", cartData?.items);
      console.log("🛒 [Checkout] Restaurant:", cartData?.restaurantName);
      console.log("🛒 [Checkout] Payment method:", checkoutData.paymentMethod);
      console.log("🛒 [Checkout] Delivery address:", checkoutData.addressLine1);
      console.log("🛒 [Checkout] Grand total: ₹" + grandTotal);

      // Handle payment based on method
      if (checkoutData.paymentMethod === "card" || checkoutData.paymentMethod === "upi") {
        setPaymentProcessing(true);
        console.log("🔵 [Checkout] Processing " + checkoutData.paymentMethod.toUpperCase() + " payment...");
        const paymentSuccess = await handleRazorpayPayment(grandTotal);
        setPaymentProcessing(false);

        if (!paymentSuccess) {
          alert("Payment failed. Please try again.");
          setPlacing(false);
          return;
        }
      }

      // Map frontend items to backend format
      const syncPayload = {
        items: cartData?.items.map(item => ({
          menuItemId: item._id,
          name: item.name,
          price: item.price,
          quantity: item.quantity,
          imageUrl: item.imageUrl || undefined,
        })) || [],
      };

      console.log("🔵 [Checkout] Syncing cart to backend...", syncPayload);
      const syncRes = await apiClient.post("/cart/sync", syncPayload);
      console.log("✅ [Checkout] Cart synced successfully:", syncRes.data);

      // Create order with addressId and payment details (improved validation)
      const orderPayload = {
        addressId: checkoutData.addressId, // ← MongoDB ObjectId of saved address
        paymentMethod: checkoutData.paymentMethod,
        totalAmount: grandTotal,
        // userPhone is optional, can be added if we have contact info
      };

      console.log("🔵 [Checkout] Creating order with validated address...", orderPayload);
      const orderRes = await apiClient.post("/orders/create", orderPayload);
      console.log("✅ [Checkout] Order created:", orderRes.data);

      // Clear cart from backend
      console.log("🔵 [Checkout] Clearing cart from backend...");
      const clearRes = await apiClient.delete("/cart/clear");
      console.log("✅ [Checkout] Cart cleared:", clearRes.data);

      // Clear storages
      localStorage.removeItem("checkoutCart");
      sessionStorage.removeItem("checkoutAddressPayment");
      console.log("✅ [Checkout] Storage cleared");

      console.log("🎉 [Checkout] Order placed successfully!");
      setPlacing(false);
      setOrderPlaced(true);
    } catch (err: any) {
      console.error("❌ [Checkout] Order placement failed:", err);
      console.error("❌ [Checkout] Error response:", err.response?.data);
      alert("Failed to place order. Please try again.");
      setPlacing(false);
    }
  };

  // ── Order Success View ──
  if (orderPlaced) {
    return (
      <>
        <style>{CHECKOUT_CSS}</style>
        <div className="co-root" style={{
          minHeight: "100vh", width: "100%", backgroundColor: "#090705",
          background: "radial-gradient(ellipse at 20% 10%, rgba(201,168,76,0.07) 0%, transparent 50%), radial-gradient(ellipse at 80% 90%, rgba(184,134,11,0.06) 0%, transparent 50%), #090705",
          fontFamily: "'DM Sans', system-ui, sans-serif",
          display: "flex", alignItems: "center", justifyContent: "center",
          padding: "40px 16px", position: "relative", overflow: "hidden",
        }}>
          {/* Orbs */}
          <div style={{ position: "absolute", top: "-8%", left: "-4%", width: 480, height: 480, borderRadius: "50%", background: "radial-gradient(circle, rgba(201,168,76,0.1) 0%, transparent 68%)", filter: "blur(50px)", animation: "drift1 14s ease-in-out infinite", pointerEvents: "none" }} />
          <div style={{ position: "absolute", bottom: "-10%", right: "-6%", width: 400, height: 400, borderRadius: "50%", background: "radial-gradient(circle, rgba(184,134,11,0.09) 0%, transparent 68%)", filter: "blur(55px)", animation: "drift2 17s ease-in-out infinite", pointerEvents: "none" }} />

          <div style={{
            position: "relative", textAlign: "center", maxWidth: 440, zIndex: 10,
            animation: "fadeUp 0.6s ease both",
          }}>
            {/* Success checkmark */}
            <div style={{
              width: 80, height: 80, borderRadius: "50%", margin: "0 auto 28px",
              background: "rgba(74,222,128,0.08)",
              border: "2px solid rgba(74,222,128,0.3)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 13l4 4L19 7" style={{ strokeDasharray: 24, animation: "checkmark 0.5s ease 0.3s both" }} />
              </svg>
            </div>

            <h1 style={{
              fontFamily: "'Playfair Display', Georgia, serif",
              fontSize: 32, fontWeight: 500,
              background: "linear-gradient(90deg, #b8860b, #f0d070, #daa520, #c9a84c, #b8860b)",
              backgroundSize: "300% auto", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
              backgroundClip: "text", animation: "shimmer 6s linear infinite",
              marginBottom: 12,
            }}>
              Order Placed!
            </h1>

            <p style={{ color: textBody, fontSize: 14, lineHeight: 1.7, marginBottom: 8 }}>
              Your order has been placed successfully.
            </p>
            <p style={{ color: textMuted, fontSize: 13, marginBottom: 32 }}>
              You'll receive a confirmation shortly.
            </p>

            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, marginBottom: 32 }}>
              <div style={{ height: 1, width: 36, background: "linear-gradient(90deg, transparent, rgba(212,175,100,0.38))" }} />
              <div style={{ width: 4, height: 4, borderRadius: "50%", background: "rgba(212,175,100,0.45)" }} />
              <div style={{ height: 1, width: 36, background: "linear-gradient(90deg, rgba(212,175,100,0.38), transparent)" }} />
            </div>

            {/* Amount summary pill */}
            <div style={{
              display: "inline-flex", alignItems: "center", gap: 12,
              padding: "12px 24px", borderRadius: 3,
              background: "rgba(212,175,100,0.06)",
              border: `1px solid ${goldBorder}`,
              marginBottom: 36,
            }}>
              <span style={{ fontSize: 11, letterSpacing: "0.14em", textTransform: "uppercase", color: textMuted }}>Total Paid</span>
              <span style={{ fontFamily: "'Playfair Display', serif", fontSize: 22, color: gold, fontWeight: 500 }}>₹{grandTotal}</span>
            </div>

            <div style={{ display: "flex", gap: 14, justifyContent: "center" }}>
              <button
                onClick={() => navigate("/")}
                style={{
                  padding: "13px 28px",
                  background: "linear-gradient(135deg, #b8860b 0%, #daa520 40%, #e8c84a 60%, #b8860b 100%)",
                  border: "none", borderRadius: 2,
                  color: "#120d00", fontFamily: "'DM Sans', sans-serif",
                  fontSize: 11, fontWeight: 700, letterSpacing: "0.22em",
                  textTransform: "uppercase", cursor: "pointer",
                  transition: "all 0.3s",
                }}
              >
                Back to Home
              </button>
              <button
                onClick={() => navigate("/orders")}
                style={{
                  padding: "13px 28px",
                  background: "rgba(212,175,100,0.08)",
                  border: `1px solid ${goldBorder}`, borderRadius: 2,
                  color: gold, fontFamily: "'DM Sans', sans-serif",
                  fontSize: 11, fontWeight: 500, letterSpacing: "0.18em",
                  textTransform: "uppercase", cursor: "pointer",
                  transition: "all 0.3s",
                }}
              >
                Track Order
              </button>
            </div>
          </div>
        </div>
      </>
    );
  }

  // ── Main Checkout ──
  return (
    <>
      <style>{CHECKOUT_CSS}</style>

      <div className="co-root" style={{
        minHeight: "100vh", width: "100%", backgroundColor: "#090705",
        background: "radial-gradient(ellipse at 20% 10%, rgba(201,168,76,0.07) 0%, transparent 50%), radial-gradient(ellipse at 80% 90%, rgba(184,134,11,0.06) 0%, transparent 50%), #090705",
        fontFamily: "'DM Sans', system-ui, sans-serif",
        padding: "40px 16px 100px", position: "relative", overflow: "hidden",
      }}>
        {/* Ambient orbs */}
        <div style={{ position: "absolute", top: "-8%", left: "-4%", width: 480, height: 480, borderRadius: "50%", background: "radial-gradient(circle, rgba(201,168,76,0.1) 0%, transparent 68%)", filter: "blur(50px)", animation: "drift1 14s ease-in-out infinite", pointerEvents: "none" }} />
        <div style={{ position: "absolute", bottom: "-10%", right: "-6%", width: 400, height: 400, borderRadius: "50%", background: "radial-gradient(circle, rgba(184,134,11,0.09) 0%, transparent 68%)", filter: "blur(55px)", animation: "drift2 17s ease-in-out infinite", pointerEvents: "none" }} />
        <div style={{ position: "absolute", inset: 0, pointerEvents: "none", opacity: 0.025, backgroundImage: "linear-gradient(rgba(212,175,100,1) 1px, transparent 1px), linear-gradient(90deg, rgba(212,175,100,1) 1px, transparent 1px)", backgroundSize: "64px 64px" }} />

        <div style={{
          position: "relative", zIndex: 10, maxWidth: 900, margin: "0 auto",
          opacity: ready ? 1 : 0, transform: ready ? "translateY(0)" : "translateY(16px)",
          transition: "opacity 0.6s cubic-bezier(.16,1,.3,1), transform 0.6s cubic-bezier(.16,1,.3,1)",
        }}>

          {/* ── Back button ── */}
          <button
            onClick={() => navigate("/address-payment")}
            style={{
              display: "flex", alignItems: "center", gap: 6, marginBottom: 28,
              background: "transparent", border: "none",
              color: "rgba(200,175,130,0.45)", fontFamily: "'DM Sans', sans-serif",
              fontSize: 12, letterSpacing: "0.14em", textTransform: "uppercase",
              cursor: "pointer", padding: 0, transition: "color 0.2s",
            }}
            onMouseEnter={e => (e.currentTarget.style.color = gold)}
            onMouseLeave={e => (e.currentTarget.style.color = "rgba(200,175,130,0.45)")}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
            Edit Address or Payment
          </button>

          {/* ── Header ── */}
          <div style={{ marginBottom: 40 }}>
            <h1 style={{
              fontFamily: "'Playfair Display', Georgia, serif",
              fontSize: "clamp(26px, 4vw, 38px)", fontWeight: 500, lineHeight: 1.15,
              background: "linear-gradient(90deg, #b8860b, #f0d070, #daa520, #c9a84c, #b8860b)",
              backgroundSize: "300% auto", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
              backgroundClip: "text", animation: "shimmer 6s linear infinite",
              marginBottom: 8,
            }}>
              Final Checkout
            </h1>
            <p style={{ fontSize: 13, color: textMuted, letterSpacing: "0.04em" }}>
              {cartData?.restaurantName && <>Ordering from <span style={{ color: gold }}>{cartData.restaurantName}</span> · </>}
              {checkoutData?.addressType && <>Delivering to <span style={{ color: gold }}>{checkoutData.addressType.charAt(0).toUpperCase() + checkoutData.addressType.slice(1)}</span> · </>}
              Step 2 of 2
            </p>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 16 }}>
              <div style={{ height: 1, width: 48, background: "linear-gradient(90deg, transparent, rgba(212,175,100,0.35))" }} />
              <div style={{ width: 4, height: 4, borderRadius: "50%", background: "rgba(212,175,100,0.4)" }} />
              <div style={{ height: 1, width: 48, background: "linear-gradient(90deg, rgba(212,175,100,0.35), transparent)" }} />
            </div>
          </div>

          {/* ── Two-column layout ── */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 380px", gap: 28, alignItems: "start" }}>

            {/* ═══════════ LEFT COLUMN ═══════════ */}
            <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>

              {/* Delivery Details Summary */}
              <div style={{ position: "relative" }}>
                <CornerBrackets />
                <div style={{
                  background: cardBg,
                  border: "1px solid rgba(212,175,100,0.13)",
                  borderRadius: 3, padding: "28px 28px",
                  boxShadow: "0 12px 48px rgba(0,0,0,0.5)",
                }}>
                  <SectionHeader
                    step={1}
                    icon={
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                        <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" />
                        <circle cx="12" cy="9" r="2.5" />
                      </svg>
                    }
                    title="Delivery Details"
                  />

                  {checkoutData && (
                    <div style={{ display: "flex", flexDirection: "column", gap: 16, marginBottom: 16 }}>
                      <div>
                        <p style={{ fontSize: 10, letterSpacing: "0.2em", textTransform: "uppercase", color: "rgba(200,175,130,0.45)", marginBottom: 6 }}>Address Type</p>
                        <p style={{ color: "#f0e6cc", fontSize: 14, fontWeight: 500 }}>
                          {checkoutData.addressType === "home" ? "🏠" : checkoutData.addressType === "work" ? "🏢" : "📍"} {checkoutData.addressType ? checkoutData.addressType.charAt(0).toUpperCase() + checkoutData.addressType.slice(1) : "Other"}
                        </p>
                      </div>
                      <div>
                        <p style={{ fontSize: 10, letterSpacing: "0.2em", textTransform: "uppercase", color: "rgba(200,175,130,0.45)", marginBottom: 6 }}>Street Address</p>
                        <p style={{ color: "#f0e6cc", fontSize: 13, lineHeight: 1.5 }}>{checkoutData.addressLine1}</p>
                      </div>
                      {checkoutData.landmark && (
                        <div>
                          <p style={{ fontSize: 10, letterSpacing: "0.2em", textTransform: "uppercase", color: "rgba(200,175,130,0.45)", marginBottom: 6 }}>Landmark</p>
                          <p style={{ color: "rgba(200,175,130,0.75)", fontSize: 13 }}>{checkoutData.landmark}</p>
                        </div>
                      )}
                      {checkoutData.pincode && (
                        <div>
                          <p style={{ fontSize: 10, letterSpacing: "0.2em", textTransform: "uppercase", color: "rgba(200,175,130,0.45)", marginBottom: 6 }}>Pincode</p>
                          <p style={{ color: "rgba(200,175,130,0.75)", fontSize: 13 }}>{checkoutData.pincode}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Payment Method Summary */}
              <div style={{ position: "relative" }}>
                <CornerBrackets />
                <div style={{
                  background: cardBg,
                  border: "1px solid rgba(212,175,100,0.13)",
                  borderRadius: 3, padding: "28px 28px",
                  boxShadow: "0 12px 48px rgba(0,0,0,0.5)",
                }}>
                  <SectionHeader
                    step={2}
                    icon={
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                        <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
                        <line x1="1" y1="10" x2="23" y2="10" />
                      </svg>
                    }
                    title="Payment Method"
                  />

                  {checkoutData && (
                    <div style={{
                      display: "flex", alignItems: "center", gap: 16,
                      padding: "16px 18px", borderRadius: 3,
                      border: `1px solid rgba(212,175,100,0.35)`,
                      background: "rgba(212,175,100,0.06)",
                    }}>
                      <span style={{ fontSize: 28 }}>
                        {checkoutData.paymentMethod === "cod" ? "💵" : checkoutData.paymentMethod === "upi" ? "📱" : "💳"}
                      </span>
                      <div style={{ flex: 1 }}>
                        <p style={{ color: "#f0e6cc", fontSize: 14, fontWeight: 500 }}>
                          {checkoutData.paymentMethod === "cod" ? "Cash on Delivery" : checkoutData.paymentMethod === "upi" ? "UPI" : "Credit / Debit Card"}
                        </p>
                        <p style={{ color: textMuted, fontSize: 11, marginTop: 2 }}>
                          {checkoutData.paymentMethod === "cod" ? "Pay when order arrives" : checkoutData.paymentMethod === "upi" ? "Google Pay, PhonePe, Paytm" : "Visa, Mastercard, RuPay"}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* ── 3. Tip for delivery partner ── */}
              <div style={{ position: "relative" }}>
                <CornerBrackets />
                <div style={{
                  background: cardBg,
                  border: "1px solid rgba(212,175,100,0.13)",
                  borderRadius: 3, padding: "28px 28px",
                  boxShadow: "0 12px 48px rgba(0,0,0,0.5)",
                }}>
                  <SectionHeader
                    step={3}
                    icon={<span style={{ fontSize: 16 }}>❤️</span>}
                    title="Tip Your Delivery Partner"
                  />
                  <p style={{ color: textMuted, fontSize: 12, marginBottom: 16, lineHeight: 1.5 }}>
                    Your kindness means a lot! 100% of the tip goes directly to your delivery partner.
                  </p>
                  <div style={{ display: "flex", gap: 10 }}>
                    {tipOptions.map(amount => (
                      <button
                        key={amount}
                        onClick={() => setTip(amount)}
                        style={{
                          padding: "10px 20px", borderRadius: 2,
                          border: `1px solid ${tip === amount ? "rgba(212,175,100,0.6)" : goldBorder}`,
                          background: tip === amount ? "rgba(212,175,100,0.12)" : "transparent",
                          color: tip === amount ? gold : textMuted,
                          fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: tip === amount ? 700 : 400,
                          cursor: "pointer", transition: "all 0.2s",
                          minWidth: 60,
                        }}
                      >
                        {amount === 0 ? "No tip" : `₹${amount}`}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* ═══════════ RIGHT COLUMN — Order Summary (sticky) ═══════════ */}
            <div style={{ position: "sticky", top: 100 }}>
              <div style={{ position: "relative" }}>
                <CornerBrackets />
                <div style={{
                  background: cardBg,
                  border: "1px solid rgba(212,175,100,0.13)",
                  borderRadius: 3, padding: "28px 24px",
                  boxShadow: "0 0 0 1px rgba(212,175,100,0.05), 0 32px 80px rgba(0,0,0,0.8)",
                }}>
                  {/* Header */}
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20 }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={gold} strokeWidth="1.5" strokeLinecap="round">
                      <circle cx="9" cy="21" r="1" /><circle cx="20" cy="21" r="1" />
                      <path d="M1 1h4l2.68 13.39a2 2 0 001.99 1.61h9.72a2 2 0 001.98-1.69l1.54-8.31H6" />
                    </svg>
                    <h3 style={{
                      fontFamily: "'Playfair Display', serif",
                      fontSize: 18, fontWeight: 500, color: "#f0e6cc",
                    }}>
                      Order Summary
                    </h3>
                  </div>

                  {/* Restaurant name */}
                  {cartData?.restaurantName && (
                    <div style={{
                      padding: "10px 14px", marginBottom: 16, borderRadius: 2,
                      background: goldFaint,
                      border: `1px solid ${goldBorder}`,
                    }}>
                      <p style={{ fontSize: 10, letterSpacing: "0.16em", textTransform: "uppercase", color: textMuted, marginBottom: 4 }}>Ordering from</p>
                      <p style={{ fontFamily: "'Playfair Display', serif", fontSize: 14, color: gold }}>{cartData.restaurantName}</p>
                    </div>
                  )}

                  {/* Items list */}
                  <div style={{ marginBottom: 20 }}>
                    {cartData?.items.map(item => (
                      <div
                        key={item._id}
                        className="cart-item-row"
                        style={{
                          display: "flex", alignItems: "center", gap: 12,
                          padding: "12px 8px",
                          borderBottom: "1px solid rgba(212,175,100,0.06)",
                        }}
                      >
                        {/* Veg dot */}
                        <div style={{
                          width: 12, height: 12, border: "1.5px solid #4ade80",
                          borderRadius: 2, display: "flex", alignItems: "center",
                          justifyContent: "center", flexShrink: 0,
                        }}>
                          <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#4ade80" }} />
                        </div>

                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{
                            color: "#f0e6cc", fontSize: 13, fontWeight: 400,
                            whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                          }}>
                            {item.name}
                          </p>
                        </div>
                        <span style={{
                          fontSize: 12, color: textMuted, flexShrink: 0,
                          padding: "2px 8px",
                          border: `1px solid ${goldBorder}`,
                          borderRadius: 2,
                        }}>
                          ×{item.quantity}
                        </span>
                        <span style={{ color: gold, fontSize: 13, fontWeight: 600, flexShrink: 0, minWidth: 52, textAlign: "right" }}>
                          ₹{item.price * item.quantity}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Divider */}
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
                    <div style={{ flex: 1, height: 1, background: "rgba(212,175,100,0.12)" }} />
                    <div style={{ width: 3, height: 3, transform: "rotate(45deg)", background: "rgba(212,175,100,0.3)" }} />
                    <div style={{ flex: 1, height: 1, background: "rgba(212,175,100,0.12)" }} />
                  </div>

                  {/* Price breakdown */}
                  <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 16 }}>
                    {[
                      { label: "Subtotal", value: `₹${subtotal}` },
                      { label: "Delivery Fee", value: deliveryFee === 0 ? "FREE" : `₹${deliveryFee}`, highlight: deliveryFee === 0 },
                      { label: "Platform Fee", value: `₹${platformFee}` },
                      { label: "GST (5%)", value: `₹${gst}` },
                      ...(tip > 0 ? [{ label: "Delivery Tip", value: `₹${tip}` }] : []),
                    ].map(({ label, value, highlight }) => (
                      <div key={label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ fontSize: 12, color: textMuted }}>{label}</span>
                        <span style={{
                          fontSize: 12, fontWeight: 500,
                          color: highlight ? "#4ade80" : "rgba(200,175,130,0.75)",
                        }}>
                          {value}
                        </span>
                      </div>
                    ))}
                  </div>

                  {deliveryFee === 0 && (
                    <div style={{
                      padding: "8px 12px", borderRadius: 2, marginBottom: 16,
                      background: "rgba(74,222,128,0.06)",
                      border: "1px solid rgba(74,222,128,0.2)",
                    }}>
                      <p style={{ fontSize: 11, color: "#4ade80", letterSpacing: "0.06em" }}>
                        🎉 Free delivery on orders above ₹500
                      </p>
                    </div>
                  )}

                  {/* Grand total */}
                  <div style={{
                    display: "flex", justifyContent: "space-between", alignItems: "center",
                    padding: "16px 0",
                    borderTop: `1px solid ${goldBorder}`,
                    borderBottom: `1px solid ${goldBorder}`,
                    marginBottom: 24,
                  }}>
                    <span style={{
                      fontSize: 11, letterSpacing: "0.2em", textTransform: "uppercase",
                      color: textMuted, fontWeight: 500,
                    }}>
                      Total
                    </span>
                    <span style={{
                      fontFamily: "'Playfair Display', serif",
                      fontSize: 26, color: gold, fontWeight: 500,
                    }}>
                      ₹{grandTotal}
                    </span>
                  </div>

                  {/* Place Order button */}
                  <button
                    onClick={handlePlaceOrder}
                    disabled={placing || paymentProcessing}
                    style={{
                      width: "100%", padding: "16px 20px",
                      background: (placing || paymentProcessing)
                        ? "rgba(212,175,100,0.08)"
                        : "linear-gradient(135deg, #b8860b 0%, #daa520 40%, #e8c84a 60%, #b8860b 100%)",
                      border: (placing || paymentProcessing) ? `1px solid ${goldBorder}` : "none",
                      borderRadius: 2,
                      color: (placing || paymentProcessing) ? "rgba(212,175,100,0.4)" : "#120d00",
                      fontFamily: "'DM Sans', sans-serif",
                      fontSize: 12, fontWeight: 700,
                      letterSpacing: "0.24em", textTransform: "uppercase",
                      cursor: (placing || paymentProcessing) ? "not-allowed" : "pointer",
                      display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
                      transition: "all 0.35s",
                      boxShadow: (placing || paymentProcessing) ? "none" : "0 4px 20px rgba(212,175,100,0.2)",
                    }}
                  >
                    {(placing || paymentProcessing) && <Spinner />}
                    <span>
                      {paymentProcessing ? "Processing Payment…" : placing ? "Placing Order…" : `Place Order · ₹${grandTotal}`}
                    </span>
                  </button>

                  {/* Secure badge */}
                  <div style={{
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                    marginTop: 16,
                  }}>
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="rgba(200,175,130,0.3)" strokeWidth="2" strokeLinecap="round">
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                      <path d="M7 11V7a5 5 0 0110 0v4" />
                    </svg>
                    <span style={{ fontSize: 10, letterSpacing: "0.16em", textTransform: "uppercase", color: "rgba(200,175,130,0.25)" }}>
                      Secure Checkout
                    </span>
                  </div>
                </div>
              </div>

              {/* Bottom ornament */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 24, opacity: 0.15 }}>
                <div style={{ height: 1, width: 28, background: "rgba(212,175,100,1)" }} />
                <div style={{ width: 4, height: 4, transform: "rotate(45deg)", background: "rgba(212,175,100,1)" }} />
                <div style={{ height: 1, width: 28, background: "rgba(212,175,100,1)" }} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default CheckoutPage;
