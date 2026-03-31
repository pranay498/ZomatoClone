import React, { useState, useEffect } from "react";
import { useApp } from "../../Context/MainContext";
import { IRestaurant } from "../../types";

import toast from "react-hot-toast";
import apiClient from  "../../services/apiClient"
import { RestaurantCard, RestaurantForm } from "./Restaurantcardform";
import MenuSection from "./Menusection";

import { gold, textMuted, cardBg, goldBorder, GLOBAL_CSS,Spinner} from "./Restaurant.shared";

const RestaurantPage: React.FC = () => {
  const { user } = useApp();
  const [restaurant, setRestaurant]   = useState<IRestaurant | null>(null);
  const [restaurantId, setRestaurantId] = useState<string | null>(null);
  const [loading, setLoading]         = useState(true);
  const [showForm, setShowForm]       = useState(false);
  const [ready, setReady]             = useState(false);

  useEffect(() => {
    if (user?.role !== "seller") { setLoading(false); return; }
    apiClient.get("/restaurant/my-restaurant")
      .then(res => {
        if (res.data.success) {
          setRestaurant(res.data.data);
          setRestaurantId(res.data.restaurantId || res.data.data._id);
        }
      })
      .catch(err => {
        if (err.response?.status === 404) setShowForm(true);
        else toast.error("Failed to load restaurant");
      })
      .finally(() => { setLoading(false); setTimeout(() => setReady(true), 50); });
  }, [user]);

  const handleSaved = (saved: IRestaurant, id: string) => {
    setRestaurant(saved);
    setRestaurantId(id);
    setShowForm(false);
  };

  // ── Guards ──
  if (!user || user.role !== "seller") return (
    <div style={{ minHeight: "100vh", background: "#090705", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ textAlign: "center" }}>
        <p style={{ fontFamily: "'Playfair Display', serif", fontSize: 28, color: gold, marginBottom: 12 }}>Access Denied</p>
        <p style={{ color: textMuted, fontSize: 14 }}>Only sellers can access this page</p>
      </div>
    </div>
  );

  if (loading) return (
    <div style={{ minHeight: "100vh", background: "#090705", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ textAlign: "center" }}>
        <Spinner size={36} />
        <p style={{ color: "rgba(212,175,100,0.4)", fontSize: 12, letterSpacing: "0.2em", textTransform: "uppercase", marginTop: 16, fontFamily: "'DM Sans', sans-serif" }}>
          Loading restaurant…
        </p>
      </div>
    </div>
  );

  return (
    <>
      <style>{GLOBAL_CSS}</style>

      <div className="rp-root" style={{
        minHeight: "100vh", width: "100%", backgroundColor: "#090705",
        background: "radial-gradient(ellipse at 20% 20%, rgba(201,168,76,0.07) 0%, transparent 55%), radial-gradient(ellipse at 80% 80%, rgba(184,134,11,0.06) 0%, transparent 55%), #090705",
        fontFamily: "'DM Sans', system-ui, sans-serif",
        padding: "40px 16px 80px", position: "relative", overflow: "hidden",
      }}>
        {/* Ambient orbs */}
        <div style={{ position: "absolute", top: "-8%", left: "-4%", width: 440, height: 440, borderRadius: "50%", background: "radial-gradient(circle, rgba(201,168,76,0.17) 0%, transparent 68%)", filter: "blur(45px)", animation: "drift1 14s ease-in-out infinite", pointerEvents: "none" }} />
        <div style={{ position: "absolute", bottom: "-10%", right: "-6%", width: 380, height: 380, borderRadius: "50%", background: "radial-gradient(circle, rgba(184,134,11,0.13) 0%, transparent 68%)", filter: "blur(50px)", animation: "drift2 17s ease-in-out infinite", pointerEvents: "none" }} />
        <div style={{ position: "absolute", inset: 0, pointerEvents: "none", opacity: 0.03, backgroundImage: "linear-gradient(rgba(212,175,100,1) 1px, transparent 1px), linear-gradient(90deg, rgba(212,175,100,1) 1px, transparent 1px)", backgroundSize: "64px 64px" }} />
        <div style={{ position: "absolute", inset: 0, pointerEvents: "none", background: "radial-gradient(ellipse at center, transparent 30%, rgba(0,0,0,0.6) 100%)" }} />

        <div style={{
          position: "relative", zIndex: 10, maxWidth: 680, margin: "0 auto",
          opacity: ready ? 1 : 0, transform: ready ? "translateY(0)" : "translateY(24px)",
          transition: "opacity 0.75s cubic-bezier(.16,1,.3,1), transform 0.75s cubic-bezier(.16,1,.3,1)",
        }}>
          {/* Header */}
          <div style={{ textAlign: "center", marginBottom: 40 }}>
            <div style={{ display: "flex", justifyContent: "center", marginBottom: 16 }}>
              <div style={{ width: 50, height: 50, border: "1px solid rgba(212,175,100,0.32)", transform: "rotate(45deg)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <div style={{ width: 30, height: 30, border: "1px solid rgba(212,175,100,0.16)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <span style={{ fontFamily: "'Playfair Display', serif", fontSize: 14, fontWeight: 500, color: gold, transform: "rotate(-45deg)", display: "block", lineHeight: 1 }}>R</span>
                </div>
              </div>
            </div>
            <h1 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 32, fontWeight: 500, background: "linear-gradient(90deg, #b8860b, #f0d070, #daa520, #c9a84c, #b8860b)", backgroundSize: "300% auto", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text", animation: "shimmer 5s linear infinite", margin: 0 }}>
              {showForm ? (restaurant ? "Edit Restaurant" : "Create Restaurant") : "My Restaurant"}
            </h1>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, marginTop: 14 }}>
              <div style={{ height: 1, width: 36, background: "linear-gradient(90deg, transparent, rgba(212,175,100,0.38))" }} />
              <div style={{ width: 4, height: 4, borderRadius: "50%", background: "rgba(212,175,100,0.45)" }} />
              <div style={{ height: 1, width: 36, background: "linear-gradient(90deg, rgba(212,175,100,0.38), transparent)" }} />
            </div>
          </div>

          {/* Main card */}
          <div style={{ position: "relative" }}>
            {[
              { top: 0,    left: 0,  borderTop:    `1px solid ${goldBorder}`, borderLeft:   `1px solid ${goldBorder}` },
              { top: 0,    right: 0, borderTop:    `1px solid ${goldBorder}`, borderRight:  `1px solid ${goldBorder}` },
              { bottom: 0, left: 0,  borderBottom: `1px solid ${goldBorder}`, borderLeft:   `1px solid ${goldBorder}` },
              { bottom: 0, right: 0, borderBottom: `1px solid ${goldBorder}`, borderRight:  `1px solid ${goldBorder}` },
            ].map((s, i) => <div key={i} style={{ position: "absolute", width: 22, height: 22, ...s, zIndex: 2 }} />)}

            <div style={{ background: cardBg, border: `1px solid rgba(212,175,100,0.13)`, borderRadius: 3, boxShadow: "0 0 0 1px rgba(212,175,100,0.05), 0 32px 80px rgba(0,0,0,0.8)", overflow: "hidden" }}>
              {restaurant && !showForm
                ? <RestaurantCard restaurant={restaurant} restaurantId={restaurantId} onEdit={() => setShowForm(true)} />
                : <RestaurantForm existing={restaurant} restaurantId={restaurantId} onSaved={handleSaved} onCancel={restaurant ? () => setShowForm(false) : undefined} />
              }
            </div>
          </div>

          {/* Menu tabs — only when viewing (not editing) */}
          {restaurant && !showForm && (
            <MenuSection restaurantId={restaurantId || restaurant._id} />
          )}
        </div>
      </div>
    </>
  );
};

export default RestaurantPage;