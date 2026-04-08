import React, { useState } from "react";
import { useApp } from "../Context/MainContext";
import { useNavigate } from "react-router-dom";
import apiClient from "../services/apiClient";

type Role = "customer" | "rider" | "seller";

const roleConfig = {
  customer: {
    icon: "◈",
    label: "Customer",
    description: "Order food from your favourite restaurants",
  },
  rider: {
    icon: "◎",
    label: "Rider",
    description: "Deliver orders and earn on your schedule",
  },
  seller: {
    icon: "◇",
    label: "Seller",
    description: "List your restaurant and reach more customers",
  },
};

const Spinner = () => (
  <svg style={{ animation: "spin 0.8s linear infinite", flexShrink: 0 }} width="16" height="16" viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" opacity="0.2" />
    <path d="M12 2a10 10 0 0110 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
  </svg>
);

const SelectRole = () => {
  const [role, setRole] = useState<Role | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { setUser } = useApp();
  const navigate = useNavigate();

  const roles: Role[] = ["customer", "rider", "seller"];

  const handleContinue = async () => {
    if (!role) return;
    setLoading(true);
    setError("");
    try {
      const res = await apiClient.put("/auth/add-role", { role });
      console.log("Add role response:", res.data);
      if (res.data.success) {
        // ✅ update tokens — role changed so new tokens issued
        localStorage.setItem("accessToken", res.data.data.accessToken);
        localStorage.setItem("refreshToken", res.data.data.refreshToken);
        setUser(res.data.data.user);
        navigate("/");
      }
    else {
      setError(res.data.message || "Failed to update role");
    }
  } catch {
    setError("Somethiam seing went wrong. Please try again.");
  } finally {
    setLoading(false);
  }
};

return (
  <>
    <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;500;600&family=DM+Sans:ital,wght@0,300;0,400;0,500;1,300&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        @keyframes spin    { to { transform: rotate(360deg); } }
        @keyframes shimmer { 0% { background-position: 0% center; } 100% { background-position: 200% center; } }
        @keyframes drift1  { 0%,100%{transform:translate(0,0) scale(1);} 50%{transform:translate(28px,-20px) scale(1.04);} }
        @keyframes drift2  { 0%,100%{transform:translate(0,0) scale(1);} 50%{transform:translate(-22px,-26px) scale(1.06);} }
        @keyframes fadeUp  { from{opacity:0;transform:translateY(20px);} to{opacity:1;transform:translateY(0);} }
        @keyframes roleIn  { from{opacity:0;transform:translateY(16px);} to{opacity:1;transform:translateY(0);} }

        .role-card { transition: all 0.3s ease; cursor: pointer; }
        .role-card:hover { transform: translateY(-2px); }
      `}</style>

    <div style={{
      minHeight: "100vh", width: "100%",
      display: "flex", alignItems: "center", justifyContent: "center",
      backgroundColor: "#090705",
      background: "radial-gradient(ellipse at 20% 20%, rgba(201,168,76,0.07) 0%, transparent 55%), radial-gradient(ellipse at 80% 80%, rgba(184,134,11,0.06) 0%, transparent 55%), #090705",
      fontFamily: "'DM Sans', system-ui, sans-serif",
      padding: "24px 16px", position: "relative", overflow: "hidden",
    }}>

      {/* Floating orbs */}
      <div style={{
        position: "absolute", top: "-8%", left: "-4%", width: 440, height: 440, borderRadius: "50%",
        background: "radial-gradient(circle, rgba(201,168,76,0.17) 0%, transparent 68%)",
        filter: "blur(45px)", animation: "drift1 14s ease-in-out infinite", pointerEvents: "none"
      }} />
      <div style={{
        position: "absolute", bottom: "-10%", right: "-6%", width: 380, height: 380, borderRadius: "50%",
        background: "radial-gradient(circle, rgba(184,134,11,0.13) 0%, transparent 68%)",
        filter: "blur(50px)", animation: "drift2 17s ease-in-out infinite", pointerEvents: "none"
      }} />

      {/* Grid texture */}
      <div style={{
        position: "absolute", inset: 0, pointerEvents: "none", opacity: 0.035,
        backgroundImage: "linear-gradient(rgba(212,175,100,1) 1px, transparent 1px), linear-gradient(90deg, rgba(212,175,100,1) 1px, transparent 1px)",
        backgroundSize: "64px 64px"
      }} />

      {/* Vignette */}
      <div style={{
        position: "absolute", inset: 0, pointerEvents: "none",
        background: "radial-gradient(ellipse at center, transparent 30%, rgba(0,0,0,0.6) 100%)"
      }} />

      {/* Card */}
      <div style={{
        position: "relative", width: "100%", maxWidth: 480, zIndex: 10,
        animation: "fadeUp 0.75s cubic-bezier(.16,1,.3,1) forwards",
      }}>
        {/* Corner brackets */}
        {[
          { top: 0, left: 0, borderTop: "1px solid rgba(212,175,100,0.38)", borderLeft: "1px solid rgba(212,175,100,0.38)" },
          { top: 0, right: 0, borderTop: "1px solid rgba(212,175,100,0.38)", borderRight: "1px solid rgba(212,175,100,0.38)" },
          { bottom: 0, left: 0, borderBottom: "1px solid rgba(212,175,100,0.38)", borderLeft: "1px solid rgba(212,175,100,0.38)" },
          { bottom: 0, right: 0, borderBottom: "1px solid rgba(212,175,100,0.38)", borderRight: "1px solid rgba(212,175,100,0.38)" },
        ].map((s, i) => (
          <div key={i} style={{ position: "absolute", width: 22, height: 22, ...s, zIndex: 2 }} />
        ))}

        <div style={{
          background: "linear-gradient(155deg, rgba(20,15,7,0.98) 0%, rgba(11,8,3,0.99) 100%)",
          border: "1px solid rgba(212,175,100,0.13)", borderRadius: 3,
          padding: "52px 44px 46px",
          boxShadow: "0 0 0 1px rgba(212,175,100,0.05), 0 32px 80px rgba(0,0,0,0.8), inset 0 1px 0 rgba(255,255,255,0.025)",
        }}>

          {/* Header */}
          <div style={{ textAlign: "center", marginBottom: 36 }}>
            <div style={{ display: "flex", justifyContent: "center", marginBottom: 18 }}>
              <div style={{
                width: 50, height: 50, border: "1px solid rgba(212,175,100,0.32)", transform: "rotate(45deg)",
                display: "flex", alignItems: "center", justifyContent: "center"
              }}>
                <div style={{
                  width: 30, height: 30, border: "1px solid rgba(212,175,100,0.16)",
                  display: "flex", alignItems: "center", justifyContent: "center"
                }}>
                  <span style={{
                    fontFamily: "'Playfair Display', serif", fontSize: 14, fontWeight: 500,
                    color: "#d4af64", transform: "rotate(-45deg)", display: "block", lineHeight: 1
                  }}>A</span>
                </div>
              </div>
            </div>

            <h1 style={{
              fontFamily: "'Playfair Display', Georgia, serif",
              fontSize: 28, fontWeight: 500, letterSpacing: "0.02em",
              background: "linear-gradient(90deg, #b8860b, #f0d070, #daa520, #c9a84c, #b8860b)",
              backgroundSize: "300% auto",
              WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text",
              animation: "shimmer 5s linear infinite", margin: 0, lineHeight: 1.2,
            }}>Choose Your Role</h1>

            <p style={{
              fontSize: 10, letterSpacing: "0.22em", textTransform: "uppercase",
              color: "rgba(200,175,130,0.36)", marginTop: 8, fontWeight: 400
            }}>
              Select how you'd like to continue
            </p>

            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, marginTop: 14 }}>
              <div style={{ height: 1, width: 36, background: "linear-gradient(90deg, transparent, rgba(212,175,100,0.38))" }} />
              <div style={{ width: 4, height: 4, borderRadius: "50%", background: "rgba(212,175,100,0.45)" }} />
              <div style={{ height: 1, width: 36, background: "linear-gradient(90deg, rgba(212,175,100,0.38), transparent)" }} />
            </div>
          </div>

          {/* Role Cards */}
          <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 28 }}>
            {roles.map((r, i) => {
              const isSelected = role === r;
              const cfg = roleConfig[r];
              return (
                <div
                  key={r}
                  className="role-card"
                  onClick={() => setRole(r)}
                  style={{
                    padding: "16px 20px",
                    border: `1px solid ${isSelected ? "rgba(212,175,100,0.6)" : "rgba(212,175,100,0.15)"}`,
                    borderRadius: 2,
                    background: isSelected ? "rgba(212,175,100,0.08)" : "rgba(255,255,255,0.02)",
                    display: "flex", alignItems: "center", gap: 16,
                    boxShadow: isSelected ? "0 0 20px rgba(212,175,100,0.1)" : "none",
                    animation: `roleIn 0.5s cubic-bezier(.16,1,.3,1) ${i * 0.08}s both`,
                  }}>

                  {/* Icon */}
                  <div style={{
                    width: 42, height: 42, flexShrink: 0,
                    border: `1px solid ${isSelected ? "rgba(212,175,100,0.5)" : "rgba(212,175,100,0.2)"}`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    background: isSelected ? "rgba(212,175,100,0.1)" : "transparent",
                    transition: "all 0.3s",
                  }}>
                    <span style={{
                      fontSize: 18,
                      color: isSelected ? "#d4af64" : "rgba(212,175,100,0.4)",
                      transition: "color 0.3s",
                    }}>{cfg.icon}</span>
                  </div>

                  {/* Text */}
                  <div style={{ flex: 1 }}>
                    <p style={{
                      fontFamily: "'Playfair Display', serif",
                      fontSize: 15, fontWeight: 500,
                      color: isSelected ? "#d4af64" : "rgba(200,175,130,0.7)",
                      letterSpacing: "0.04em", marginBottom: 3,
                      transition: "color 0.3s",
                    }}>{cfg.label}</p>
                    <p style={{
                      fontSize: 11, color: "rgba(200,175,130,0.3)",
                      letterSpacing: "0.03em", fontWeight: 300,
                    }}>{cfg.description}</p>
                  </div>

                  {/* Selected indicator */}
                  <div style={{
                    width: 16, height: 16, flexShrink: 0, borderRadius: 2,
                    border: `1px solid ${isSelected ? "rgba(212,175,100,0.6)" : "rgba(212,175,100,0.25)"}`,
                    background: isSelected ? "rgba(212,175,100,0.12)" : "transparent",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    transition: "all 0.2s",
                  }}>
                    {isSelected && (
                      <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                        <path d="M1 4l3 3 5-6" stroke="#d4af64" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Error */}
          {error && (
            <p style={{
              color: "#e05c5c", fontSize: 12, marginBottom: 16,
              textAlign: "center", letterSpacing: "0.04em"
            }}>{error}</p>
          )}

          {/* Continue Button */}
          <button
            onClick={handleContinue}
            disabled={!role || loading}
            style={{
              width: "100%", padding: "15px 20px",
              background: !role
                ? "rgba(212,175,100,0.08)"
                : "linear-gradient(135deg, #b8860b 0%, #daa520 40%, #e8c84a 60%, #b8860b 100%)",
              border: !role ? "1px solid rgba(212,175,100,0.2)" : "none",
              borderRadius: 2,
              color: !role ? "rgba(212,175,100,0.3)" : "#120d00",
              fontFamily: "'DM Sans', sans-serif", fontSize: 11, fontWeight: 600,
              letterSpacing: "0.26em", textTransform: "uppercase",
              cursor: !role ? "not-allowed" : "pointer",
              transition: "all 0.35s ease",
              boxShadow: role ? "0 4px 16px rgba(212,175,100,0.14)" : "none",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
            }}>
            {loading && <Spinner />}
            <span>{loading ? "Updating…" : "Continue"}</span>
          </button>

          {/* Bottom ornament */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 22, opacity: 0.18 }}>
            <div style={{ height: 1, width: 28, background: "rgba(212,175,100,1)" }} />
            <div style={{ width: 4, height: 4, transform: "rotate(45deg)", background: "rgba(212,175,100,1)" }} />
            <div style={{ height: 1, width: 28, background: "rgba(212,175,100,1)" }} />
          </div>
        </div>
      </div>

      {/* Footer */}
      <p style={{
        position: "absolute", bottom: 14, left: 0, right: 0, textAlign: "center",
        fontFamily: "'DM Sans', sans-serif", fontSize: 9, letterSpacing: "0.22em",
        color: "rgba(200,175,130,0.16)", textTransform: "uppercase", pointerEvents: "none"
      }}>
        Secured by Enterprise Encryption
      </p>
    </div>
  </>
);
};

export default SelectRole;