import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useApp } from "../Context/MainContext";

const gold = "#d4af64";
const goldBorder = "rgba(212,175,100,0.25)";
const goldFaint = "rgba(212,175,100,0.06)";
const textMuted = "rgba(200,175,130,0.5)";
const textBody = "rgba(200,175,130,0.7)";
const cardBg = "linear-gradient(155deg, rgba(20,15,7,0.98) 0%, rgba(11,8,3,0.99) 100%)";

const ADDRESS_PAYMENT_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;500;600&family=DM+Sans:wght@300;400;500;600&display=swap');
  @keyframes shimmer { 0%{background-position:0% center;} 100%{background-position:200% center;} }
  @keyframes drift1  { 0%,100%{transform:translate(0,0);} 50%{transform:translate(28px,-20px);} }
  @keyframes drift2  { 0%,100%{transform:translate(0,0);} 50%{transform:translate(-22px,-26px);} }
  @keyframes fadeUp  { from{opacity:0;transform:translateY(14px);} to{opacity:1;transform:translateY(0);} }
  .ap-root *, .ap-root *::before, .ap-root *::after { box-sizing: border-box; margin: 0; padding: 0; }
  .ap-input:focus { border-bottom-color: rgba(212,175,100,0.7) !important; outline: none; }
  .ap-input::placeholder { color: rgba(200,180,140,0.22); font-style: italic; }
  .ap-input:-webkit-autofill { -webkit-box-shadow: 0 0 0 1000px #0d0a05 inset !important; -webkit-text-fill-color: #f0e6cc !important; }
  .payment-option { transition: all 0.25s ease; cursor: pointer; }
  .payment-option:hover { border-color: rgba(212,175,100,0.5) !important; background: rgba(212,175,100,0.06) !important; }
`;

const inputStyle: React.CSSProperties = {
  width: "100%",
  background: "transparent",
  border: "none",
  borderBottom: `1px solid ${goldBorder}`,
  padding: "10px 0",
  color: "#f0e6cc",
  fontFamily: "'DM Sans', sans-serif",
  fontSize: 14,
  fontWeight: 300,
  letterSpacing: "0.04em",
  caretColor: gold,
  outline: "none",
  transition: "border-color 0.3s",
};

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: 10,
  letterSpacing: "0.2em",
  textTransform: "uppercase",
  color: "rgba(200,175,130,0.45)",
  marginBottom: 8,
  fontWeight: 500,
};

type PaymentMethod = "cod" | "upi" | "card";

interface CheckoutData {
  address: string;
  landmark: string;
  pincode: string;
  addressType: "home" | "work" | "other";
  paymentMethod: PaymentMethod;
}

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

const SectionHeader: React.FC<{ icon: React.ReactNode; title: string; step: number }> = ({ icon, title, step }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 20 }}>
    <div style={{
      width: 32,
      height: 32,
      borderRadius: "50%",
      background: "rgba(212,175,100,0.08)",
      border: `1px solid ${goldBorder}`,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontSize: 12,
      color: gold,
      fontWeight: 600,
      fontFamily: "'Playfair Display', serif",
    }}>
      {step}
    </div>
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <span style={{ color: gold }}>{icon}</span>
      <h3 style={{
        fontFamily: "'Playfair Display', serif",
        fontSize: 18,
        fontWeight: 500,
        color: "#f0e6cc",
      }}>
        {title}
      </h3>
    </div>
    <div style={{ flex: 1, height: 1, background: "rgba(212,175,100,0.1)" }} />
  </div>
);

const AddressPaymentPage: React.FC = () => {
  const navigate = useNavigate();
  const { location } = useApp();

  const [ready, setReady] = useState(false);

  // Address
  const [address, setAddress] = useState("");
  const [landmark, setLandmark] = useState("");
  const [pincode, setPincode] = useState("");
  const [addressType, setAddressType] = useState<"home" | "work" | "other">("home");

  // Payment
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cod");

  // Load saved data from sessionStorage or pre-fill from geolocation
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem("checkoutAddressPayment");
      if (saved) {
        const parsed = JSON.parse(saved) as CheckoutData;
        setAddress(parsed.address);
        setLandmark(parsed.landmark);
        setPincode(parsed.pincode);
        setAddressType(parsed.addressType);
        setPaymentMethod(parsed.paymentMethod);
      } else if (location?.formattedAddress) {
        setAddress(location.formattedAddress);
      }
    } catch (e) {
      console.error("Error loading saved checkout data:", e);
    }
    setTimeout(() => setReady(true), 60);
  }, [location]);

  const handleContinue = () => {
    if (!address.trim()) {
      alert("Please enter your delivery address");
      return;
    }
    // Save to sessionStorage
    const checkoutData: CheckoutData = {
      address,
      landmark,
      pincode,
      addressType,
      paymentMethod,
    };
    sessionStorage.setItem("checkoutAddressPayment", JSON.stringify(checkoutData));
    navigate("/checkout");
  };

  return (
    <>
      <style>{ADDRESS_PAYMENT_CSS}</style>
      <div className="ap-root" style={{
        minHeight: "100vh",
        width: "100%",
        backgroundColor: "#090705",
        background: "radial-gradient(ellipse at 20% 10%, rgba(201,168,76,0.07) 0%, transparent 50%), radial-gradient(ellipse at 80% 90%, rgba(184,134,11,0.06) 0%, transparent 50%), #090705",
        fontFamily: "'DM Sans', system-ui, sans-serif",
        padding: "40px 16px 100px",
        position: "relative",
        overflow: "hidden",
      }}>
        {/* Ambient orbs */}
        <div style={{
          position: "absolute",
          top: "-8%",
          left: "-4%",
          width: 480,
          height: 480,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(201,168,76,0.1) 0%, transparent 68%)",
          filter: "blur(50px)",
          animation: "drift1 14s ease-in-out infinite",
          pointerEvents: "none",
        }} />
        <div style={{
          position: "absolute",
          bottom: "-10%",
          right: "-6%",
          width: 400,
          height: 400,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(184,134,11,0.09) 0%, transparent 68%)",
          filter: "blur(55px)",
          animation: "drift2 17s ease-in-out infinite",
          pointerEvents: "none",
        }} />

        <div style={{
          position: "relative",
          zIndex: 10,
          maxWidth: 600,
          margin: "0 auto",
          opacity: ready ? 1 : 0,
          transform: ready ? "translateY(0)" : "translateY(16px)",
          transition: "opacity 0.6s cubic-bezier(.16,1,.3,1), transform 0.6s cubic-bezier(.16,1,.3,1)",
        }}>
          {/* Back button */}
          <button
            onClick={() => navigate(-1)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              marginBottom: 28,
              background: "transparent",
              border: "none",
              color: "rgba(200,175,130,0.45)",
              fontFamily: "'DM Sans', sans-serif",
              fontSize: 12,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              cursor: "pointer",
              padding: 0,
              transition: "color 0.2s",
            }}
            onMouseEnter={e => (e.currentTarget.style.color = gold)}
            onMouseLeave={e => (e.currentTarget.style.color = "rgba(200,175,130,0.45)")}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
            Back
          </button>

          {/* Header */}
          <div style={{ marginBottom: 40 }}>
            <h1 style={{
              fontFamily: "'Playfair Display', Georgia, serif",
              fontSize: "clamp(26px, 4vw, 38px)",
              fontWeight: 500,
              lineHeight: 1.15,
              background: "linear-gradient(90deg, #b8860b, #f0d070, #daa520, #c9a84c, #b8860b)",
              backgroundSize: "300% auto",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
              animation: "shimmer 6s linear infinite",
              marginBottom: 8,
            }}>
              Delivery & Payment
            </h1>
            <p style={{ fontSize: 13, color: textMuted, letterSpacing: "0.04em" }}>
              Step 1 of 2: Enter address and choose payment method
            </p>
          </div>

          {/* Address Section */}
          <div style={{ position: "relative", marginBottom: 28 }}>
            <CornerBrackets />
            <div style={{
              background: cardBg,
              border: "1px solid rgba(212,175,100,0.13)",
              borderRadius: 3,
              padding: "28px 28px",
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
                title="Delivery Address"
              />

              {/* Address type tabs */}
              <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
                {(["home", "work", "other"] as const).map(type => (
                  <button
                    key={type}
                    onClick={() => setAddressType(type)}
                    style={{
                      padding: "7px 18px",
                      borderRadius: 2,
                      border: `1px solid ${addressType === type ? "rgba(212,175,100,0.6)" : goldBorder}`,
                      background: addressType === type ? "rgba(212,175,100,0.12)" : "transparent",
                      color: addressType === type ? gold : textMuted,
                      fontFamily: "'DM Sans', sans-serif",
                      fontSize: 11,
                      fontWeight: addressType === type ? 600 : 400,
                      letterSpacing: "0.14em",
                      textTransform: "uppercase",
                      cursor: "pointer",
                      transition: "all 0.2s",
                    }}
                  >
                    {type === "home" ? "🏠 " : type === "work" ? "🏢 " : "📍 "}{type}
                  </button>
                ))}
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                <div>
                  <label style={labelStyle}>Full Address *</label>
                  <textarea
                    className="ap-input"
                    value={address}
                    onChange={e => setAddress(e.target.value)}
                    placeholder="Enter your delivery address..."
                    rows={3}
                    style={{ ...inputStyle, resize: "none", borderBottom: `1px solid ${goldBorder}` }}
                  />
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
                  <div>
                    <label style={labelStyle}>Landmark</label>
                    <input
                      className="ap-input"
                      type="text"
                      value={landmark}
                      onChange={e => setLandmark(e.target.value)}
                      placeholder="Near park, temple etc."
                      style={inputStyle}
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>Pincode</label>
                    <input
                      className="ap-input"
                      type="text"
                      value={pincode}
                      onChange={e => setPincode(e.target.value)}
                      placeholder="e.g. 250001"
                      maxLength={6}
                      style={inputStyle}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Payment Method Section */}
          <div style={{ position: "relative", marginBottom: 28 }}>
            <CornerBrackets />
            <div style={{
              background: cardBg,
              border: "1px solid rgba(212,175,100,0.13)",
              borderRadius: 3,
              padding: "28px 28px",
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

              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {([
                  { id: "cod" as PaymentMethod, icon: "💵", label: "Cash on Delivery", desc: "Pay when your order arrives" },
                  { id: "upi" as PaymentMethod, icon: "📱", label: "UPI", desc: "Google Pay, PhonePe, Paytm" },
                  { id: "card" as PaymentMethod, icon: "💳", label: "Credit / Debit Card", desc: "Visa, Mastercard, RuPay" },
                ]).map(opt => {
                  const selected = paymentMethod === opt.id;
                  return (
                    <div
                      key={opt.id}
                      className="payment-option"
                      onClick={() => setPaymentMethod(opt.id)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 16,
                        padding: "16px 18px",
                        borderRadius: 3,
                        border: `1px solid ${selected ? "rgba(212,175,100,0.55)" : goldBorder}`,
                        background: selected ? "rgba(212,175,100,0.08)" : "transparent",
                        boxShadow: selected ? "0 0 20px rgba(212,175,100,0.08)" : "none",
                      }}
                    >
                      <span style={{ fontSize: 22 }}>{opt.icon}</span>
                      <div style={{ flex: 1 }}>
                        <p style={{
                          color: selected ? "#f0e6cc" : textBody,
                          fontSize: 14,
                          fontWeight: 500,
                          transition: "color 0.2s",
                        }}>{opt.label}</p>
                        <p style={{ color: textMuted, fontSize: 11, marginTop: 2 }}>{opt.desc}</p>
                      </div>
                      <div style={{
                        width: 18,
                        height: 18,
                        borderRadius: "50%",
                        flexShrink: 0,
                        border: `2px solid ${selected ? gold : "rgba(212,175,100,0.3)"}`,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        transition: "all 0.2s",
                      }}>
                        {selected && (
                          <div style={{
                            width: 8,
                            height: 8,
                            borderRadius: "50%",
                            background: gold,
                          }} />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Continue Button */}
          <button
            onClick={handleContinue}
            style={{
              width: "100%",
              padding: "16px 20px",
              background: "linear-gradient(135deg, #b8860b 0%, #daa520 40%, #e8c84a 60%, #b8860b 100%)",
              border: "none",
              borderRadius: 2,
              color: "#120d00",
              fontFamily: "'DM Sans', sans-serif",
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: "0.24em",
              textTransform: "uppercase",
              cursor: "pointer",
              transition: "all 0.35s",
              boxShadow: "0 4px 20px rgba(212,175,100,0.2)",
            }}
            onMouseEnter={e => (e.currentTarget.style.boxShadow = "0 8px 32px rgba(212,175,100,0.35)")}
            onMouseLeave={e => (e.currentTarget.style.boxShadow = "0 4px 20px rgba(212,175,100,0.2)")}
          >
            Continue to Checkout
          </button>
        </div>
      </div>
    </>
  );
};

export default AddressPaymentPage;
