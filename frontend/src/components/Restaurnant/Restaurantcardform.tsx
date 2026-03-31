import React, { useState } from "react";
import { IRestaurant } from "../../types";
import apiClient from "../../services/apiClient"
import toast from "react-hot-toast";
import {
    gold, goldBorder, textMuted, textBody,
    labelStyle, inputStyle,
    Spinner, LocationIcon, EditIcon,
} from "./Restaurant.shared";

// ─────────────────────────────────────────────
//  RESTAURANT CARD  (detail view)
// ─────────────────────────────────────────────
interface CardProps {
    restaurant: IRestaurant;
    restaurantId: string | null;
    onEdit: () => void;
}

export const RestaurantCard: React.FC<CardProps> = ({ restaurant, restaurantId, onEdit }) => (
    <div>
        {restaurant.imageUrl && (
            <div style={{ position: "relative", height: 220, overflow: "hidden" }}>
                <img src={restaurant.imageUrl} alt={restaurant.name}
                    style={{ width: "100%", height: "100%", objectFit: "cover", opacity: 0.75 }} />
                <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom, transparent 40%, rgba(9,7,5,0.97) 100%)" }} />
                <div style={{ position: "absolute", bottom: 20, left: 28 }}>
                    <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 26, color: "#f0e6cc", fontWeight: 500 }}>
                        {restaurant.name}
                    </h2>
                    <span className="badge" style={{
                        marginTop: 6,
                        background: restaurant.isOpen ? "rgba(74,222,128,0.1)" : "rgba(239,68,68,0.1)",
                        border: `1px solid ${restaurant.isOpen ? "rgba(74,222,128,0.3)" : "rgba(239,68,68,0.3)"}`,
                        color: restaurant.isOpen ? "#4ade80" : "#ef4444",
                    }}>
                        {restaurant.isOpen ? "● Open" : "● Closed"}
                    </span>
                </div>
            </div>
        )}

        <div style={{ padding: "28px 32px" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 28 }}>
                <div>
                    <p style={labelStyle}>Description</p>
                    <p style={{ color: textBody, fontSize: 14, lineHeight: 1.7, marginBottom: 24 }}>{restaurant.description}</p>
                    <p style={labelStyle}>Phone</p>
                    <p style={{ color: "#f0e6cc", fontSize: 14, marginBottom: 24 }}>{restaurant.phone}</p>
                    <p style={labelStyle}>Verified</p>
                    <span className="badge" style={{
                        background: restaurant.isVerified ? "rgba(212,175,100,0.1)" : "rgba(200,175,130,0.05)",
                        border: `1px solid ${restaurant.isVerified ? "rgba(212,175,100,0.4)" : "rgba(200,175,130,0.15)"}`,
                        color: restaurant.isVerified ? gold : textMuted,
                    }}>
                        {restaurant.isVerified ? "✓ Verified" : "Pending"}
                    </span>
                </div>
                <div>
                    <p style={labelStyle}>Location</p>
                    <p style={{ color: textBody, fontSize: 14, lineHeight: 1.7, marginBottom: 24 }}>{restaurant.autoLocation?.formattedAddress}</p>
                    <p style={labelStyle}>Coordinates</p>
                    <p style={{ color: textMuted, fontSize: 12, fontFamily: "monospace", marginBottom: 4 }}>Lat: {restaurant.autoLocation?.coordinates[1]}</p>
                    <p style={{ color: textMuted, fontSize: 12, fontFamily: "monospace", marginBottom: 24 }}>Lng: {restaurant.autoLocation?.coordinates[0]}</p>
                    <p style={labelStyle}>Restaurant ID</p>
                    <p style={{ color: "rgba(200,175,130,0.35)", fontSize: 11, fontFamily: "monospace", background: "rgba(212,175,100,0.04)", border: "1px solid rgba(212,175,100,0.1)", padding: "8px 10px", borderRadius: 2, wordBreak: "break-all" }}>
                        {restaurantId || restaurant._id}
                    </p>
                </div>
            </div>

            <div style={{ height: 1, background: "rgba(212,175,100,0.1)", margin: "24px 0" }} />

            <button onClick={onEdit}
                style={{ display: "flex", alignItems: "center", gap: 8, padding: "12px 24px", background: "rgba(212,175,100,0.08)", border: `1px solid ${goldBorder}`, borderRadius: 2, color: gold, fontFamily: "'DM Sans', sans-serif", fontSize: 11, fontWeight: 500, letterSpacing: "0.18em", textTransform: "uppercase", cursor: "pointer", transition: "all 0.3s" }}
                onMouseEnter={e => (e.currentTarget.style.background = "rgba(212,175,100,0.14)")}
                onMouseLeave={e => (e.currentTarget.style.background = "rgba(212,175,100,0.08)")}
            >
                <EditIcon /> Edit Restaurant
            </button>
        </div>
    </div>
);


interface FormProps {
    existing: IRestaurant | null;
    restaurantId: string | null;
    onSaved: (restaurant: IRestaurant, id: string) => void;
    onCancel?: () => void;
}

export const RestaurantForm: React.FC<FormProps> = ({ existing, restaurantId, onSaved, onCancel }) => {
    const [loading, setLoading] = useState(false);
    const [locationLoading, setLocationLoading] = useState(false);
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [form, setForm] = useState({
        name: existing?.name || "",
        description: existing?.description || "",
        phone: existing?.phone || "",
        autoLocation: existing?.autoLocation || { coordinates: [0, 0] as [number, number], formattedAddress: "" },
        isOpen: existing?.isOpen ?? true,
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        if (name === "formattedAddress")
            setForm(p => ({ ...p, autoLocation: { ...p.autoLocation, formattedAddress: value } }));
        else
            setForm(p => ({ ...p, [name]: value }));
    };

    const fetchLocation = () => {
        if (!navigator.geolocation) { toast.error("Geolocation not supported"); return; }
        setLocationLoading(true);
        navigator.geolocation.getCurrentPosition(
            async ({ coords: { latitude, longitude } }) => {
                try {
                    const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`);
                    const data = await res.json();
                    setForm(p => ({ ...p, autoLocation: { coordinates: [longitude, latitude], formattedAddress: data.display_name || `${latitude}, ${longitude}` } }));
                    toast.success("Location fetched");
                } catch {
                    setForm(p => ({ ...p, autoLocation: { coordinates: [longitude, latitude], formattedAddress: `${latitude}, ${longitude}` } }));
                } finally { setLocationLoading(false); }
            },
            () => { setLocationLoading(false); toast.error("Location access denied"); }
        );
    };

    const handleSave = async () => {
        if (!form.name || !form.description || !form.phone || !form.autoLocation.formattedAddress) {
            toast.error("Please fill all required fields"); return;
        }
        try {
            setLoading(true);
            const fd = new FormData();
            fd.append("name", form.name); fd.append("description", form.description);
            fd.append("phone", String(form.phone)); fd.append("autoLocation", JSON.stringify(form.autoLocation));
            fd.append("isOpen", String(form.isOpen));
            if (imageFile) fd.append("file", imageFile);

            const res = existing
                ? await apiClient.put(`/restaurant/${restaurantId}`, fd)
                : await apiClient.post("/restaurant/create", fd);

            if (res.data.success) {
                toast.success(existing ? "Updated!" : "Restaurant created!");
                const saved: IRestaurant = res.data.data;
                const newId = res.data.restaurantId || saved._id;
                localStorage.setItem("restaurant", JSON.stringify(saved));
                localStorage.setItem("restaurantId", newId);
                onSaved(saved, newId);
            }
        } catch (err: any) {
            toast.error(err.response?.data?.message || "Failed to save");
        } finally { setLoading(false); }
    };

    return (
        <div style={{ padding: "36px 32px" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 28 }}>
                {/* Left */}
                <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
                    <div>
                        <label style={labelStyle}>Restaurant Name *</label>
                        <input className="rp-input" type="text" name="name" value={form.name} onChange={handleChange} placeholder="e.g. The Golden Fork" style={inputStyle} />
                    </div>
                    <div>
                        <label style={labelStyle}>Phone Number *</label>
                        <input className="rp-input" type="tel" name="phone" value={form.phone} onChange={handleChange} placeholder="+91 98765 43210" style={inputStyle} />
                    </div>
                    <div>
                        <label style={labelStyle}>Description *</label>
                        <textarea className="rp-input" name="description" value={form.description} onChange={handleChange} placeholder="Tell customers about your restaurant…" rows={4} style={{ ...inputStyle, resize: "none" }} />
                    </div>
                    {existing && (
                        <div>
                            <label style={labelStyle}>Restaurant Status</label>
                            <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", userSelect: "none" }}>
                                <div style={{ width: 44, height: 24, background: form.isOpen ? "rgba(74,222,128,0.2)" : "rgba(239,68,68,0.2)", border: `1px solid ${form.isOpen ? "rgba(74,222,128,0.5)" : "rgba(239,68,68,0.5)"}`, borderRadius: 12, position: "relative", transition: "all 0.3s" }}>
                                    <div style={{ position: "absolute", top: 2, left: form.isOpen ? 20 : 2, width: 18, height: 18, background: form.isOpen ? "#4ade80" : "#ef4444", borderRadius: "50%", transition: "all 0.3s" }} />
                                </div>
                                <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: form.isOpen ? "#4ade80" : "#ef4444", fontWeight: 500 }}>
                                    {form.isOpen ? "Open (Accepting Orders)" : "Closed (Paused)"}
                                </span>
                                <input type="checkbox" checked={form.isOpen} onChange={e => setForm(p => ({ ...p, isOpen: e.target.checked }))} style={{ display: "none" }} />
                            </label>
                        </div>
                    )}
                </div>

                {/* Right */}
                <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
                    <div>
                        <label style={labelStyle}>Restaurant Image</label>
                        <label style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: 120, border: `1px dashed ${goldBorder}`, borderRadius: 2, cursor: "pointer", transition: "all 0.3s", gap: 8, background: imageFile ? "rgba(212,175,100,0.06)" : "transparent" }}
                            onMouseEnter={e => (e.currentTarget.style.borderColor = "rgba(212,175,100,0.5)")}
                            onMouseLeave={e => (e.currentTarget.style.borderColor = goldBorder)}
                        >
                            <input type="file" accept="image/*" onChange={e => e.target.files?.[0] && setImageFile(e.target.files[0])} style={{ display: "none" }} />
                            {imageFile
                                ? <><span style={{ fontSize: 20 }}>✓</span><span style={{ fontSize: 11, color: "rgba(212,175,100,0.6)" }}>{imageFile.name}</span></>
                                : <><span style={{ fontSize: 24, opacity: 0.3 }}>◈</span><span style={{ fontSize: 10, color: textMuted, letterSpacing: "0.16em", textTransform: "uppercase" }}>Click to upload image</span></>
                            }
                        </label>
                    </div>
                    <div>
                        <label style={labelStyle}>Location *</label>
                        <button type="button" onClick={fetchLocation} disabled={locationLoading}
                            style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "11px 16px", marginBottom: 14, background: "rgba(212,175,100,0.07)", border: `1px solid ${goldBorder}`, borderRadius: 2, color: locationLoading ? "rgba(212,175,100,0.4)" : gold, fontFamily: "'DM Sans', sans-serif", fontSize: 11, fontWeight: 500, letterSpacing: "0.16em", textTransform: "uppercase", cursor: locationLoading ? "not-allowed" : "pointer", transition: "all 0.3s" }}>
                            {locationLoading ? <Spinner /> : <LocationIcon />}
                            <span>{locationLoading ? "Fetching…" : "Use Current Location"}</span>
                        </button>
                        <input className="rp-input" type="text" name="formattedAddress" value={form.autoLocation.formattedAddress} onChange={handleChange} placeholder="Address will appear here…" style={{ ...inputStyle, fontSize: 12 }} />
                        {form.autoLocation.coordinates[0] !== 0 && (
                            <div style={{ display: "flex", gap: 16, marginTop: 10 }}>
                                <p style={{ fontSize: 11, color: textMuted, fontFamily: "monospace" }}>Lat: {form.autoLocation.coordinates[1].toFixed(6)}</p>
                                <p style={{ fontSize: 11, color: textMuted, fontFamily: "monospace" }}>Lng: {form.autoLocation.coordinates[0].toFixed(6)}</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div style={{ height: 1, background: "rgba(212,175,100,0.1)", margin: "28px 0" }} />

            <div style={{ display: "flex", gap: 14 }}>
                <button type="button" onClick={handleSave} disabled={loading}
                    style={{ flex: 1, padding: "14px 20px", background: loading ? "rgba(212,175,100,0.08)" : "linear-gradient(135deg, #b8860b 0%, #daa520 40%, #e8c84a 60%, #b8860b 100%)", border: loading ? `1px solid ${goldBorder}` : "none", borderRadius: 2, color: loading ? "rgba(212,175,100,0.4)" : "#120d00", fontFamily: "'DM Sans', sans-serif", fontSize: 11, fontWeight: 700, letterSpacing: "0.22em", textTransform: "uppercase", cursor: loading ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 10, transition: "all 0.3s" }}>
                    {loading && <Spinner />}
                    <span>{loading ? "Saving…" : existing ? "Update Restaurant" : "Create Restaurant"}</span>
                </button>
                {existing && onCancel && (
                    <button type="button" onClick={onCancel}
                        style={{ padding: "14px 24px", background: "transparent", border: `1px solid rgba(212,175,100,0.2)`, borderRadius: 2, color: textMuted, fontFamily: "'DM Sans', sans-serif", fontSize: 11, letterSpacing: "0.18em", textTransform: "uppercase", cursor: "pointer", transition: "all 0.3s" }}>
                        Cancel
                    </button>
                )}
            </div>
        </div>
    );
};