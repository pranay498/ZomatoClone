import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import toast from "react-hot-toast";
import { useApp } from "../Context/MainContext";
import { registerUser } from "../services/api";

const GoogleIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
  </svg>
);

const EyeOpen = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
    <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7z" /><circle cx="12" cy="12" r="3" />
  </svg>
);

const EyeClosed = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
    <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24" />
    <line x1="1" y1="1" x2="23" y2="23" />
  </svg>
);

const Spinner = () => (
  <svg style={{ animation: "spin 0.8s linear infinite", flexShrink: 0 }} width="16" height="16" viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" opacity="0.2" />
    <path d="M12 2a10 10 0 0110 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
  </svg>
);

const RegisterPage: React.FC = () => {
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    phoneNumber: "",
  });

  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [hoverS, setHoverS] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);

  const navigate = useNavigate();
  const { setToken, setIsAuth, setUser } = useApp();

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    const { firstName, lastName, email, password, phoneNumber } = formData;

    if (!firstName || !lastName || !email || !password || !phoneNumber) {
      toast.error("Please fill in all fields.");
      return;
    }

    setLoading(true);
    try {
      const result = await registerUser(formData);
      if (result.success) {
        localStorage.setItem("accessToken", result.data.accessToken);
        localStorage.setItem("refreshToken", result.data.refreshToken);
        setToken(result.data.accessToken);
        setIsAuth(true);
        setUser(result.data.user);
        toast.success("Account created successfully!");
        navigate("/");
      }
    } catch (err: any) {
      console.error(err);
      const msg = err?.response?.data?.message || "Registration failed. Try again.";
      toast.error(msg);
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
        @keyframes drift3  { 0%,100%{transform:translate(0,0) scale(1);} 50%{transform:translate(18px,22px) scale(1.03);} }

        .lp-input:-webkit-autofill,
        .lp-input:-webkit-autofill:focus {
          -webkit-box-shadow: 0 0 0 1000px #0d0a05 inset !important;
          -webkit-text-fill-color: #f0e6cc !important;
          caret-color: #d4af64 !important;
        }
        .lp-input::placeholder { color: rgba(200,180,140,0.22); font-style: italic; }
        .lp-input:focus { outline: none; border-bottom-color: rgba(212,175,100,0.7) !important; }
      `}</style>

      <div style={{
        minHeight: "100vh",
        width: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#090705",
        background: "radial-gradient(ellipse at 20% 20%, rgba(201,168,76,0.07) 0%, transparent 55%), radial-gradient(ellipse at 80% 80%, rgba(184,134,11,0.06) 0%, transparent 55%), #090705",
        fontFamily: "'DM Sans', system-ui, sans-serif",
        padding: "40px 16px",
        position: "relative",
        overflow: "hidden",
      }}>

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

        <div style={{
          position: "absolute", inset: 0, pointerEvents: "none", opacity: 0.035,
          backgroundImage: "linear-gradient(rgba(212,175,100,1) 1px, transparent 1px), linear-gradient(90deg, rgba(212,175,100,1) 1px, transparent 1px)",
          backgroundSize: "64px 64px"
        }} />

        <div style={{
          position: "relative",
          width: "100%",
          maxWidth: 480,
          zIndex: 10,
        }}>
          {/* Brackets */}
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
            border: "1px solid rgba(212,175,100,0.13)",
            borderRadius: 3,
            padding: "40px 44px",
            boxShadow: "0 0 0 1px rgba(212,175,100,0.05), 0 32px 80px rgba(0,0,0,0.8)",
          }}>

            <div style={{ textAlign: "center", marginBottom: 30 }}>
              <h1 style={{
                fontFamily: "'Playfair Display', serif",
                fontSize: 28, fontWeight: 500, letterSpacing: "0.02em",
                background: "linear-gradient(90deg, #b8860b, #f0d070, #daa520, #c9a84c, #b8860b)",
                backgroundSize: "300% auto",
                WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
                animation: "shimmer 5s linear infinite",
                margin: 0,
              }}>Create Account</h1>
              <p style={{
                fontSize: 10, letterSpacing: "0.22em", textTransform: "uppercase",
                color: "rgba(200,175,130,0.36)", marginTop: 8
              }}>Join our elite dining network</p>
            </div>

            <form onSubmit={handleRegister}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", marginBottom: "20px" }}>
                <div>
                  <label style={{
                    display: "block", fontSize: 10, letterSpacing: "0.2em", textTransform: "uppercase",
                    color: focusedField === "firstName" ? "rgba(212,175,100,0.65)" : "rgba(200,175,130,0.35)",
                    marginBottom: 8, fontWeight: 500
                  }}>First Name</label>
                  <input className="lp-input" name="firstName" value={formData.firstName} onChange={handleInputChange}
                    onFocus={() => setFocusedField("firstName")} onBlur={() => setFocusedField(null)}
                    style={{
                      width: "100%", background: "transparent", border: "none",
                      borderBottom: `1px solid ${focusedField === "firstName" ? "rgba(212,175,100,0.65)" : "rgba(212,175,100,0.2)"}`,
                      padding: "8px 0", color: "#f0e6cc", fontSize: 14
                    }} />
                </div>
                <div>
                  <label style={{
                    display: "block", fontSize: 10, letterSpacing: "0.2em", textTransform: "uppercase",
                    color: focusedField === "lastName" ? "rgba(212,175,100,0.65)" : "rgba(200,175,130,0.35)",
                    marginBottom: 8, fontWeight: 500
                  }}>Last Name</label>
                  <input className="lp-input" name="lastName" value={formData.lastName} onChange={handleInputChange}
                    onFocus={() => setFocusedField("lastName")} onBlur={() => setFocusedField(null)}
                    style={{
                      width: "100%", background: "transparent", border: "none",
                      borderBottom: `1px solid ${focusedField === "lastName" ? "rgba(212,175,100,0.65)" : "rgba(212,175,100,0.2)"}`,
                      padding: "8px 0", color: "#f0e6cc", fontSize: 14
                    }} />
                </div>
              </div>

              <div style={{ marginBottom: 20 }}>
                <label style={{
                  display: "block", fontSize: 10, letterSpacing: "0.2em", textTransform: "uppercase",
                  color: focusedField === "email" ? "rgba(212,175,100,0.65)" : "rgba(200,175,130,0.35)",
                  marginBottom: 8, fontWeight: 500
                }}>Email Address</label>
                <input className="lp-input" name="email" type="email" value={formData.email} onChange={handleInputChange}
                  onFocus={() => setFocusedField("email")} onBlur={() => setFocusedField(null)}
                  style={{
                    width: "100%", background: "transparent", border: "none",
                    borderBottom: `1px solid ${focusedField === "email" ? "rgba(212,175,100,0.65)" : "rgba(212,175,100,0.2)"}`,
                    padding: "8px 0", color: "#f0e6cc", fontSize: 14
                  }} />
              </div>

              <div style={{ marginBottom: 20 }}>
                <label style={{
                  display: "block", fontSize: 10, letterSpacing: "0.2em", textTransform: "uppercase",
                  color: focusedField === "phoneNumber" ? "rgba(212,175,100,0.65)" : "rgba(200,175,130,0.35)",
                  marginBottom: 8, fontWeight: 500
                }}>Phone Number</label>
                <input className="lp-input" name="phoneNumber" type="tel" value={formData.phoneNumber} onChange={handleInputChange}
                  onFocus={() => setFocusedField("phoneNumber")} onBlur={() => setFocusedField(null)}
                  style={{
                    width: "100%", background: "transparent", border: "none",
                    borderBottom: `1px solid ${focusedField === "phoneNumber" ? "rgba(212,175,100,0.65)" : "rgba(212,175,100,0.2)"}`,
                    padding: "8px 0", color: "#f0e6cc", fontSize: 14
                  }} />
              </div>

              <div style={{ marginBottom: 30 }}>
                <label style={{
                  display: "block", fontSize: 10, letterSpacing: "0.2em", textTransform: "uppercase",
                  color: focusedField === "password" ? "rgba(212,175,100,0.65)" : "rgba(200,175,130,0.35)",
                  marginBottom: 8, fontWeight: 500
                }}>Password</label>
                <div style={{ position: "relative" }}>
                  <input className="lp-input" name="password" type={showPass ? "text" : "password"} value={formData.password} onChange={handleInputChange}
                    onFocus={() => setFocusedField("password")} onBlur={() => setFocusedField(null)}
                    style={{
                      width: "100%", background: "transparent", border: "none",
                      borderBottom: `1px solid ${focusedField === "password" ? "rgba(212,175,100,0.65)" : "rgba(212,175,100,0.2)"}`,
                      padding: "8px 36px 8px 0", color: "#f0e6cc", fontSize: 14
                    }} />
                  <button type="button" onClick={() => setShowPass(!showPass)}
                    style={{
                      position: "absolute", right: 0, top: "50%", transform: "translateY(-50%)",
                      background: "none", border: "none", cursor: "pointer", color: "rgba(212,175,100,0.4)"
                    }}>
                    {showPass ? <EyeOpen /> : <EyeClosed />}
                  </button>
                </div>
              </div>

              <button
                onMouseEnter={() => setHoverS(true)}
                onMouseLeave={() => setHoverS(false)}
                disabled={loading}
                style={{
                  width: "100%", padding: "14px",
                  background: hoverS ? "#f5d060" : "#d4af64",
                  border: "none", borderRadius: 2, color: "#120d00", fontWeight: 600,
                  letterSpacing: "0.2em", textTransform: "uppercase", cursor: "pointer",
                  transition: "all 0.3s", display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
                }}>
                {loading && <Spinner />}
                <span>{loading ? "Creating..." : "Register Now"}</span>
              </button>
            </form>

            <p style={{ textAlign: "center", marginTop: 24, fontSize: 12, color: "rgba(200,175,130,0.3)" }}>
              Already registered?{" "}
              <Link to="/login" style={{ color: "rgba(212,175,100,0.6)", textDecoration: "none", fontStyle: "italic" }}>
                Sign In Instead
              </Link>
            </p>
          </div>
        </div>
      </div>
    </>
  );
};

export default RegisterPage;
