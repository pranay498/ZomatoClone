import React, { useEffect } from 'react';
import { useApp } from '../Context/MainContext';
import { useNavigate } from 'react-router-dom';

const gold = "#d4af64";
const goldBorder = "rgba(212,175,100,0.25)";
const goldFaint = "rgba(212,175,100,0.08)";
const textMuted = "rgba(200,175,130,0.5)";
const textBody = "rgba(200,175,130,0.75)";
const cardBg = "linear-gradient(155deg, rgba(20,15,7,0.98) 0%, rgba(11,8,3,0.99) 100%)";

const AccountPage = () => {
  const { user, setIsAuth, setUser, setToken } = useApp();
  const navigate = useNavigate();

  useEffect(() => {
    // If Rider accidentally hits this page, redirect them to their specific dashboard
    if (user?.role === 'rider') {
      navigate('/rider/dashboard');
    }
  }, [user, navigate]);

  const handleLogout = () => {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    setIsAuth(false);
    setUser(null);
    setToken(null);
    navigate("/login");
  };

  if (!user) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#090705" }}>
        <p style={{ color: gold, fontFamily: "'Playfair Display', serif", fontSize: "1.2rem" }}>Loading User Data...</p>
      </div>
    );
  }

  // Common Profile Banner Header
  const ProfileBanner = () => (
    <div style={{ background: cardBg, border: `1px solid ${goldBorder}`, borderRadius: "16px", padding: "32px", display: "flex", alignItems: "center", gap: "24px", boxShadow: "0 8px 32px rgba(0,0,0,0.4)" }}>
      {user.profilePicture ? (
        <img src={user.profilePicture} alt="Profile" style={{ width: "90px", height: "90px", borderRadius: "50%", border: `2px solid ${gold}`, objectFit: "cover" }} />
      ) : (
        <div style={{ width: "90px", height: "90px", borderRadius: "50%", background: goldFaint, border: `2px solid ${goldBorder}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "32px", color: gold }}>
          {user.firstName?.charAt(0) || "👤"}
        </div>
      )}
      <div>
        <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: "28px", color: "#f0e6cc", margin: 0 }}>
          {user.firstName} {user.lastName}
        </h1>
        <p style={{ color: textMuted, fontSize: "14px", marginTop: "4px" }}>{user.email}</p>
        <p style={{ color: textBody, fontSize: "14px", marginTop: "2px" }}>{user.phoneNumber}</p>
        <div style={{ display: "inline-block", marginTop: "12px", border: `1px solid ${goldBorder}`, background: goldFaint, color: gold, padding: "4px 12px", borderRadius: "4px", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.15em", fontWeight: 600 }}>
          {user.role} Account
        </div>
      </div>
    </div>
  );

  const CustomerDashboard = () => (
    <div style={{ marginTop: "32px", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "24px" }}>
      {[
        { title: "My Orders", desc: "View your past and active orders", icon: "📦", action: () => navigate("/orders") },
        { title: "Saved Addresses", desc: "Manage your delivery locations", icon: "📍", action: () => navigate("/address-payment") },
        { title: "Payment Methods", desc: "Cards, UPI & settings (Coming Soon)", icon: "💳", action: () => {} },
        { title: "Favorite Places", desc: "Quickly order from favorites (Coming Soon)", icon: "❤️", action: () => navigate("/restaurant") },
      ].map((card, i) => (
        <div key={i} onClick={card.action} style={{ background: cardBg, border: `1px solid ${goldBorder}`, borderRadius: "12px", padding: "24px", cursor: "pointer", transition: "transform 0.2s" }} onMouseEnter={e => e.currentTarget.style.transform = "translateY(-4px)"} onMouseLeave={e => e.currentTarget.style.transform = "translateY(0)"}>
          <div style={{ fontSize: "32px", marginBottom: "16px" }}>{card.icon}</div>
          <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: "18px", color: "#f0e6cc", marginBottom: "8px" }}>{card.title}</h3>
          <p style={{ color: textMuted, fontSize: "13px" }}>{card.desc}</p>
        </div>
      ))}
    </div>
  );

  const SellerDashboard = () => (
    <div style={{ marginTop: "32px", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "24px" }}>
      {[
        { title: "Manage Restaurant", desc: "Opening hours, details & status", icon: "🏪", action: () => navigate("/restaurant") },
        { title: "Menu Management", desc: "Add or edit categories and dishes", icon: "📋", action: () => navigate("/restaurant") },
        { title: "Analytics Hub", desc: "Live earnings and reports (Coming Soon)", icon: "📊", action: () => {} },
        { title: "Business Settings", desc: "Configure tax, payouts (Coming Soon)", icon: "⚙️", action: () => {} },
      ].map((card, i) => (
        <div key={i} onClick={card.action} style={{ background: cardBg, border: `1px solid ${goldBorder}`, borderRadius: "12px", padding: "24px", cursor: "pointer", transition: "transform 0.2s" }} onMouseEnter={e => e.currentTarget.style.transform = "translateY(-4px)"} onMouseLeave={e => e.currentTarget.style.transform = "translateY(0)"}>
          <div style={{ fontSize: "32px", marginBottom: "16px" }}>{card.icon}</div>
          <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: "18px", color: "#f0e6cc", marginBottom: "8px" }}>{card.title}</h3>
          <p style={{ color: textMuted, fontSize: "13px" }}>{card.desc}</p>
        </div>
      ))}
    </div>
  );

  return (
    <div style={{ 
      minHeight: "100vh", 
      backgroundColor: "#090705", 
      backgroundImage: "radial-gradient(ellipse at top right, rgba(201,168,76,0.05) 0%, transparent 60%), radial-gradient(ellipse at bottom left, rgba(184,134,11,0.05) 0%, transparent 60%)", 
      padding: "60px 24px", 
      display: "flex", 
      justifyContent: "center" 
    }}>
      <div style={{ maxWidth: "900px", width: "100%", position: "relative", zIndex: 10 }}>
        
        <ProfileBanner />

        {user.role === "customer" ? <CustomerDashboard /> : <SellerDashboard />}

        <div style={{ marginTop: "48px", display: "flex", justifyContent: "flex-end" }}>
          <button 
            onClick={handleLogout}
            style={{ 
              background: "rgba(220, 38, 38, 0.05)", border: "1px solid rgba(220, 38, 38, 0.3)", 
              color: "#ef4444", padding: "12px 32px", borderRadius: "8px", 
              fontFamily: "'DM Sans', sans-serif", fontSize: "12px", fontWeight: 700, letterSpacing: "0.15em", textTransform: "uppercase",
              cursor: "pointer", transition: "all 0.2s"
            }}
            onMouseEnter={e => { e.currentTarget.style.background = "rgba(220, 38, 38, 0.15)"; e.currentTarget.style.transform = "scale(1.02)"; }}
            onMouseLeave={e => { e.currentTarget.style.background = "rgba(220, 38, 38, 0.05)"; e.currentTarget.style.transform = "scale(1)"; }}
          >
            Sign Out
          </button>
        </div>

      </div>
    </div>
  );
};

export default AccountPage;
