import React, { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useApp } from "../Context/MainContext";

// npm install leaflet react-leaflet
// npm install -D @types/leaflet
import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// ── Import all backend calls from api.ts ──────────────────────
import {
  validateAndSaveAddress,
  savePaymentMethod,
  reverseGeocodeLatLng,
  type AddressPayload,
} from "../services/api"; // ← adjust path if api.ts is elsewhere

// Fix leaflet default marker icons (broken in webpack/vite)
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

const goldIcon = new L.Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-gold.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

// ─── THEME ────────────────────────────────────────────────────
const gold = "#d4af64";
const goldBorder = "rgba(212,175,100,0.25)";
const textMuted = "rgba(200,175,130,0.5)";
const textBody = "rgba(200,175,130,0.7)";
const cardBg = "linear-gradient(155deg, rgba(20,15,7,0.98) 0%, rgba(11,8,3,0.99) 100%)";

type PaymentMethod = "cod" | "upi" | "card";
interface LatLng { lat: number; lng: number }

// ─── MAP CLICK HANDLER ────────────────────────────────────────
const MapClickHandler: React.FC<{ onLocationSelect: (ll: LatLng) => void }> = ({ onLocationSelect }) => {
  useMapEvents({ click(e) { onLocationSelect({ lat: e.latlng.lat, lng: e.latlng.lng }); } });
  return null;
};

// ─── CSS ──────────────────────────────────────────────────────
const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;500;600&family=DM+Sans:wght@300;400;500;600&display=swap');
  @keyframes shimmer { 0%{background-position:0% center;} 100%{background-position:200% center;} }
  @keyframes drift1  { 0%,100%{transform:translate(0,0);} 50%{transform:translate(28px,-20px);} }
  @keyframes drift2  { 0%,100%{transform:translate(0,0);} 50%{transform:translate(-22px,-26px);} }
  @keyframes spin    { to{transform:rotate(360deg);} }
  .ap-root *:not(.leaflet-container *) { box-sizing:border-box; margin:0; padding:0; }
  .ap-input:focus { border-bottom-color: rgba(212,175,100,0.7) !important; outline:none; }
  .ap-input::placeholder { color:rgba(200,180,140,0.22); font-style:italic; }
  .ap-input:-webkit-autofill { -webkit-box-shadow:0 0 0 1000px #0d0a05 inset !important; -webkit-text-fill-color:#f0e6cc !important; }
  .payment-option:hover { border-color:rgba(212,175,100,0.5) !important; background:rgba(212,175,100,0.06) !important; }

  /* ── FIX: Leaflet map MUST have explicit height ── */
  .leaflet-container {
    height: 320px !important;   /* ← This is the most common fix for blank maps */
    width: 100% !important;
    background: #0d0a05 !important;
    font-family: 'DM Sans', sans-serif !important;
    border-radius: 3px;
  }
  .leaflet-control-zoom a { background:rgba(20,15,7,0.95) !important; border-color:rgba(212,175,100,0.25) !important; color:#d4af64 !important; }
  .leaflet-control-zoom a:hover { background:rgba(212,175,100,0.1) !important; }
  .leaflet-control-attribution { background:rgba(9,7,5,0.8) !important; color:rgba(200,175,130,0.3) !important; font-size:9px !important; }
  .leaflet-control-attribution a { color:rgba(212,175,100,0.4) !important; }
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

// ─── SUB-COMPONENTS ───────────────────────────────────────────
const CornerBrackets = () => (
  <>
    {[
      { top: 0, left: 0, borderTop: `1px solid ${goldBorder}`, borderLeft: `1px solid ${goldBorder}` },
      { top: 0, right: 0, borderTop: `1px solid ${goldBorder}`, borderRight: `1px solid ${goldBorder}` },
      { bottom: 0, left: 0, borderBottom: `1px solid ${goldBorder}`, borderLeft: `1px solid ${goldBorder}` },
      { bottom: 0, right: 0, borderBottom: `1px solid ${goldBorder}`, borderRight: `1px solid ${goldBorder}` },
    ].map((s, i) => <div key={i} style={{ position: "absolute", width: 20, height: 20, zIndex: 2, ...s }} />)}
  </>
);

const SectionHeader: React.FC<{ icon: React.ReactNode; title: string; step: number }> = ({ icon, title, step }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 20 }}>
    <div style={{ width: 32, height: 32, borderRadius: "50%", background: "rgba(212,175,100,0.08)", border: `1px solid ${goldBorder}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, color: gold, fontWeight: 600, fontFamily: "'Playfair Display', serif" }}>{step}</div>
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <span style={{ color: gold }}>{icon}</span>
      <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: 18, fontWeight: 500, color: "#f0e6cc" }}>{title}</h3>
    </div>
    <div style={{ flex: 1, height: 1, background: "rgba(212,175,100,0.1)" }} />
  </div>
);

// ─── FIELD COMPONENT (reusable) ───────────────────────────────
const Field: React.FC<{
  label: string;
  required?: boolean;
  loading?: boolean;
  children: React.ReactNode;
}> = ({ label, required, loading, children }) => (
  <div>
    <label style={labelStyle}>
      {label}{required && <span style={{ color: gold }}> *</span>}
      {loading && <span style={{ marginLeft: 8, color: "rgba(212,175,100,0.45)", fontSize: 9 }}>● fetching…</span>}
    </label>
    {children}
  </div>
);

// ─── MAIN PAGE ────────────────────────────────────────────────
const AddressPaymentPage: React.FC = () => {
  const navigate = useNavigate();
  const { location } = useApp();

  const [ready, setReady] = useState(false);
  const [mapReady, setMapReady] = useState(false);

  // ── Address fields (expanded) ──
  const [addressLine1, setAddressLine1] = useState(""); // e.g. "House 12, Lane 5"
  const [addressLine2, setAddressLine2] = useState(""); 
  const [landmark, setLandmark] = useState(""); // e.g. "Near Metro Station"
  const [city, setCity] = useState(""); // e.g. "Meerut"
  const [state, setState] = useState(""); // e.g. "Uttar Pradesh"
  const [pincode, setPincode] = useState(""); // e.g. "250001"
  const [addressType, setAddressType] = useState<"home" | "work" | "other">("home");
  const [phoneNumber, setPhoneNumber] = useState(""); // ← NEW: For delivery contact

  // ── Payment ──
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cod");

  // ── Map ──
  const [markerPos, setMarkerPos] = useState<LatLng | null>(null);
  const [mapCenter, setMapCenter] = useState<LatLng>({ lat: 28.9845, lng: 77.7064 }); // Meerut default
  const [reverseLoading, setReverseLoading] = useState(false);
  const [locating, setLocating] = useState(false);

  // ── UI state ──
  const [placing, setPlacing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── On mount: load saved session data or pre-fill from location context ──
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem("checkoutAddressPayment");
      if (saved) {
        const p = JSON.parse(saved);
        setAddressLine1(p.addressLine1 ?? "");
        setAddressLine2(p.addressLine2 ?? "");
        setLandmark(p.landmark ?? "");
        setCity(p.city ?? "");
        setState(p.state ?? "");
        setPincode(p.pincode ?? "");
        setAddressType(p.addressType ?? "home");
        setPaymentMethod(p.paymentMethod ?? "cod");
        setPhoneNumber(p.phoneNumber ?? ""); // ← NEW: Restore phone
        if (p.lat && p.lng) {
          const pos = { lat: p.lat, lng: p.lng };
          setMarkerPos(pos);
          setMapCenter(pos);
        }
      } else if (location?.latitude && location?.longitude) {
        const pos = { lat: location.latitude, lng: location.longitude };
        setMarkerPos(pos);
        setMapCenter(pos);
        if (location.formattedAddress) setAddressLine1(location.formattedAddress);
      }
    } catch (e) { console.error(e); }

    setTimeout(() => setReady(true), 80);

    setTimeout(() => setMapReady(true), 300);
  }, [location]);

  
  const doReverseGeocode = useCallback(async (lat: number, lng: number) => {
    setReverseLoading(true);
    try {
      const result = await reverseGeocodeLatLng(lat, lng); 
      if (result.displayName) setAddressLine1(result.displayName);
      if (result.city) setCity(result.city);
      if (result.state) setState(result.state);
      if (result.pincode) setPincode(result.pincode);
    } catch (e) {
      console.error("Reverse geocode error:", e);
    } finally {
      setReverseLoading(false);
    }
  }, []);

  
  const handleMapClick = useCallback((latlng: LatLng) => {
    setMarkerPos(latlng);
    doReverseGeocode(latlng.lat, latlng.lng);
  }, [doReverseGeocode]);

  // ── GPS "Use my location" ──
  const handleLocateMe = () => {
    if (!navigator.geolocation) { alert("Geolocation not supported"); return; }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const latlng = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setMarkerPos(latlng);
        setMapCenter(latlng);
        await doReverseGeocode(latlng.lat, latlng.lng);
        setLocating(false);
      },
      (err) => {
        console.error(err);
        setLocating(false);
        alert("Could not get location. Please pin manually on the map.");
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  // ── Continue → calls backend via api.ts ──────────────────────
  //
  //  HOW IT CONNECTS TO BACKEND:
  //  1. Calls validateAndSaveAddress() from api.ts
  //  2. api.ts sends POST to BASE_URL + "/api/v1/user/address/validate"
  //  3. Then calls savePaymentMethod() from api.ts
  //  4. api.ts sends POST to BASE_URL + "/api/v1/checkout/payment/select"
  //  5. On success, saves to sessionStorage and navigates to /checkout
  //
  const handleContinue = async () => {
    setError(null);
    if (!addressLine1.trim()) { setError("Please enter or pin your delivery address"); return; }
    if (!city.trim()) { setError("Please enter your city"); return; }
    if (!state.trim()) { setError("Please enter your state"); return; }
    if (!pincode.trim()) { setError("Please enter your pincode"); return; }
    if (!phoneNumber.trim()) { setError("Please enter your phone number"); return; } // ← NEW: Validate phone

    setPlacing(true);
    try {
      // ── Step 1: Save address to backend ──
      const addressPayload: AddressPayload = {
        fullAddress: addressLine1,
        addressLine2,
        landmark,
        city,
        state,
        pincode,
        addressType,
        coordinates: markerPos ?? null,
      };
      const addrRes = await validateAndSaveAddress(addressPayload);
      if (!addrRes.success) {
        setError(addrRes.message ?? "Address validation failed");
        setPlacing(false);
        return;
      }

      const payRes = await savePaymentMethod({ paymentMethod });
      if (!payRes.success) {
        setError(payRes.message ?? "Payment setup failed");
        setPlacing(false);
        return;
      }

      // ← CRITICAL FIX: Save addressId for checkout
      sessionStorage.setItem("checkoutAddressPayment", JSON.stringify({
        addressId: addrRes.addressId, // ← Store for order creation
        paymentMethod,
        addressLine1, city, state, pincode, // ← For reference
        lat: markerPos?.lat, lng: markerPos?.lng,
        checkoutToken: payRes.checkoutToken,
        phoneNumber, // ← NEW: For delivery contact
      }));

      navigate("/checkout");
    } catch (err) {
      console.error(err);
      // ── Fallback: if backend is unreachable, still allow flow ──
      sessionStorage.setItem("checkoutAddressPayment", JSON.stringify({
        addressLine1, addressLine2, landmark, city, state, pincode,
        addressType, paymentMethod,
        lat: markerPos?.lat, lng: markerPos?.lng,
      }));
      navigate("/checkout");
    } finally {
      setPlacing(false);
    }
  };

  // ─── RENDER ──────────────────────────────────────────────────
  return (
    <>
      <style>{CSS}</style>
      <div className="ap-root" style={{
        minHeight: "100vh", width: "100%",
        backgroundColor: "#090705",
        background: "radial-gradient(ellipse at 20% 10%, rgba(201,168,76,0.07) 0%, transparent 50%), radial-gradient(ellipse at 80% 90%, rgba(184,134,11,0.06) 0%, transparent 50%), #090705",
        fontFamily: "'DM Sans', system-ui, sans-serif",
        padding: "40px 16px 100px",
        position: "relative", overflow: "hidden",
      }}>
        {/* Ambient orbs */}
        <div style={{ position: "absolute", top: "-8%", left: "-4%", width: 480, height: 480, borderRadius: "50%", background: "radial-gradient(circle, rgba(201,168,76,0.1) 0%, transparent 68%)", filter: "blur(50px)", animation: "drift1 14s ease-in-out infinite", pointerEvents: "none" }} />
        <div style={{ position: "absolute", bottom: "-10%", right: "-6%", width: 400, height: 400, borderRadius: "50%", background: "radial-gradient(circle, rgba(184,134,11,0.09) 0%, transparent 68%)", filter: "blur(55px)", animation: "drift2 17s ease-in-out infinite", pointerEvents: "none" }} />

        <div style={{
          position: "relative", zIndex: 10, maxWidth: 680, margin: "0 auto",
          opacity: ready ? 1 : 0, transform: ready ? "translateY(0)" : "translateY(16px)",
          transition: "opacity 0.6s cubic-bezier(.16,1,.3,1), transform 0.6s cubic-bezier(.16,1,.3,1)",
        }}>
          {/* Back */}
          <button onClick={() => navigate(-1)} style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 28, background: "transparent", border: "none", color: "rgba(200,175,130,0.45)", fontFamily: "'DM Sans', sans-serif", fontSize: 12, letterSpacing: "0.14em", textTransform: "uppercase", cursor: "pointer", padding: 0, transition: "color 0.2s" }}
            onMouseEnter={e => (e.currentTarget.style.color = gold)}
            onMouseLeave={e => (e.currentTarget.style.color = "rgba(200,175,130,0.45)")}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="15 18 9 12 15 6" /></svg>
            Back
          </button>

          {/* Page title */}
          <div style={{ marginBottom: 32 }}>
            <h1 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: "clamp(26px,4vw,36px)", fontWeight: 500, background: "linear-gradient(90deg, #b8860b, #f0d070, #daa520, #c9a84c, #b8860b)", backgroundSize: "300% auto", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text", animation: "shimmer 6s linear infinite", marginBottom: 8 }}>
              Delivery & Payment
            </h1>
            <p style={{ fontSize: 13, color: textMuted, letterSpacing: "0.04em" }}>Pin your location, fill address details, then proceed</p>
          </div>

          {/* ── STEP 1: MAP ───────────────────────────────────── */}
          <div style={{ position: "relative", marginBottom: 28 }}>
            <CornerBrackets />
            <div style={{ background: cardBg, border: "1px solid rgba(212,175,100,0.13)", borderRadius: 3, padding: "28px 28px", boxShadow: "0 12px 48px rgba(0,0,0,0.5)" }}>
              <SectionHeader step={1} title="Pin Your Location"
                icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" /><circle cx="12" cy="9" r="2.5" /></svg>}
              />

              <button onClick={handleLocateMe} disabled={locating} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16, padding: "9px 18px", background: "rgba(212,175,100,0.08)", border: `1px solid ${goldBorder}`, borderRadius: 2, color: gold, fontFamily: "'DM Sans', sans-serif", fontSize: 11, fontWeight: 500, letterSpacing: "0.16em", textTransform: "uppercase", cursor: locating ? "not-allowed" : "pointer", transition: "all 0.25s" }}
                onMouseEnter={e => !locating && (e.currentTarget.style.background = "rgba(212,175,100,0.14)")}
                onMouseLeave={e => (e.currentTarget.style.background = "rgba(212,175,100,0.08)")}>
                {locating
                  ? <><svg style={{ animation: "spin 0.8s linear infinite" }} width="14" height="14" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" opacity="0.2" /><path d="M12 2a10 10 0 0110 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" /></svg> Locating…</>
                  : <><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg> Use My Current Location</>
                }
              </button>

              {/* ── MAP: rendered only when mapReady=true ── */}
              <div style={{ borderRadius: 3, overflow: "hidden", border: `1px solid ${goldBorder}`, position: "relative", minHeight: 320 }}>
                <div style={{ position: "absolute", top: 10, left: "50%", transform: "translateX(-50%)", zIndex: 1000, background: "rgba(9,7,5,0.85)", border: `1px solid ${goldBorder}`, borderRadius: 2, padding: "6px 12px", backdropFilter: "blur(8px)", pointerEvents: "none" }}>
                  <span style={{ fontSize: 10, color: "rgba(212,175,100,0.6)", letterSpacing: "0.14em", textTransform: "uppercase" }}>📍 Tap map to drop pin</span>
                </div>

                {!mapReady && (
                  <div style={{ height: 320, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(13,10,5,0.8)" }}>
                    <svg style={{ animation: "spin 1s linear infinite" }} width="24" height="24" viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="12" r="10" stroke={gold} strokeWidth="2" opacity="0.2" />
                      <path d="M12 2a10 10 0 0110 10" stroke={gold} strokeWidth="2" strokeLinecap="round" />
                    </svg>
                  </div>
                )}

                {mapReady && (
                  <MapContainer
                    key={`${mapCenter.lat}-${mapCenter.lng}`} // ← re-mounts map when center changes
                    center={[mapCenter.lat, mapCenter.lng]}
                    zoom={15}
                    style={{ height: 320, width: "100%" }}
                    zoomControl={true}
                  >
                    <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='&copy; OpenStreetMap contributors' />
                    <MapClickHandler onLocationSelect={handleMapClick} />
                    {markerPos && (
                      <Marker
                        position={[markerPos.lat, markerPos.lng]}
                        icon={goldIcon}
                        draggable={true}
                        eventHandlers={{
                          dragend(e) {
                            const p = e.target.getLatLng();
                            const ll = { lat: p.lat, lng: p.lng };
                            setMarkerPos(ll);
                            doReverseGeocode(p.lat, p.lng);
                          },
                        }}
                      />
                    )}
                  </MapContainer>
                )}
              </div>

              {markerPos && (
                <div style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ width: 6, height: 6, borderRadius: "50%", background: "rgba(212,175,100,0.6)", flexShrink: 0 }} />
                  <span style={{ fontSize: 11, color: textMuted }}>
                    {markerPos.lat.toFixed(6)}, {markerPos.lng.toFixed(6)}
                  </span>
                  {reverseLoading && (
                    <svg style={{ animation: "spin 0.8s linear infinite" }} width="12" height="12" viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="12" r="10" stroke={gold} strokeWidth="3" opacity="0.2" />
                      <path d="M12 2a10 10 0 0110 10" stroke={gold} strokeWidth="3" strokeLinecap="round" />
                    </svg>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* ── STEP 2: ADDRESS FIELDS ────────────────────────── */}
          <div style={{ position: "relative", marginBottom: 28 }}>
            <CornerBrackets />
            <div style={{ background: cardBg, border: "1px solid rgba(212,175,100,0.13)", borderRadius: 3, padding: "28px 28px", boxShadow: "0 12px 48px rgba(0,0,0,0.5)" }}>
              <SectionHeader step={2} title="Confirm Address"
                icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg>}
              />

              {/* Address type tabs */}
              <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
                {(["home", "work", "other"] as const).map(type => (
                  <button key={type} onClick={() => setAddressType(type)} style={{ padding: "7px 18px", borderRadius: 2, border: `1px solid ${addressType === type ? "rgba(212,175,100,0.6)" : goldBorder}`, background: addressType === type ? "rgba(212,175,100,0.12)" : "transparent", color: addressType === type ? gold : textMuted, fontFamily: "'DM Sans', sans-serif", fontSize: 11, fontWeight: addressType === type ? 600 : 400, letterSpacing: "0.14em", textTransform: "uppercase", cursor: "pointer", transition: "all 0.2s" }}>
                    {type === "home" ? "🏠 " : type === "work" ? "🏢 " : "📍 "}{type}
                  </button>
                ))}
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

                {/* Address Line 1 — auto-filled from map */}
                <Field label="Address Line 1 (House / Flat / Building)" required loading={reverseLoading}>
                  <textarea
                    className="ap-input"
                    value={addressLine1}
                    onChange={e => setAddressLine1(e.target.value)}
                    placeholder="House No. 12, Street / Colony name…"
                    rows={2}
                    style={{ ...inputStyle, resize: "none" }}
                  />
                </Field>

                {/* Address Line 2 */}
                <Field label="Address Line 2 (Area / Sector / Locality)">
                  <input
                    className="ap-input"
                    type="text"
                    value={addressLine2}
                    onChange={e => setAddressLine2(e.target.value)}
                    placeholder="Sector 14, Near Shastri Nagar…"
                    style={inputStyle}
                  />
                </Field>

                {/* Landmark */}
                <Field label="Landmark">
                  <input
                    className="ap-input"
                    type="text"
                    value={landmark}
                    onChange={e => setLandmark(e.target.value)}
                    placeholder="Near Metro Station, Opposite Park…"
                    style={inputStyle}
                  />
                </Field>

                {/* City + State */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
                  <Field label="City" required>
                    <input
                      className="ap-input"
                      type="text"
                      value={city}
                      onChange={e => setCity(e.target.value)}
                      placeholder="Meerut"
                      style={inputStyle}
                    />
                  </Field>
                  <Field label="State" required>
                    <input
                      className="ap-input"
                      type="text"
                      value={state}
                      onChange={e => setState(e.target.value)}
                      placeholder="Uttar Pradesh"
                      style={inputStyle}
                    />
                  </Field>
                </div>

                {/* Pincode */}
                <Field label="Pincode" required>
                  <input
                    className="ap-input"
                    type="text"
                    value={pincode}
                    onChange={e => setPincode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    placeholder="e.g. 250001"
                    maxLength={6}
                    style={{ ...inputStyle, maxWidth: 200 }}
                  />
                </Field>

                {/* Phone Number — NEW ← */}
                <Field label="Phone Number for Delivery" required>
                  <input
                    className="ap-input"
                    type="tel"
                    value={phoneNumber}
                    onChange={e => setPhoneNumber(e.target.value.replace(/\D/g, "").slice(0, 10))}
                    placeholder="10-digit mobile number"
                    maxLength={10}
                    style={{ ...inputStyle, maxWidth: 240 }}
                  />
                </Field>

              </div>
            </div>
          </div>

          {/* ── STEP 3: PAYMENT ───────────────────────────────── */}
          <div style={{ position: "relative", marginBottom: 28 }}>
            <CornerBrackets />
            <div style={{ background: cardBg, border: "1px solid rgba(212,175,100,0.13)", borderRadius: 3, padding: "28px 28px", boxShadow: "0 12px 48px rgba(0,0,0,0.5)" }}>
              <SectionHeader step={3} title="Payment Method"
                icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><rect x="1" y="4" width="22" height="16" rx="2" /><line x1="1" y1="10" x2="23" y2="10" /></svg>}
              />
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {([
                  { id: "cod" as PaymentMethod, icon: "💵", label: "Cash on Delivery", desc: "Pay when your order arrives" },
                  { id: "upi" as PaymentMethod, icon: "📱", label: "UPI", desc: "Google Pay, PhonePe, Paytm" },
                  { id: "card" as PaymentMethod, icon: "💳", label: "Credit / Debit Card", desc: "Visa, Mastercard, RuPay" },
                ]).map(opt => {
                  const sel = paymentMethod === opt.id;
                  return (
                    <div key={opt.id} className="payment-option" onClick={() => setPaymentMethod(opt.id)} style={{ display: "flex", alignItems: "center", gap: 16, padding: "16px 18px", borderRadius: 3, border: `1px solid ${sel ? "rgba(212,175,100,0.55)" : goldBorder}`, background: sel ? "rgba(212,175,100,0.08)" : "transparent", cursor: "pointer", transition: "all 0.25s" }}>
                      <span style={{ fontSize: 22 }}>{opt.icon}</span>
                      <div style={{ flex: 1 }}>
                        <p style={{ color: sel ? "#f0e6cc" : textBody, fontSize: 14, fontWeight: 500 }}>{opt.label}</p>
                        <p style={{ color: textMuted, fontSize: 11, marginTop: 2 }}>{opt.desc}</p>
                      </div>
                      <div style={{ width: 18, height: 18, borderRadius: "50%", flexShrink: 0, border: `2px solid ${sel ? gold : "rgba(212,175,100,0.3)"}`, display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.2s" }}>
                        {sel && <div style={{ width: 8, height: 8, borderRadius: "50%", background: gold }} />}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Error message */}
          {error && (
            <div style={{ marginBottom: 16, padding: "12px 16px", background: "rgba(220,50,50,0.1)", border: "1px solid rgba(220,50,50,0.25)", borderRadius: 3, color: "rgba(255,150,130,0.9)", fontSize: 13, letterSpacing: "0.02em" }}>
              ⚠ {error}
            </div>
          )}

          {/* ── CONTINUE BUTTON ── */}
          <button onClick={handleContinue} disabled={placing} style={{ width: "100%", padding: "16px 20px", background: placing ? "rgba(212,175,100,0.3)" : "linear-gradient(135deg, #b8860b 0%, #daa520 40%, #e8c84a 60%, #b8860b 100%)", border: "none", borderRadius: 2, color: placing ? "rgba(18,13,0,0.5)" : "#120d00", fontFamily: "'DM Sans', sans-serif", fontSize: 12, fontWeight: 700, letterSpacing: "0.24em", textTransform: "uppercase", cursor: placing ? "not-allowed" : "pointer", transition: "all 0.35s", boxShadow: "0 4px 20px rgba(212,175,100,0.2)", display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }}
            onMouseEnter={e => !placing && (e.currentTarget.style.boxShadow = "0 8px 32px rgba(212,175,100,0.38)")}
            onMouseLeave={e => (e.currentTarget.style.boxShadow = "0 4px 20px rgba(212,175,100,0.2)")}>
            {placing
              ? <><svg style={{ animation: "spin 0.8s linear infinite" }} width="14" height="14" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" opacity="0.2" /><path d="M12 2a10 10 0 0110 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" /></svg><span>Validating…</span></>
              : <span>Continue to Checkout →</span>
            }
          </button>

          <p style={{ textAlign: "center", marginTop: 12, fontSize: 10, color: "rgba(200,175,130,0.2)", letterSpacing: "0.14em" }}>
            🔒 YOUR LOCATION IS ONLY USED FOR DELIVERY
          </p>
        </div>
      </div>
    </>
  );
};

export default AddressPaymentPage;