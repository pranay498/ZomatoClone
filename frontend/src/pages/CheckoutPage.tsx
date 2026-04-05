/**
 * CheckoutPage.tsx
 * Route: /checkout
 *
 * EXACT FLOW:
 *   1. Mount → read addressId + restaurantId from sessionStorage
 *   2. createOrder() ONCE → get orderId → store in state
 *   3. User picks payment method + tip
 *   4. COD   → confirmCODOrder(orderId) → success
 *   5. UPI/Card → createRazorpayOrder(amount) → open modal
 *              → user pays → verifyRazorpayPayment({ orderId, ...sigs })
 *              → poll getOrderStatus until "placed" → success
 *
 * RULES:
 *   - createOrder called ONCE via useRef guard
 *   - orderId set BEFORE any payment call
 *   - Success shown ONLY after COD confirm OR payment verify
 *   - clearCart ONLY on success
 *   - Razorpay dismiss → back to ready (NOT success)
 */

import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useApp } from "../Context/MainContext";
import toast from "react-hot-toast";
import {
  createOrder,
  confirmCODOrder,
  createRazorpayOrder,
  verifyRazorpayPayment,
  getOrderStatus,
  clearCart,
} from "../services/api";
import apiClient from "../services/apiClient";

declare global { interface Window { Razorpay: any; } }

// ── Theme ──────────────────────────────────────────────────────────
const gold       = "#d4af64";
const goldBorder = "rgba(212,175,100,0.25)";
const goldFaint  = "rgba(212,175,100,0.08)";
const textMuted  = "rgba(200,175,130,0.5)";
const textBody   = "rgba(200,175,130,0.75)";
const cardBg     = "linear-gradient(155deg, rgba(20,15,7,0.98) 0%, rgba(11,8,3,0.99) 100%)";

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;500;600&family=DM+Sans:wght@300;400;500;600&display=swap');
  @keyframes shimmer  { 0%{background-position:0% center;} 100%{background-position:200% center;} }
  @keyframes drift1   { 0%,100%{transform:translate(0,0);} 50%{transform:translate(28px,-20px);} }
  @keyframes drift2   { 0%,100%{transform:translate(0,0);} 50%{transform:translate(-22px,-26px);} }
  @keyframes spin     { to{transform:rotate(360deg);} }
  @keyframes fadeUp   { from{opacity:0;transform:translateY(16px);} to{opacity:1;transform:translateY(0);} }
  @keyframes checkDraw{ to{stroke-dashoffset:0;} }
  .co-root *, .co-root *::before, .co-root *::after { box-sizing:border-box; margin:0; padding:0; }
  .pay-opt { transition: all 0.2s; }
  .pay-opt:hover { border-color: rgba(212,175,100,0.45) !important; background: rgba(212,175,100,0.05) !important; }
`;

// ── Micro components ───────────────────────────────────────────────
const Spin = ({ size = 16, color = "currentColor" }: { size?: number; color?: string }) => (
  <svg style={{ animation:"spin 0.8s linear infinite", flexShrink:0 }} width={size} height={size} viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="12" r="10" stroke={color} strokeWidth="3" opacity="0.2"/>
    <path d="M12 2a10 10 0 0110 10" stroke={color} strokeWidth="3" strokeLinecap="round"/>
  </svg>
);

const Brackets = () => (
  <>
    {[
      { top:0,    left:0,  borderTop:`1px solid ${goldBorder}`,    borderLeft:`1px solid ${goldBorder}` },
      { top:0,    right:0, borderTop:`1px solid ${goldBorder}`,    borderRight:`1px solid ${goldBorder}` },
      { bottom:0, left:0,  borderBottom:`1px solid ${goldBorder}`, borderLeft:`1px solid ${goldBorder}` },
      { bottom:0, right:0, borderBottom:`1px solid ${goldBorder}`, borderRight:`1px solid ${goldBorder}` },
    ].map((s,i) => <div key={i} style={{ position:"absolute", width:20, height:20, zIndex:2, ...s }}/>)}
  </>
);

const SectionLabel = ({ n, title, icon }: { n: number; title: string; icon: React.ReactNode }) => (
  <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:18 }}>
    <div style={{ width:30, height:30, borderRadius:"50%", background:goldFaint, border:`1px solid ${goldBorder}`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:11, color:gold, fontWeight:600, fontFamily:"'Playfair Display',serif", flexShrink:0 }}>{n}</div>
    <span style={{ color:gold, display:"flex" }}>{icon}</span>
    <h3 style={{ fontFamily:"'Playfair Display',serif", fontSize:17, fontWeight:500, color:"#f0e6cc" }}>{title}</h3>
    <div style={{ flex:1, height:1, background:"rgba(212,175,100,0.1)" }}/>
  </div>
);

// ── Types ──────────────────────────────────────────────────────────
type PaymentMethod = "cod" | "upi" | "card";

// What AddressPaymentPage stores in sessionStorage
interface StoredAddress {
  addressId:    string;
  fullAddress:  string;
  addressLine2?: string;
  landmark?:    string;
  city:         string;
  state:        string;
  pincode:      string;
  addressType:  "home" | "work" | "other";
  phoneNumber:  string;
  lat?:         number;
  lng?:         number;
}

// What cart page stores in localStorage
interface CartItem {
  _id:          string;
  name:         string;
  price:        number;
  quantity:     number;
  imageUrl?:    string;
  restaurantId: string;
}
interface CartData {
  items:          CartItem[];
  restaurantId:   string;
  restaurantName: string;
}

// ── Poll helper ────────────────────────────────────────────────────
async function pollUntilPlaced(orderId: string, maxMs = 15000): Promise<boolean> {
  const start = Date.now();
  while (Date.now() - start < maxMs) {
    try {
      const res = await getOrderStatus(orderId);
      if (res.success && res.order?.status === "placed") return true;
    } catch { /* keep polling */ }
    await new Promise(r => setTimeout(r, 1500));
  }
  return false;
}

// ── Load Razorpay ──────────────────────────────────────────────────
function loadRazorpay(): Promise<boolean> {
  return new Promise(resolve => {
    if (window.Razorpay) return resolve(true);
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.onload  = () => resolve(true);
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });
}

// ──────────────────────────────────────────────────────────────────
const CheckoutPage: React.FC = () => {
  const navigate    = useNavigate();
  const { user }    = useApp();

  // Page states
  const [phase, setPhase] = useState<
    "loading"   |  // loading checkout data
    "ready"     |  // data loaded, waiting for user to click "Place Order"
    "paying"    |  // payment in progress
    "success"   |  // order placed successfully
    "error"        // data load failed
  >("loading");

  // Core data
  const [orderId,        setOrderId]       = useState<string | null>(null);
  const [address,        setAddress]       = useState<StoredAddress | null>(null);
  const [cart,           setCart]          = useState<CartData | null>(null);
  const [paymentMethod,  setPayMethod]     = useState<PaymentMethod>("cod");
  const [tip,            setTip]           = useState(0);
  const [statusMsg,      setStatusMsg]     = useState("Creating your order…");

  // Double-call guard
  const orderCreatedRef = useRef(false);

  // ── Derived totals ──────────────────────────────────────────────
  const subtotal    = cart?.items.reduce((s,i) => s + i.price * i.quantity, 0) ?? 0;
  const deliveryFee = subtotal > 299 ? 0 : 40;
  const platformFee = 5;
  const gst         = Math.round(subtotal * 0.05);
  const grandTotal  = subtotal + deliveryFee + platformFee + gst + tip;

  // ── Step 1: On mount, ONLY read session data (NO ORDER CREATION) ─
  useEffect(() => {
    const loadCheckoutData = () => {
      try {
        // Read address from sessionStorage
        const rawAddr = sessionStorage.getItem("deliveryAddress");
        const rawCart = sessionStorage.getItem("cart");
        const storedRestId = sessionStorage.getItem("restaurantId");
        const storedRestName = sessionStorage.getItem("restaurantName");

        if (!rawAddr) {
          toast.error("No address found. Please go back.");
          navigate("/address-payment");
          return;
        }
        if (!rawCart) {
          toast.error("Cart is empty.");
          navigate("/");
          return;
        }

        const parsedAddr: StoredAddress = JSON.parse(rawAddr);
        const parsedItems = JSON.parse(rawCart);

        // Combine into CartData format
        const parsedCart: CartData = {
          items: parsedItems,
          restaurantId: storedRestId || "",
          restaurantName: storedRestName || "",
        };

        if (!parsedAddr.addressId) {
          toast.error("Address ID missing. Please re-enter your address.");
          navigate("/address-payment");
          return;
        }
        if (!parsedCart.items?.length) {
          toast.error("Cart is empty.");
          navigate("/");
          return;
        }

        setAddress(parsedAddr);
        setCart(parsedCart);
        setPhase("ready");  // Ready to place order, NOT order created yet

      } catch (err: any) {
        console.error("❌ [Checkout] Load data error:", err);
        toast.error("Failed to load checkout data");
        setPhase("error");
      }
    };

    loadCheckoutData();
  }, [navigate]);

  // ── Step 2a: COD — CREATE ORDER FIRST, then confirm ────────────
  const handleCOD = async () => {
    if (!address || !cart) return;
    setPhase("paying");
    
    try {
      // Prevent multiple calls
      if (orderCreatedRef.current && orderId) {
        // Order already created, just confirm
        setStatusMsg("Confirming your order…");
        console.log("🟢 Order already created, confirming:", orderId);
        const res = await confirmCODOrder(orderId);
        if (!res.success) throw new Error(res.message || "COD confirmation failed");
      } else {
        // Create order first
        setStatusMsg("Syncing cart to backend…");
        console.log("🟡 [COD] Syncing cart before order creation...");
        
        // ✅ SYNC CART TO BACKEND FIRST (with restaurantId)
        await apiClient.post("/cart/sync", {
          restaurantId: cart.restaurantId,
          restaurantName: cart.restaurantName,
          items: cart.items.map(i => ({
            menuItemId: i._id,
            name: i.name,
            price: i.price,
            quantity: i.quantity,
            imageUrl: i.imageUrl,
          })),
        });
        console.log("🟢 Cart synced to backend with restaurantId:", cart.restaurantId);
        
        // Create order first
        setStatusMsg("Creating your order…");
        console.log("🟡 [COD] Starting order creation...");
        
        // Calculate total
        const sub  = cart.items.reduce((s,i) => s + i.price * i.quantity, 0);
        const fee  = sub > 299 ? 0 : 40;
        const plat = 5;
        const g    = Math.round(sub * 0.05);
        const tot  = sub + fee + plat + g + tip;

        // ✅ CREATE ORDER
        const createRes = await createOrder({
          addressId:     address.addressId,
          paymentMethod: "cod",
          totalAmount:   tot,
          userPhone:     address.phoneNumber,
          restaurantId:  cart.restaurantId,
        });

        console.log("📋 Order creation response:", createRes);

        if (!createRes.success || !createRes.orderId) {
          console.error("❌ Order creation failed:", createRes.message);
          throw new Error(createRes.message || "Order creation failed");
        }

        console.log("✅ [Checkout] Order CREATED successfully:", createRes.orderId);
        toast.success(`Order #${createRes.orderId.slice(-8).toUpperCase()} created!`);
        setOrderId(createRes.orderId);
        orderCreatedRef.current = true;

        // ✅ CONFIRM COD
        setStatusMsg("Confirming your order…");
        const confirmRes = await confirmCODOrder(createRes.orderId);
        if (!confirmRes.success) throw new Error(confirmRes.message || "COD confirmation failed");
      }

      await clearCart();
      sessionStorage.removeItem("cart");
      sessionStorage.removeItem("deliveryAddress");
      setPhase("success");
      toast.success("Order placed successfully!");

    } catch (err: any) {
      console.error("❌ [Checkout] COD error:", err);
      console.error("📌 Error details:", err?.response?.data || err.message);
      toast.error(err?.response?.data?.message || "Payment failed");
      setPhase("ready");
    }
  };

  // ── Step 2b: Razorpay — CREATE ORDER FIRST, then pay ───────────
  const handleRazorpay = async () => {
    if (!address || !cart) return;
    setPhase("paying");

    try {
      // Create order first (if not already created)
      let orderIdToUse = orderId;
      
      if (!orderIdToUse) {
        setStatusMsg("Syncing cart to backend…");
        console.log("🟡 [UPI/Card] Syncing cart before order creation...");
        
        // ✅ SYNC CART TO BACKEND FIRST (with restaurantId)
        await apiClient.post("/cart/sync", {
          restaurantId: cart.restaurantId,
          restaurantName: cart.restaurantName,
          items: cart.items.map(i => ({
            menuItemId: i._id,
            name: i.name,
            price: i.price,
            quantity: i.quantity,
            imageUrl: i.imageUrl,
          })),
        });
        console.log("🟢 Cart synced to backend with restaurantId:", cart.restaurantId);
        
        // Create order first
        setStatusMsg("Creating your order…");
        console.log("🟡 [UPI/Card] Starting order creation...");
        console.log("📦 Payload:", {
          addressId: address.addressId,
          paymentMethod,
          restaurantId: cart.restaurantId,
          items: cart.items.length,
        });
        
        // Calculate total
        const sub  = cart.items.reduce((s,i) => s + i.price * i.quantity, 0);
        const fee  = sub > 299 ? 0 : 40;
        const plat = 5;
        const g    = Math.round(sub * 0.05);
        const tot  = sub + fee + plat + g + tip;

        // ✅ CREATE ORDER
        const createRes = await createOrder({
          addressId:     address.addressId,
          paymentMethod: paymentMethod,
          totalAmount:   tot,
          userPhone:     address.phoneNumber,
          restaurantId:  cart.restaurantId,
        });

        console.log("📋 Order creation response:", createRes);

        if (!createRes.success || !createRes.orderId) {
          console.error("❌ Order creation failed:", createRes.message);
          throw new Error(createRes.message || "Order creation failed");
        }

        console.log("✅ [Checkout] Order CREATED successfully:", createRes.orderId);
        toast.success(`Order #${createRes.orderId.slice(-8).toUpperCase()} created!`);
        setOrderId(createRes.orderId);
        orderCreatedRef.current = true;
        orderIdToUse = createRes.orderId;
      }

      // Now proceed with Razorpay payment
      setStatusMsg("Loading payment gateway…");
      const loaded = await loadRazorpay();
      if (!loaded) {
        toast.error("Razorpay failed to load. Check connection.");
        setPhase("ready");
        return;
      }

      setStatusMsg("Opening payment…");

      // Amount in paise — include tip 
      const totalWithTip = grandTotal;
      const res = await createRazorpayOrder(totalWithTip * 100);
      if (!res.success || !res.orderId) throw new Error(res.message || "Payment init failed");

      await new Promise<void>((resolve) => {
        const options = {
          key:         import.meta.env.VITE_RAZORPAY_KEY_ID,
          amount:      res.amount,
          currency:    res.currency || "INR",
          name:        cart?.restaurantName || "Food Delivery",
          description: "Food Order",
          order_id:    res.orderId,  // Razorpay's order_id

          handler: async (response: {
            razorpay_payment_id: string;
            razorpay_order_id:   string;
            razorpay_signature:  string;
          }) => {
            setStatusMsg("Verifying payment…");
            try {
              const verifyRes = await verifyRazorpayPayment({
                orderId: orderIdToUse,  
                razorpay_order_id:   response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature:  response.razorpay_signature,
              });

              if (!verifyRes.success) throw new Error(verifyRes.message || "Verification failed");

              // Poll until RabbitMQ consumer sets status=placed
              setStatusMsg("Confirming with server…");
              const placed = await pollUntilPlaced(orderIdToUse);
              if (!placed) {
                // Payment done but RabbitMQ timed out — still succeed
                console.warn("⚠️ Poll timed out, payment verified — proceeding");
              }

              await clearCart();
              sessionStorage.removeItem("cart");
              sessionStorage.removeItem("deliveryAddress");
              setPhase("success");
              toast.success("Payment verified!");
              resolve();

            } catch (err: any) {
              toast.error(err?.response?.data?.message || "Payment verification failed");
              setPhase("ready");
              resolve();
            }
          },

          prefill: {
            name:    user?.firstName ? `${user.firstName} ${user.lastName || ""}` : "",
            contact: address?.phoneNumber || "",
          },

          theme: { color: gold },

          modal: {
            ondismiss: () => {
              // User closed Razorpay — NOT a failure, just let them retry
              console.log("🟡 Razorpay dismissed");
              setPhase("ready");
              resolve();
            },
          },
        };

        const rzp = new window.Razorpay(options);
        rzp.on("payment.failed", (r: any) => {
          toast.error("Payment failed: " + (r.error?.description || "Unknown error"));
          setPhase("ready");
          resolve();
        });
        rzp.open();
      });

    } catch (err: any) {
      console.error("❌ [Checkout] Razorpay error:", err);
      console.error("📌 Error details:", err?.response?.data || err.message);
      toast.error(err?.response?.data?.message || "Payment failed");
      setPhase("ready");
    }
  };

  // Unified pay handler
  const handlePay = () => {
    if (paymentMethod === "cod") handleCOD();
    else handleRazorpay();
  };

  // ─────────────────────────────────────────────────────────────────
  //  RENDER
  // ─────────────────────────────────────────────────────────────────
  return (
    <>
      <style>{CSS}</style>
      <div className="co-root" style={{ minHeight:"100vh", width:"100%", backgroundColor:"#090705", background:"radial-gradient(ellipse at 20% 10%,rgba(201,168,76,0.07) 0%,transparent 50%),radial-gradient(ellipse at 80% 90%,rgba(184,134,11,0.06) 0%,transparent 50%),#090705", fontFamily:"'DM Sans',system-ui,sans-serif", position:"relative", overflow:"hidden" }}>

        {/* Ambient orbs */}
        <div style={{ position:"absolute", top:"-8%", left:"-4%", width:480, height:480, borderRadius:"50%", background:"radial-gradient(circle,rgba(201,168,76,0.1) 0%,transparent 68%)", filter:"blur(50px)", animation:"drift1 14s ease-in-out infinite", pointerEvents:"none" }}/>
        <div style={{ position:"absolute", bottom:"-10%", right:"-6%", width:400, height:400, borderRadius:"50%", background:"radial-gradient(circle,rgba(184,134,11,0.09) 0%,transparent 68%)", filter:"blur(55px)", animation:"drift2 17s ease-in-out infinite", pointerEvents:"none" }}/>

        {/* ══ LOADING ══ */}
        {phase === "loading" && (
          <div style={{ minHeight:"100vh", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:20, position:"relative", zIndex:2 }}>
            <Spin size={40} color={gold}/>
            <p style={{ color:textMuted, fontSize:12, letterSpacing:"0.2em", textTransform:"uppercase" }}>
              Loading checkout…
            </p>
          </div>
        )}

        {/* ══ ERROR ══ */}
        {phase === "error" && (
          <div style={{ minHeight:"100vh", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:16, textAlign:"center", padding:"0 24px", position:"relative", zIndex:2 }}>
            <div style={{ fontSize:40, opacity:0.4 }}>⚠️</div>
            <p style={{ fontFamily:"'Playfair Display',serif", fontSize:22, color:"rgba(212,175,100,0.5)" }}>Something went wrong</p>
            <p style={{ color:textMuted, fontSize:13 }}>Please go back and try again.</p>
            <button onClick={() => navigate(-1)} style={{ marginTop:8, padding:"11px 28px", background:goldFaint, border:`1px solid ${goldBorder}`, borderRadius:2, color:gold, fontFamily:"'DM Sans',sans-serif", fontSize:11, letterSpacing:"0.16em", textTransform:"uppercase", cursor:"pointer" }}>
              Go Back
            </button>
          </div>
        )}

        {/* ══ SUCCESS ══ */}
        {phase === "success" && orderId && (
          <div style={{ minHeight:"100vh", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:"40px 24px", position:"relative", zIndex:2 }}>
            <div style={{ textAlign:"center", maxWidth:440, animation:"fadeUp 0.5s cubic-bezier(.16,1,.3,1) both" }}>
              {/* Check icon */}
              <div style={{ width:80, height:80, borderRadius:"50%", background:"rgba(74,222,128,0.1)", border:"2px solid rgba(74,222,128,0.35)", display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 24px" }}>
                <svg width="36" height="36" viewBox="0 0 24 24" fill="none">
                  <polyline points="20 6 9 17 4 12" stroke="#4ade80" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                    strokeDasharray="30" strokeDashoffset="30"
                    style={{ animation:"checkDraw 0.5s ease 0.3s forwards" }}/>
                </svg>
              </div>

              <h1 style={{ fontFamily:"'Playfair Display',serif", fontSize:28, color:"#f0e6cc", marginBottom:8 }}>
                {paymentMethod === "cod" ? "Order Confirmed!" : "Payment Successful!"}
              </h1>
              <p style={{ color:textMuted, fontSize:13, marginBottom:6 }}>
                {paymentMethod === "cod" ? "Pay when your order arrives." : "Payment confirmed — your order is being prepared."}
              </p>
              <p style={{ color:textMuted, fontSize:12, marginBottom:24 }}>
                A rider is being assigned to your order.
              </p>

              {/* Order ID badge */}
              <div style={{ display:"inline-block", padding:"8px 18px", background:goldFaint, border:`1px solid ${goldBorder}`, borderRadius:2, marginBottom:32 }}>
                <p style={{ fontSize:9, letterSpacing:"0.2em", textTransform:"uppercase", color:textMuted, marginBottom:4 }}>Order ID</p>
                <p style={{ fontFamily:"monospace", fontSize:12, color:gold }}>{orderId}</p>
              </div>

              <div style={{ display:"flex", gap:12, justifyContent:"center" }}>
                <button onClick={() => navigate("/")} style={{ padding:"13px 24px", background:goldFaint, border:`1px solid ${goldBorder}`, borderRadius:2, color:gold, fontFamily:"'DM Sans',sans-serif", fontSize:11, fontWeight:600, letterSpacing:"0.18em", textTransform:"uppercase", cursor:"pointer" }}>
                  Home
                </button>
                <button onClick={() => navigate(`/orders/${orderId}`)} style={{ padding:"13px 24px", background:"linear-gradient(135deg,#b8860b 0%,#daa520 40%,#e8c84a 60%,#b8860b 100%)", border:"none", borderRadius:2, color:"#120d00", fontFamily:"'DM Sans',sans-serif", fontSize:11, fontWeight:700, letterSpacing:"0.22em", textTransform:"uppercase", cursor:"pointer" }}>
                  Track Order
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ══ READY + PAYING ══ */}
        {(phase === "ready" || phase === "paying") && (
          <div style={{ maxWidth:680, margin:"0 auto", padding:"40px 16px 100px", position:"relative", zIndex:2 }}>

            {/* Paying overlay */}
            {phase === "paying" && (
              <div style={{ position:"fixed", inset:0, background:"rgba(9,7,5,0.88)", zIndex:999, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:18, backdropFilter:"blur(6px)" }}>
                <Spin size={36} color={gold}/>
                <p style={{ color:gold, fontSize:12, letterSpacing:"0.2em", textTransform:"uppercase" }}>{statusMsg}</p>
              </div>
            )}

            {/* Back */}
            <button onClick={() => navigate(-1)} style={{ display:"flex", alignItems:"center", gap:6, marginBottom:28, background:"transparent", border:"none", color:"rgba(200,175,130,0.45)", fontFamily:"'DM Sans',sans-serif", fontSize:12, letterSpacing:"0.14em", textTransform:"uppercase", cursor:"pointer", padding:0 }}
              onMouseEnter={e=>(e.currentTarget.style.color=gold)}
              onMouseLeave={e=>(e.currentTarget.style.color="rgba(200,175,130,0.45)")}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="15 18 9 12 15 6"/></svg>
              Back
            </button>

            {/* Title */}
            <div style={{ marginBottom:32 }}>
              <h1 style={{ fontFamily:"'Playfair Display',Georgia,serif", fontSize:"clamp(26px,4vw,36px)", fontWeight:500, background:"linear-gradient(90deg,#b8860b,#f0d070,#daa520,#c9a84c,#b8860b)", backgroundSize:"300% auto", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent", backgroundClip:"text", animation:"shimmer 6s linear infinite", marginBottom:6 }}>
                Order Summary
              </h1>
              {orderId && (
                <p style={{ fontSize:11, color:textMuted, fontFamily:"monospace" }}>
                  Order: <span style={{ color:"rgba(212,175,100,0.6)" }}>{orderId.slice(-10).toUpperCase()}</span>
                </p>
              )}
            </div>

            {/* ── 1. DELIVERY ADDRESS ── */}
            {address && (
              <div style={{ position:"relative", marginBottom:20 }}>
                <Brackets/>
                <div style={{ background:cardBg, border:"1px solid rgba(212,175,100,0.13)", borderRadius:3, padding:"24px 28px", boxShadow:"0 8px 32px rgba(0,0,0,0.4)" }}>
                  <SectionLabel n={1} title="Delivery Address"
                    icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/><circle cx="12" cy="9" r="2.5"/></svg>}/>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:12 }}>
                    <div>
                      <span style={{ fontSize:9, letterSpacing:"0.16em", padding:"2px 8px", background:goldFaint, border:`1px solid ${goldBorder}`, borderRadius:2, color:gold, textTransform:"uppercase", marginBottom:8, display:"inline-block" }}>
                        {address.addressType === "home" ? "🏠" : address.addressType === "work" ? "🏢" : "📍"} {address.addressType}
                      </span>
                      <p style={{ color:"#f0e6cc", fontSize:13, lineHeight:1.6, marginTop:6 }}>{address.fullAddress}</p>
                      {address.landmark && <p style={{ color:textMuted, fontSize:12, marginTop:3 }}>Near: {address.landmark}</p>}
                      <p style={{ color:textMuted, fontSize:12, marginTop:3 }}>{address.city}, {address.state} — {address.pincode}</p>
                      <p style={{ color:textMuted, fontSize:12, marginTop:3 }}>📞 {address.phoneNumber}</p>
                    </div>
                    <button onClick={() => navigate("/address-payment")} style={{ flexShrink:0, padding:"6px 12px", background:"transparent", border:`1px solid ${goldBorder}`, borderRadius:2, color:textMuted, fontFamily:"'DM Sans',sans-serif", fontSize:10, letterSpacing:"0.12em", textTransform:"uppercase", cursor:"pointer" }}
                      onMouseEnter={e=>{e.currentTarget.style.color=gold; e.currentTarget.style.borderColor="rgba(212,175,100,0.5)";}}
                      onMouseLeave={e=>{e.currentTarget.style.color=textMuted; e.currentTarget.style.borderColor=goldBorder;}}>
                      Change
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ── 2. ORDER ITEMS ── */}
            {cart && (
              <div style={{ position:"relative", marginBottom:20 }}>
                <Brackets/>
                <div style={{ background:cardBg, border:"1px solid rgba(212,175,100,0.13)", borderRadius:3, padding:"24px 28px", boxShadow:"0 8px 32px rgba(0,0,0,0.4)" }}>
                  <SectionLabel n={2} title="Your Order"
                    icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/></svg>}/>

                  {cart.restaurantName && (
                    <div style={{ padding:"8px 12px", background:goldFaint, border:`1px solid ${goldBorder}`, borderRadius:2, marginBottom:14 }}>
                      <p style={{ fontSize:10, color:textMuted, letterSpacing:"0.14em", textTransform:"uppercase", marginBottom:2 }}>From</p>
                      <p style={{ fontFamily:"'Playfair Display',serif", fontSize:14, color:gold }}>{cart.restaurantName}</p>
                    </div>
                  )}

                  {/* Items list */}
                  {cart.items.map((item, idx) => (
                    <div key={item._id} style={{ display:"flex", alignItems:"center", gap:12, padding:"11px 0", borderBottom: idx < cart.items.length-1 ? "1px solid rgba(212,175,100,0.06)" : "none" }}>
                      {item.imageUrl
                        ? <img src={item.imageUrl} alt={item.name} style={{ width:44, height:44, borderRadius:2, objectFit:"cover", flexShrink:0, opacity:0.85 }}/>
                        : <div style={{ width:44, height:44, borderRadius:2, background:goldFaint, display:"flex", alignItems:"center", justifyContent:"center", fontSize:18, flexShrink:0, opacity:0.4 }}>🍽️</div>
                      }
                      <div style={{ flex:1, minWidth:0 }}>
                        <p style={{ color:"#f0e6cc", fontSize:13, fontWeight:500, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{item.name}</p>
                        <p style={{ color:textMuted, fontSize:11, marginTop:2 }}>× {item.quantity}</p>
                      </div>
                      <p style={{ color:gold, fontSize:13, fontWeight:600, flexShrink:0 }}>₹{item.price * item.quantity}</p>
                    </div>
                  ))}

                  {/* Bill */}
                  <div style={{ marginTop:18, paddingTop:14, borderTop:"1px solid rgba(212,175,100,0.1)" }}>
                    {[
                      { label:"Subtotal",    val:`₹${subtotal}` },
                      { label:"Delivery",    val: deliveryFee === 0 ? "FREE" : `₹${deliveryFee}`, green: deliveryFee===0 },
                      { label:"Platform",    val:`₹${platformFee}` },
                      { label:"GST (5%)",    val:`₹${gst}` },
                      ...(tip > 0 ? [{ label:"Tip", val:`₹${tip}` }] : []),
                    ].map(r => (
                      <div key={r.label} style={{ display:"flex", justifyContent:"space-between", marginBottom:7 }}>
                        <span style={{ color:textMuted, fontSize:12 }}>{r.label}</span>
                        <span style={{ color: (r as any).green ? "#4ade80" : textBody, fontSize:12 }}>{r.val}</span>
                      </div>
                    ))}
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", paddingTop:12, marginTop:4, borderTop:"1px solid rgba(212,175,100,0.1)" }}>
                      <span style={{ fontFamily:"'Playfair Display',serif", fontSize:15, color:"#f0e6cc" }}>Total</span>
                      <span style={{ fontFamily:"'Playfair Display',serif", fontSize:22, color:gold, fontWeight:500 }}>₹{grandTotal}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ── 3. TIP ── */}
            <div style={{ position:"relative", marginBottom:20 }}>
              <Brackets/>
              <div style={{ background:cardBg, border:"1px solid rgba(212,175,100,0.13)", borderRadius:3, padding:"24px 28px", boxShadow:"0 8px 32px rgba(0,0,0,0.4)" }}>
                <SectionLabel n={3} title="Tip Your Delivery Partner"
                  icon={<span style={{ fontSize:14 }}>❤️</span>}/>
                <p style={{ color:textMuted, fontSize:12, marginBottom:14 }}>100% goes directly to your delivery partner.</p>
                <div style={{ display:"flex", gap:10 }}>
                  {[0, 20, 30, 50].map(amt => (
                    <button key={amt} onClick={() => setTip(amt)} style={{ padding:"9px 18px", borderRadius:2, border:`1px solid ${tip===amt ? "rgba(212,175,100,0.6)" : goldBorder}`, background: tip===amt ? "rgba(212,175,100,0.12)" : "transparent", color: tip===amt ? gold : textMuted, fontFamily:"'DM Sans',sans-serif", fontSize:13, fontWeight: tip===amt ? 700 : 400, cursor:"pointer", minWidth:56 }}>
                      {amt === 0 ? "No tip" : `₹${amt}`}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* ── 4. PAYMENT METHOD ── */}
            <div style={{ position:"relative", marginBottom:24 }}>
              <Brackets/>
              <div style={{ background:cardBg, border:"1px solid rgba(212,175,100,0.13)", borderRadius:3, padding:"24px 28px", boxShadow:"0 8px 32px rgba(0,0,0,0.4)" }}>
                <SectionLabel n={4} title="Payment Method"
                  icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>}/>
                <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                  {([
                    { id:"cod"  as PaymentMethod, icon:"💵", label:"Cash on Delivery",    desc:"Pay when your order arrives" },
                    { id:"upi"  as PaymentMethod, icon:"📱", label:"UPI",                 desc:"Google Pay, PhonePe, Paytm" },
                    { id:"card" as PaymentMethod, icon:"💳", label:"Credit / Debit Card", desc:"Visa, Mastercard, RuPay" },
                  ]).map(opt => {
                    const sel = paymentMethod === opt.id;
                    return (
                      <div key={opt.id} className="pay-opt" onClick={() => setPayMethod(opt.id)}
                        style={{ display:"flex", alignItems:"center", gap:16, padding:"15px 18px", borderRadius:3, border:`1px solid ${sel?"rgba(212,175,100,0.55)":goldBorder}`, background:sel?"rgba(212,175,100,0.08)":"transparent", cursor:"pointer" }}>
                        <span style={{ fontSize:22 }}>{opt.icon}</span>
                        <div style={{ flex:1 }}>
                          <p style={{ color:sel?"#f0e6cc":textBody, fontSize:14, fontWeight:500 }}>{opt.label}</p>
                          <p style={{ color:textMuted, fontSize:11, marginTop:2 }}>{opt.desc}</p>
                        </div>
                        <div style={{ width:18, height:18, borderRadius:"50%", flexShrink:0, border:`2px solid ${sel?gold:"rgba(212,175,100,0.3)"}`, display:"flex", alignItems:"center", justifyContent:"center" }}>
                          {sel && <div style={{ width:8, height:8, borderRadius:"50%", background:gold }}/>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* ── PAY BUTTON ── */}
            <button
              onClick={handlePay}
              disabled={phase === "paying"}
              style={{ width:"100%", padding:"16px 20px", background: phase==="paying" ? "rgba(212,175,100,0.3)" : "linear-gradient(135deg,#b8860b 0%,#daa520 40%,#e8c84a 60%,#b8860b 100%)", border:"none", borderRadius:2, color: phase==="paying" ? "rgba(18,13,0,0.5)" : "#120d00", fontFamily:"'DM Sans',sans-serif", fontSize:12, fontWeight:700, letterSpacing:"0.24em", textTransform:"uppercase", cursor: phase==="paying" ? "not-allowed" : "pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:10, boxShadow:"0 4px 20px rgba(212,175,100,0.2)", transition:"all 0.3s" }}
              onMouseEnter={e => phase!=="paying" && (e.currentTarget.style.boxShadow="0 8px 32px rgba(212,175,100,0.38)")}
              onMouseLeave={e => (e.currentTarget.style.boxShadow="0 4px 20px rgba(212,175,100,0.2)")}
            >
              {phase === "paying"
                ? <><Spin/><span>Processing…</span></>
                : <span>{paymentMethod === "cod" ? `Place Order · ₹${grandTotal}` : `Pay ₹${grandTotal}`}</span>
              }
            </button>

            <p style={{ textAlign:"center", marginTop:12, fontSize:10, color:"rgba(200,175,130,0.2)", letterSpacing:"0.14em" }}>
              🔒 SECURE CHECKOUT · ORDER ID LOCKED BEFORE PAYMENT
            </p>
          </div>
        )}
      </div>
    </>
  );
};

export default CheckoutPage;