import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import apiClient from "../../services/apiClient";
import MenuSection from "./MenuSection";
import CartSidebar from "./Cartsidebar";
import { useCart } from "../../hooks/useCart";
import { IRestaurant } from "../../types";


const DETAIL_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;500;600&family=DM+Sans:wght@300;400;500;600&display=swap');
  @keyframes shimmer { 0%{background-position:0% center;} 100%{background-position:200% center;} }
  @keyframes drift1  { 0%,100%{transform:translate(0,0);} 50%{transform:translate(28px,-20px);} }
  @keyframes drift2  { 0%,100%{transform:translate(0,0);} 50%{transform:translate(-22px,-26px);} }
  @keyframes fadeUp  { from{opacity:0;transform:translateY(14px);} to{opacity:1;transform:translateY(0);} }
  @keyframes pulse   { 0%,100%{opacity:1;} 50%{opacity:0.4;} }
  @keyframes spin    { to{transform:rotate(360deg);} }
  .rd-root *, .rd-root *::before, .rd-root *::after { box-sizing: border-box; margin: 0; padding: 0; }
  .cart-fab:hover { transform: scale(1.08) !important; box-shadow: 0 8px 28px rgba(212,175,100,0.35) !important; }
`;


const RestaurantHero: React.FC<{ restaurant: IRestaurant }> = ({ restaurant }) => {
  const gold = "#d4af64";

  return (
    <div style={{ marginBottom: 36 }}>
      {/* Cover image */}
      <div style={{ position: "relative", height: 260, borderRadius: 4, overflow: "hidden", marginBottom: 24 }}>
        {restaurant.imageUrl ? (
          <img src={restaurant.imageUrl} alt={restaurant.name}
            style={{ width: "100%", height: "100%", objectFit: "cover", opacity: 0.75 }} />
        ) : (
          <div style={{ width: "100%", height: "100%", background: "radial-gradient(circle at 30% 50%, rgba(212,175,100,0.12), rgba(0,0,0,0.5))", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ fontSize: 60, opacity: 0.2 }}>🍽️</span>
          </div>
        )}
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom, transparent 35%, rgba(9,7,5,0.97) 100%)" }} />

        {/* Overlaid name */}
        <div style={{ position: "absolute", bottom: 24, left: 28, right: 28 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8, flexWrap: "wrap" }}>
            <span style={{
              fontSize: 9, letterSpacing: "0.14em", padding: "3px 9px", borderRadius: 2, fontWeight: 600, textTransform: "uppercase",
              background: restaurant.isOpen ? "rgba(74,222,128,0.15)" : "rgba(239,68,68,0.15)",
              border: `1px solid ${restaurant.isOpen ? "rgba(74,222,128,0.4)" : "rgba(239,68,68,0.4)"}`,
              color: restaurant.isOpen ? "#4ade80" : "#f87171",
            }}>
              {restaurant.isOpen ? "● Open Now" : "● Closed"}
            </span>
            {restaurant.isVerified && (
              <span style={{ fontSize: 9, letterSpacing: "0.14em", padding: "3px 9px", borderRadius: 2, fontWeight: 600, textTransform: "uppercase", background: "rgba(212,175,100,0.12)", border: "1px solid rgba(212,175,100,0.35)", color: gold }}>
                ✓ Verified
              </span>
            )}
          </div>
          <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: "clamp(22px, 4vw, 34px)", fontWeight: 500, color: "#f0e6cc" }}>
            {restaurant.name}
          </h1>
        </div>
      </div>

      {/* Info row */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 24, alignItems: "start" }}>
        <div>
          <p style={{ color: "rgba(200,175,130,0.6)", fontSize: 13, lineHeight: 1.7, marginBottom: 14 }}>
            {restaurant.description}
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 20 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={gold} strokeWidth="1.5" strokeLinecap="round">
                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" />
                <circle cx="12" cy="9" r="2.5" />
              </svg>
              <span style={{ fontSize: 12, color: "rgba(200,175,130,0.5)", maxWidth: 260, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {restaurant.autoLocation?.formattedAddress}
              </span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={gold} strokeWidth="1.5" strokeLinecap="round">
                <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.81 19.79 19.79 0 01.12 1.18 2 2 0 012.1 0h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z" />
              </svg>
              <span style={{ fontSize: 12, color: "rgba(200,175,130,0.5)" }}>{restaurant.phone}</span>
            </div>
          </div>
        </div>

        {/* Since */}
        <div style={{ textAlign: "right" }}>
          <p style={{ fontSize: 10, letterSpacing: "0.18em", textTransform: "uppercase", color: "rgba(200,175,130,0.3)", marginBottom: 4 }}>Since</p>
          <p style={{ fontFamily: "'Playfair Display', serif", fontSize: 18, color: "rgba(212,175,100,0.5)" }}>
            {new Date(restaurant.createdAt).getFullYear()}
          </p>
        </div>
      </div>

      {/* Divider */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 24 }}>
        <div style={{ flex: 1, height: 1, background: "linear-gradient(90deg, rgba(212,175,100,0.25), transparent)" }} />
        <div style={{ width: 4, height: 4, transform: "rotate(45deg)", background: "rgba(212,175,100,0.35)" }} />
        <div style={{ flex: 1, height: 1, background: "linear-gradient(90deg, transparent, rgba(212,175,100,0.25))" }} />
      </div>
    </div>
  );
};


const RestaurantDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [restaurant, setRestaurant] = useState<IRestaurant | null>(null);
  const [loading, setLoading] = useState(true);
  const [ready, setReady] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);

  const { items, addItem, removeItem, clearCart, total, itemCount } = useCart();

  const gold = "#d4af64";
  const goldBorder = "rgba(212,175,100,0.25)";

  // ── Fetch restaurant ──
  useEffect(() => {
    if (!id) return;
    apiClient.get(`/restaurant/${id}`)
      .then(res => {
        if (res.data.success) setRestaurant(res.data.data);
      })
      .catch(() => navigate("/"))
      .finally(() => {
        setLoading(false);
        setTimeout(() => setReady(true), 60);
      });
  }, [id]);

  // ── Loading ──
  if (loading) return (
    <div style={{ minHeight: "100vh", background: "#090705", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <svg style={{ animation: "spin 0.8s linear infinite" }} width="36" height="36" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="10" stroke={gold} strokeWidth="3" opacity="0.2" />
        <path d="M12 2a10 10 0 0110 10" stroke={gold} strokeWidth="3" strokeLinecap="round" />
      </svg>
    </div>
  );

  if (!restaurant) return null;

  return (
    <>
      <style>{DETAIL_CSS}</style>

      <div className="rd-root" style={{
        minHeight: "100vh", width: "100%", backgroundColor: "#090705",
        background: "radial-gradient(ellipse at 20% 10%, rgba(201,168,76,0.07) 0%, transparent 50%), radial-gradient(ellipse at 80% 90%, rgba(184,134,11,0.06) 0%, transparent 50%), #090705",
        fontFamily: "'DM Sans', system-ui, sans-serif",
        padding: "40px 16px 100px", position: "relative", overflow: "hidden",
      }}>

        {/* Orbs */}
        <div style={{ position: "absolute", top: "-8%", left: "-4%", width: 480, height: 480, borderRadius: "50%", background: "radial-gradient(circle, rgba(201,168,76,0.1) 0%, transparent 68%)", filter: "blur(50px)", animation: "drift1 14s ease-in-out infinite", pointerEvents: "none" }} />
        <div style={{ position: "absolute", bottom: "-10%", right: "-6%", width: 400, height: 400, borderRadius: "50%", background: "radial-gradient(circle, rgba(184,134,11,0.09) 0%, transparent 68%)", filter: "blur(55px)", animation: "drift2 17s ease-in-out infinite", pointerEvents: "none" }} />
        <div style={{ position: "absolute", inset: 0, pointerEvents: "none", opacity: 0.025, backgroundImage: "linear-gradient(rgba(212,175,100,1) 1px, transparent 1px), linear-gradient(90deg, rgba(212,175,100,1) 1px, transparent 1px)", backgroundSize: "64px 64px" }} />

        <div style={{
          position: "relative", zIndex: 10, maxWidth: 760, margin: "0 auto",
          opacity: ready ? 1 : 0, transform: ready ? "translateY(0)" : "translateY(16px)",
          transition: "opacity 0.6s cubic-bezier(.16,1,.3,1), transform 0.6s cubic-bezier(.16,1,.3,1)",
          animation: ready ? "fadeUp 0.5s ease both" : "none",
        }}>

          {/* Back button */}
          <button onClick={() => navigate(-1)} style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 28, background: "transparent", border: "none", color: "rgba(200,175,130,0.45)", fontFamily: "'DM Sans', sans-serif", fontSize: 12, letterSpacing: "0.14em", textTransform: "uppercase", cursor: "pointer", padding: 0, transition: "color 0.2s" }}
            onMouseEnter={e => (e.currentTarget.style.color = gold)}
            onMouseLeave={e => (e.currentTarget.style.color = "rgba(200,175,130,0.45)")}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
            Back
          </button>

          {/* Hero */}
          <RestaurantHero restaurant={restaurant} />

          {/* Menu heading */}
          <div style={{ marginBottom: 24 }}>
            <h2 style={{
              fontFamily: "'Playfair Display', serif", fontSize: 24, fontWeight: 500,
              background: "linear-gradient(90deg, #b8860b, #f0d070, #daa520, #b8860b)",
              backgroundSize: "300% auto", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
              backgroundClip: "text", animation: "shimmer 6s linear infinite",
            }}>
              Menu
            </h2>
          </div>

          {/* Menu section */}
          <MenuSection
            restaurantId={restaurant._id}
            cartItems={items}
            onAdd={addItem}
            onRemove={removeItem}
            restaurantIsOpen={restaurant.isOpen}
          />
        </div>


        {itemCount > 0 && restaurant.isOpen && (
          <button
            className="cart-fab"
            onClick={() => setCartOpen(true)}
            style={{
              position: "fixed", bottom: 32, right: 32, zIndex: 30,
              display: "flex", alignItems: "center", gap: 12,
              padding: "14px 24px",
              background: "linear-gradient(135deg, #b8860b 0%, #daa520 40%, #e8c84a 60%, #b8860b 100%)",
              border: "none", borderRadius: 3,
              color: "#120d00", fontFamily: "'DM Sans', sans-serif",
              fontSize: 12, fontWeight: 700, letterSpacing: "0.16em", textTransform: "uppercase",
              cursor: "pointer", transition: "all 0.25s",
              boxShadow: "0 4px 20px rgba(212,175,100,0.25)",
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <circle cx="9" cy="21" r="1" /><circle cx="20" cy="21" r="1" />
              <path d="M1 1h4l2.68 13.39a2 2 0 001.99 1.61h9.72a2 2 0 001.98-1.69l1.54-8.31H6" />
            </svg>
            <span>{itemCount} item{itemCount > 1 ? "s" : ""}</span>
            <span style={{ opacity: 0.7 }}>|</span>
            <span>₹{total}</span>
          </button>
        )}
      </div>

      {/* Cart Sidebar */}
      <CartSidebar
        items={items}
        total={total}
        onAdd={addItem}
        onRemove={removeItem}
        onClear={clearCart}
        onCheckout={() => {
          sessionStorage.setItem("cart", JSON.stringify(items));
          sessionStorage.setItem("restaurantId", restaurant._id);
          sessionStorage.setItem("restaurantName", restaurant.name);

          navigate("/address-payment");
        }}
        open={cartOpen}
        onClose={() => setCartOpen(false)}
      />
    </>
  );
};


export default RestaurantDetail;
