import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useApp } from "../Context/MainContext";
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import toast from "react-hot-toast";
import { validateAndSaveAddress, reverseGeocodeLatLng, AddressPayload } from "../services/api";

// ── Fix leaflet default marker icons ──────────────────────────────
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl:       "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl:     "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

const goldIcon = new L.Icon({
  iconUrl:     "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-gold.png",
  shadowUrl:   "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize:    [25, 41], iconAnchor:  [12, 41],
  popupAnchor: [1, -34], shadowSize:  [41, 41],
});

// ── Design tokens ──────────────────────────────────────────────────
const gold       = "#d4af64";
const goldBorder = "rgba(212,175,100,0.25)";
const textMuted  = "rgba(200,175,130,0.5)";
const textBody   = "rgba(200,175,130,0.7)";
const cardBg     = "linear-gradient(155deg, rgba(20,15,7,0.98) 0%, rgba(11,8,3,0.99) 100%)";

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

// ── CSS ────────────────────────────────────────────────────────────
const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;500;600&family=DM+Sans:wght@300;400;500;600&display=swap');
  @keyframes shimmer { 0%{background-position:0% center;} 100%{background-position:200% center;} }
  @keyframes drift1  { 0%,100%{transform:translate(0,0);} 50%{transform:translate(28px,-20px);} }
  @keyframes drift2  { 0%,100%{transform:translate(0,0);} 50%{transform:translate(-22px,-26px);} }
  @keyframes spin    { to{transform:rotate(360deg);} }
  .ap-root *, .ap-root *::before, .ap-root *::after { box-sizing: border-box; margin: 0; padding: 0; }
  .ap-input:focus { border-bottom-color: rgba(212,175,100,0.7) !important; outline: none; }
  .ap-input::placeholder { color: rgba(200,180,140,0.22); font-style: italic; }
  .ap-input:-webkit-autofill { -webkit-box-shadow: 0 0 0 1000px #0d0a05 inset !important; -webkit-text-fill-color: #f0e6cc !important; }
  .leaflet-container { background: #0d0a05 !important; font-family: 'DM Sans', sans-serif !important; border-radius: 3px; }
  .leaflet-control-zoom a { background: rgba(20,15,7,0.95) !important; border-color: rgba(212,175,100,0.25) !important; color: #d4af64 !important; }
  .leaflet-control-zoom a:hover { background: rgba(212,175,100,0.1) !important; }
  .leaflet-control-attribution { background: rgba(9,7,5,0.8) !important; color: rgba(200,175,130,0.3) !important; font-size: 9px !important; }
  .leaflet-control-attribution a { color: rgba(212,175,100,0.4) !important; }
`;

// ── Types ──────────────────────────────────────────────────────────
interface LatLng { lat: number; lng: number; }

// ── Map helpers ────────────────────────────────────────────────────
const MapClickHandler: React.FC<{ onSelect: (ll: LatLng) => void }> = ({ onSelect }) => {
  useMapEvents({ click(e) { onSelect({ lat: e.latlng.lat, lng: e.latlng.lng }); } });
  return null;
};

const MapCenterUpdater: React.FC<{ center: LatLng }> = ({ center }) => {
  const map = useMap();
  useEffect(() => { map.setView([center.lat, center.lng], map.getZoom()); }, [center]);
  return null;
};

// ── Corner brackets ────────────────────────────────────────────────
const Brackets = () => (
  <>
    {[
      { top: 0,    left: 0,  borderTop:    `1px solid ${goldBorder}`, borderLeft:   `1px solid ${goldBorder}` },
      { top: 0,    right: 0, borderTop:    `1px solid ${goldBorder}`, borderRight:  `1px solid ${goldBorder}` },
      { bottom: 0, left: 0,  borderBottom: `1px solid ${goldBorder}`, borderLeft:   `1px solid ${goldBorder}` },
      { bottom: 0, right: 0, borderBottom: `1px solid ${goldBorder}`, borderRight:  `1px solid ${goldBorder}` },
    ].map((s, i) => (
      <div key={i} style={{ position: "absolute", width: 20, height: 20, ...s, zIndex: 2 }} />
    ))}
  </>
);

// ── Section header ─────────────────────────────────────────────────
const SectionHeader: React.FC<{ step: number; title: string; icon: React.ReactNode }> = ({ step, title, icon }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 22 }}>
    <div style={{ width: 32, height: 32, borderRadius: "50%", background: "rgba(212,175,100,0.08)", border: `1px solid ${goldBorder}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, color: gold, fontWeight: 600, fontFamily: "'Playfair Display', serif", flexShrink: 0 }}>
      {step}
    </div>
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <span style={{ color: gold }}>{icon}</span>
      <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: 18, fontWeight: 500, color: "#f0e6cc" }}>{title}</h3>
    </div>
    <div style={{ flex: 1, height: 1, background: "rgba(212,175,100,0.1)" }} />
  </div>
);

// ── Spinner ────────────────────────────────────────────────────────
const Spin = ({ size = 14 }: { size?: number }) => (
  <svg style={{ animation: "spin 0.8s linear infinite", flexShrink: 0 }} width={size} height={size} viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" opacity="0.2" />
    <path d="M12 2a10 10 0 0110 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
  </svg>
);

// ══════════════════════════════════════════════════════════════════
//  MAIN COMPONENT
// ══════════════════════════════════════════════════════════════════
const AddressPaymentPage: React.FC = () => {
  const navigate        = useNavigate();
  const { location, city } = useApp();

  // ── UI state ──
  const [ready, setReady]         = useState(false);
  const [mapReady, setMapReady]   = useState(false);
  const [locating, setLocating]   = useState(false);
  const [geocoding, setGeocoding] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // ── Map state ──
  const [markerPos, setMarkerPos] = useState<LatLng | null>(null);
  const [mapCenter, setMapCenter] = useState<LatLng>({ lat: 28.6139, lng: 77.2090 });

  // ── Form state ──
  const [form, setForm] = useState<{
    fullAddress:  string;
    addressLine2: string;
    landmark:     string;
    city:         string;
    state:        string;
    pincode:      string;
    phoneNumber:  string;
    addressType:  "home" | "work" | "other";
  }>({
    fullAddress:  "",
    addressLine2: "",
    landmark:     "",
    city:         city?.name  || "",
    state:        city?.state || "",
    pincode:      "",
    phoneNumber:  "",
    addressType:  "home",
  });

  // ── Error state ──
  const [errors, setErrors] = useState<Partial<Record<keyof typeof form, string>>>({});

  // ── Init: pre-fill from context location ──
  useEffect(() => {
    if (location?.latitude && location?.longitude) {
      const pos = { lat: location.latitude, lng: location.longitude };
      setMarkerPos(pos);
      setMapCenter(pos);
      if (location.formattedAddress) {
        setForm(p => ({ ...p, fullAddress: location.formattedAddress! }));
      }
    }
    if (city) {
      setForm(p => ({ ...p, city: city.name || "", state: city.state || "" }));
    }
    setTimeout(() => setReady(true), 80);
    setTimeout(() => setMapReady(true), 200);
  }, []);

  // ── Reverse geocode ──
  const reverseGeocode = useCallback(async (lat: number, lng: number) => {
    setGeocoding(true);
    try {
      const result = await reverseGeocodeLatLng(lat, lng);
      setForm(p => ({
        ...p,
        fullAddress: result.displayName || p.fullAddress,
        city:        result.city        || p.city,
        state:       result.state       || p.state,
        pincode:     result.pincode     || p.pincode,
      }));
    } catch (e) {
      console.error("Reverse geocode failed:", e);
    } finally {
      setGeocoding(false);
    }
  }, []);

  // ── Map pin ──
  const handleMapClick = useCallback((ll: LatLng) => {
    setMarkerPos(ll);
    reverseGeocode(ll.lat, ll.lng);
  }, [reverseGeocode]);

  // ── Locate me button ──
  const handleLocateMe = () => {
    if (!navigator.geolocation) { toast.error("Geolocation not supported"); return; }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        const ll = { lat: coords.latitude, lng: coords.longitude };
        setMarkerPos(ll);
        setMapCenter(ll);
        await reverseGeocode(ll.lat, ll.lng);
        setLocating(false);
      },
      () => { setLocating(false); toast.error("Could not get location — pin manually on map"); },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleChange = (field: keyof typeof form, value: string) => {
    setForm(p => ({ ...p, [field]: value }));
    if (errors[field]) setErrors(p => ({ ...p, [field]: undefined }));
  };

  // ── Validate form ──
  const validate = (): boolean => {
    const e: Partial<Record<keyof typeof form, string>> = {};
    if (!form.fullAddress.trim()) e.fullAddress  = "Full address is required";
    if (!form.city.trim())        e.city         = "City is required";
    if (!form.state.trim())       e.state        = "State is required";
    if (!form.pincode.trim())     e.pincode      = "Pincode is required";
    if (!/^\d{6}$/.test(form.pincode)) e.pincode = "Enter a valid 6-digit pincode";
    if (!form.phoneNumber.trim()) e.phoneNumber  = "Phone number is required";
    if (!/^[6-9]\d{9}$/.test(form.phoneNumber)) e.phoneNumber = "Enter a valid 10-digit Indian number";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  // ── Submit ─────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!validate()) {
      toast.error("Please fix the errors above");
      return;
    }

    const payload: AddressPayload = {
      fullAddress:  form.fullAddress,
      addressLine2: form.addressLine2 || undefined,
      landmark:     form.landmark     || undefined,
      city:         form.city,
      state:        form.state,
      pincode:      form.pincode,
      addressType:  form.addressType,
      phoneNumber:  form.phoneNumber,
      coordinates:  markerPos ?? null,
    };

    try {
      setSubmitting(true);

      // ── Call validateAndSaveAddress from api.ts ──
      const res = await validateAndSaveAddress(payload);

      if (!res.success) {
        toast.error(res.message || "Address validation failed");
        return;
      }

      // ── Store addressId for checkout page ──
      if (res.addressId) {
        sessionStorage.setItem("addressId", res.addressId);
      }

      // ── Also store full address for order summary display ──
      sessionStorage.setItem("deliveryAddress", JSON.stringify({
        ...payload,
        addressId: res.addressId,
      }));

      toast.success("Address saved!");

      // ── Navigate to checkout ──
      navigate("/checkout");

    } catch (err: any) {
      const msg = err?.response?.data?.message || "Something went wrong. Please try again.";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  // ── Field error display ────────────────────────────────────────
  const FieldError = ({ field }: { field: keyof typeof form }) =>
    errors[field] ? (
      <p style={{ color: "#f87171", fontSize: 10, marginTop: 4, letterSpacing: "0.08em" }}>
        ⚠ {errors[field]}
      </p>
    ) : null;

  return (
    <>
      <style>{CSS}</style>

      <div className="ap-root" style={{
        minHeight: "100vh", width: "100%", backgroundColor: "#090705",
        background: "radial-gradient(ellipse at 20% 10%, rgba(201,168,76,0.07) 0%, transparent 50%), radial-gradient(ellipse at 80% 90%, rgba(184,134,11,0.06) 0%, transparent 50%), #090705",
        fontFamily: "'DM Sans', system-ui, sans-serif",
        padding: "40px 16px 100px", position: "relative", overflow: "hidden",
      }}>
        {/* Orbs */}
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
            onMouseLeave={e => (e.currentTarget.style.color = "rgba(200,175,130,0.45)")}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="15 18 9 12 15 6" /></svg>
            Back
          </button>

          {/* Title */}
          <div style={{ marginBottom: 32 }}>
            <h1 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: "clamp(26px, 4vw, 36px)", fontWeight: 500, background: "linear-gradient(90deg, #b8860b, #f0d070, #daa520, #c9a84c, #b8860b)", backgroundSize: "300% auto", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text", animation: "shimmer 6s linear infinite", marginBottom: 8 }}>
              Delivery Address
            </h1>
            <p style={{ fontSize: 13, color: textMuted }}>Pin your location on the map, then confirm your details</p>
          </div>

          {/* ── STEP 1: MAP ── */}
          <div style={{ position: "relative", marginBottom: 24 }}>
            <Brackets />
            <div style={{ background: cardBg, border: "1px solid rgba(212,175,100,0.13)", borderRadius: 3, padding: "28px", boxShadow: "0 12px 48px rgba(0,0,0,0.5)" }}>
              <SectionHeader step={1} title="Pin Your Location"
                icon={<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/><circle cx="12" cy="9" r="2.5"/></svg>}
              />

              {/* Locate Me */}
              <button onClick={handleLocateMe} disabled={locating}
                style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14, padding: "9px 18px", background: "rgba(212,175,100,0.08)", border: `1px solid ${goldBorder}`, borderRadius: 2, color: gold, fontFamily: "'DM Sans', sans-serif", fontSize: 11, fontWeight: 500, letterSpacing: "0.16em", textTransform: "uppercase", cursor: locating ? "not-allowed" : "pointer", transition: "all 0.2s" }}
                onMouseEnter={e => !locating && (e.currentTarget.style.background = "rgba(212,175,100,0.15)")}
                onMouseLeave={e => (e.currentTarget.style.background = "rgba(212,175,100,0.08)")}
              >
                {locating ? <Spin /> : <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>}
                {locating ? "Locating…" : "Use My Current Location"}
              </button>

              {/* Map */}
              <div style={{ borderRadius: 3, overflow: "hidden", border: `1px solid ${goldBorder}`, position: "relative" }}>
                <div style={{ position: "absolute", top: 10, left: "50%", transform: "translateX(-50%)", zIndex: 1000, background: "rgba(9,7,5,0.85)", border: `1px solid ${goldBorder}`, borderRadius: 2, padding: "5px 12px", pointerEvents: "none" }}>
                  <span style={{ fontSize: 10, color: "rgba(212,175,100,0.6)", letterSpacing: "0.14em", textTransform: "uppercase" }}>
                    📍 Tap map to pin location
                  </span>
                </div>

                {mapReady && (
                  <MapContainer center={[mapCenter.lat, mapCenter.lng]} zoom={15} style={{ height: 300, width: "100%" }}>
                    <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='&copy; OpenStreetMap' />
                    <MapClickHandler onSelect={handleMapClick} />
                    <MapCenterUpdater center={mapCenter} />
                    {markerPos && (
                      <Marker
                        position={[markerPos.lat, markerPos.lng]}
                        icon={goldIcon}
                        draggable
                        eventHandlers={{
                          dragend(e) {
                            const p = e.target.getLatLng();
                            const ll = { lat: p.lat, lng: p.lng };
                            setMarkerPos(ll);
                            reverseGeocode(ll.lat, ll.lng);
                          },
                        }}
                      />
                    )}
                  </MapContainer>
                )}
              </div>

              {/* Coordinates pill */}
              {markerPos && (
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 10 }}>
                  <div style={{ width: 6, height: 6, borderRadius: "50%", background: gold, flexShrink: 0 }} />
                  <span style={{ fontSize: 11, color: textMuted, fontFamily: "monospace" }}>
                    {markerPos.lat.toFixed(6)}, {markerPos.lng.toFixed(6)}
                  </span>
                  {geocoding && <><Spin /><span style={{ fontSize: 10, color: "rgba(212,175,100,0.4)" }}>fetching address…</span></>}
                </div>
              )}
            </div>
          </div>

          {/* ── STEP 2: ADDRESS DETAILS ── */}
          <div style={{ position: "relative", marginBottom: 24 }}>
            <Brackets />
            <div style={{ background: cardBg, border: "1px solid rgba(212,175,100,0.13)", borderRadius: 3, padding: "28px", boxShadow: "0 12px 48px rgba(0,0,0,0.5)" }}>
              <SectionHeader step={2} title="Confirm Address"
                icon={<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>}
              />

              {/* Address type tabs */}
              <div style={{ display: "flex", gap: 8, marginBottom: 22 }}>
                {(["home", "work", "other"] as const).map(t => (
                  <button key={t} onClick={() => handleChange("addressType", t)}
                    style={{ padding: "7px 16px", borderRadius: 2, border: `1px solid ${form.addressType === t ? "rgba(212,175,100,0.6)" : goldBorder}`, background: form.addressType === t ? "rgba(212,175,100,0.12)" : "transparent", color: form.addressType === t ? gold : textMuted, fontFamily: "'DM Sans', sans-serif", fontSize: 11, fontWeight: form.addressType === t ? 600 : 400, letterSpacing: "0.14em", textTransform: "uppercase", cursor: "pointer", transition: "all 0.2s" }}>
                    {t === "home" ? "🏠 " : t === "work" ? "🏢 " : "📍 "}{t}
                  </button>
                ))}
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

                {/* Full address */}
                <div>
                  <label style={labelStyle}>
                    Full Address *
                    {geocoding && <span style={{ marginLeft: 8, color: "rgba(212,175,100,0.4)", fontSize: 9 }}>● auto-filling from map…</span>}
                  </label>
                  <textarea className="ap-input" value={form.fullAddress} onChange={e => handleChange("fullAddress", e.target.value)}
                    placeholder="House/Flat no., Street, Area…" rows={3} style={{ ...inputStyle, resize: "none" }} />
                  <FieldError field="fullAddress" />
                </div>

                {/* Address line 2 */}
                <div>
                  <label style={labelStyle}>Address Line 2</label>
                  <input className="ap-input" type="text" value={form.addressLine2} onChange={e => handleChange("addressLine2", e.target.value)}
                    placeholder="Apartment, suite, floor (optional)" style={inputStyle} />
                </div>

                {/* Landmark + Pincode */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
                  <div>
                    <label style={labelStyle}>Landmark</label>
                    <input className="ap-input" type="text" value={form.landmark} onChange={e => handleChange("landmark", e.target.value)}
                      placeholder="Near park, temple…" style={inputStyle} />
                  </div>
                  <div>
                    <label style={labelStyle}>Pincode *</label>
                    <input className="ap-input" type="text" value={form.pincode} onChange={e => handleChange("pincode", e.target.value)}
                      placeholder="e.g. 201016" maxLength={6} style={inputStyle} />
                    <FieldError field="pincode" />
                  </div>
                </div>

                {/* City + State */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
                  <div>
                    <label style={labelStyle}>City *</label>
                    <input className="ap-input" type="text" value={form.city} onChange={e => handleChange("city", e.target.value)}
                      placeholder="e.g. Ghaziabad" style={inputStyle} />
                    <FieldError field="city" />
                  </div>
                  <div>
                    <label style={labelStyle}>State *</label>
                    <input className="ap-input" type="text" value={form.state} onChange={e => handleChange("state", e.target.value)}
                      placeholder="e.g. Uttar Pradesh" style={inputStyle} />
                    <FieldError field="state" />
                  </div>
                </div>

                {/* Phone */}
                <div>
                  <label style={labelStyle}>Phone Number *</label>
                  <div style={{ display: "flex", alignItems: "center", gap: 0 }}>
                    <span style={{ color: textMuted, fontSize: 14, paddingRight: 8, borderBottom: `1px solid ${goldBorder}`, paddingBottom: 10 }}>+91</span>
                    <input className="ap-input" type="tel" value={form.phoneNumber} onChange={e => handleChange("phoneNumber", e.target.value.replace(/\D/g, ""))}
                      placeholder="98765 43210" maxLength={10} style={{ ...inputStyle, flex: 1 }} />
                  </div>
                  <FieldError field="phoneNumber" />
                </div>
              </div>
            </div>
          </div>

          {/* ── SUBMIT BUTTON ── */}
          <button
            onClick={handleSubmit}
            disabled={submitting}
            style={{
              width: "100%", padding: "16px 20px",
              background: submitting
                ? "rgba(212,175,100,0.3)"
                : "linear-gradient(135deg, #b8860b 0%, #daa520 40%, #e8c84a 60%, #b8860b 100%)",
              border: "none", borderRadius: 2,
              color: submitting ? "rgba(18,13,0,0.5)" : "#120d00",
              fontFamily: "'DM Sans', sans-serif", fontSize: 12, fontWeight: 700,
              letterSpacing: "0.24em", textTransform: "uppercase",
              cursor: submitting ? "not-allowed" : "pointer",
              transition: "all 0.3s",
              boxShadow: "0 4px 20px rgba(212,175,100,0.2)",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
            }}
            onMouseEnter={e => !submitting && (e.currentTarget.style.boxShadow = "0 8px 32px rgba(212,175,100,0.38)")}
            onMouseLeave={e => (e.currentTarget.style.boxShadow = "0 4px 20px rgba(212,175,100,0.2)")}
          >
            {submitting ? <><Spin /><span>Saving Address…</span></> : <span>Continue to Order Summary</span>}
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