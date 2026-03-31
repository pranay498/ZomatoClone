import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useGoogleLogin } from "@react-oauth/google";
import toast from "react-hot-toast";
import apiClient from "../services/apiClient";
import { useApp } from "../Context/MainContext";

const GoogleIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
  </svg>
);

const EyeOpen = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
    <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/>
  </svg>
);

const EyeClosed = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
    <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/>
    <line x1="1" y1="1" x2="23" y2="23"/>
  </svg>
);

const Spinner = () => (
  <svg style={{ animation: "spin 0.8s linear infinite", flexShrink: 0 }} width="16" height="16" viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" opacity="0.2"/>
    <path d="M12 2a10 10 0 0110 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/>
  </svg>
);

export default function LoginPage() {
  const [email, setEmail]           = useState("");
  const [password, setPassword]     = useState("");
  const [showPass, setShowPass]     = useState(false);
  const [loading, setLoading]       = useState(false);
  const [gLoading, setGLoading]     = useState(false);
  const [ready, setReady]           = useState(false);
  const [checked, setChecked]       = useState(false);
  const [hoverG, setHoverG]         = useState(false);
  const [hoverS, setHoverS]         = useState(false);
  const [emailFocus, setEmailFocus] = useState(false);
  const [passFocus, setPassFocus]   = useState(false);
  const [error, setError]           = useState("");


 const navigate = useNavigate();
  const { setToken ,setIsAuth,setUser} = useApp();
  const authService = import.meta.env.VITE_AUTH_SERVICE_URL;

   useEffect(() => {
    const t = setTimeout(() => setReady(true), 50);
    return () => clearTimeout(t);
  }, []);

  
  const responseGoogle = async (authResult) => {
    try {
      const result = await apiClient.post("/auth/google", {
       credential: authResult.code,
      });
      console.log("Fetch" ,result)
      localStorage.setItem("accessToken",  result.data.data.accessToken);
      localStorage.setItem("refreshToken", result.data.data.refreshToken);
      setToken(result.data.data.accessToken);
      setIsAuth(true);
      setUser(result.data.data.user)
      toast.success("Login successful");
      navigate("/")
    } catch (err) {
      console.error(err);
      toast.error("Google login failed");
      setError("Google authentication failed. Please try again.");
    } finally {
      setGLoading(false);
    }
  };

  const googleLogin = useGoogleLogin({
    onSuccess: responseGoogle,
    onError: () => {
      toast.error("Google login failed");
      setGLoading(false);
    },
    flow: "auth-code",
  });

  const handleSignIn = async () => {
    setError("");
    if (!email || !password) {
      setError("Please fill in all fields.");
      return;
    }
    setLoading(true);
    try {
      const result = await apiClient.post("/auth/login", {
        email,
        password,
      });
      localStorage.setItem("accessToken",  result.data.data.accessToken);
      localStorage.setItem("refreshToken", result.data.data.refreshToken);
      setToken(result.data.data.accessToken);
      toast.success("Login successful");
      navigate("/");
    } catch (err) {
      console.error(err);
      setError("Invalid email or password.");
      toast.error("Login failed");
    } finally {
      setLoading(false);
    }
  };
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;500;600&family=DM+Sans:ital,wght@0,300;0,400;0,500;1,300&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body { margin: 0; }

        @keyframes spin    { to { transform: rotate(360deg); } }
        @keyframes shimmer { 0% { background-position: 0% center; } 100% { background-position: 200% center; } }
        @keyframes drift1  { 0%,100%{transform:translate(0,0) scale(1);} 50%{transform:translate(28px,-20px) scale(1.04);} }
        @keyframes drift2  { 0%,100%{transform:translate(0,0) scale(1);} 50%{transform:translate(-22px,-26px) scale(1.06);} }
        @keyframes drift3  { 0%,100%{transform:translate(0,0) scale(1);} 50%{transform:translate(18px,22px) scale(1.03);} }
        @keyframes fadeUp  { from{opacity:0;transform:translateY(22px);} to{opacity:1;transform:translateY(0);} }

        .lp-input:-webkit-autofill,
        .lp-input:-webkit-autofill:focus {
          -webkit-box-shadow: 0 0 0 1000px #0d0a05 inset !important;
          -webkit-text-fill-color: #f0e6cc !important;
          caret-color: #d4af64 !important;
        }
        .lp-input::placeholder { color: rgba(200,180,140,0.22); font-style: italic; }
        .lp-input:focus { outline: none; border-bottom-color: rgba(212,175,100,0.7) !important; }
      `}</style>

      {/* ─── Page wrapper ─── */}
      <div style={{
        minHeight: "100vh",
        width: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#090705",
        background: "radial-gradient(ellipse at 20% 20%, rgba(201,168,76,0.07) 0%, transparent 55%), radial-gradient(ellipse at 80% 80%, rgba(184,134,11,0.06) 0%, transparent 55%), #090705",
        fontFamily: "'DM Sans', system-ui, sans-serif",
        padding: "24px 16px",
        position: "relative",
        overflow: "hidden",
      }}>

        {/* Floating orbs */}
        <div style={{ position:"absolute", top:"-8%", left:"-4%", width:440, height:440, borderRadius:"50%",
          background:"radial-gradient(circle, rgba(201,168,76,0.17) 0%, transparent 68%)",
          filter:"blur(45px)", animation:"drift1 14s ease-in-out infinite", pointerEvents:"none" }} />
        <div style={{ position:"absolute", bottom:"-10%", right:"-6%", width:380, height:380, borderRadius:"50%",
          background:"radial-gradient(circle, rgba(184,134,11,0.13) 0%, transparent 68%)",
          filter:"blur(50px)", animation:"drift2 17s ease-in-out infinite", pointerEvents:"none" }} />
        <div style={{ position:"absolute", top:"45%", left:"58%", width:280, height:280, borderRadius:"50%",
          background:"radial-gradient(circle, rgba(218,165,32,0.08) 0%, transparent 68%)",
          filter:"blur(38px)", animation:"drift3 11s ease-in-out infinite", pointerEvents:"none" }} />

        {/* Grid texture */}
        <div style={{ position:"absolute", inset:0, pointerEvents:"none", opacity:0.035,
          backgroundImage:"linear-gradient(rgba(212,175,100,1) 1px, transparent 1px), linear-gradient(90deg, rgba(212,175,100,1) 1px, transparent 1px)",
          backgroundSize:"64px 64px" }} />

        {/* Vignette */}
        <div style={{ position:"absolute", inset:0, pointerEvents:"none",
          background:"radial-gradient(ellipse at center, transparent 30%, rgba(0,0,0,0.6) 100%)" }} />

        {/* ─── Card ─── */}
        <div style={{
          position: "relative",
          width: "100%",
          maxWidth: 440,
          zIndex: 10,
          opacity: 1,
          transform: "translateY(0px)",
          transition: "all 0.75s cubic-bezier(.16,1,.3,1)",
        }}>
          {/* Corner brackets */}
          {[
            { top:0, left:0, borderTop:"1px solid rgba(212,175,100,0.38)", borderLeft:"1px solid rgba(212,175,100,0.38)" },
            { top:0, right:0, borderTop:"1px solid rgba(212,175,100,0.38)", borderRight:"1px solid rgba(212,175,100,0.38)" },
            { bottom:0, left:0, borderBottom:"1px solid rgba(212,175,100,0.38)", borderLeft:"1px solid rgba(212,175,100,0.38)" },
            { bottom:0, right:0, borderBottom:"1px solid rgba(212,175,100,0.38)", borderRight:"1px solid rgba(212,175,100,0.38)" },
          ].map((s, i) => (
            <div key={i} style={{ position:"absolute", width:22, height:22, ...s, zIndex:2 }} />
          ))}

          <div style={{
            background: "linear-gradient(155deg, rgba(20,15,7,0.98) 0%, rgba(11,8,3,0.99) 100%)",
            border: "1px solid rgba(212,175,100,0.13)",
            borderRadius: 3,
            padding: "52px 44px 46px",
            boxShadow: "0 0 0 1px rgba(212,175,100,0.05), 0 32px 80px rgba(0,0,0,0.8), inset 0 1px 0 rgba(255,255,255,0.025)",
          }}>

            {/* ── Logo ── */}
            <div style={{ textAlign:"center", marginBottom: 36 }}>
              <div style={{ display:"flex", justifyContent:"center", marginBottom:18 }}>
                <div style={{ width:50, height:50, border:"1px solid rgba(212,175,100,0.32)", transform:"rotate(45deg)",
                  display:"flex", alignItems:"center", justifyContent:"center" }}>
                  <div style={{ width:30, height:30, border:"1px solid rgba(212,175,100,0.16)",
                    display:"flex", alignItems:"center", justifyContent:"center" }}>
                    <span style={{ fontFamily:"'Playfair Display', serif", fontSize:14, fontWeight:500,
                      color:"#d4af64", transform:"rotate(-45deg)", display:"block", lineHeight:1 }}>A</span>
                  </div>
                </div>
              </div>

              <h1 style={{
                fontFamily: "'Playfair Display', Georgia, serif",
                fontSize: 30, fontWeight: 500, letterSpacing: "0.02em",
                background: "linear-gradient(90deg, #b8860b, #f0d070, #daa520, #c9a84c, #b8860b)",
                backgroundSize: "300% auto",
                WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text",
                animation: "shimmer 5s linear infinite",
                margin: 0, lineHeight: 1.2,
              }}>Welcome Back</h1>

              <p style={{ fontSize:10, letterSpacing:"0.22em", textTransform:"uppercase",
                color:"rgba(200,175,130,0.36)", marginTop:8, fontWeight:400 }}>
                Sign in to continue
              </p>

              <div style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:10, marginTop:14 }}>
                <div style={{ height:1, width:36, background:"linear-gradient(90deg, transparent, rgba(212,175,100,0.38))" }} />
                <div style={{ width:4, height:4, borderRadius:"50%", background:"rgba(212,175,100,0.45)" }} />
                <div style={{ height:1, width:36, background:"linear-gradient(90deg, rgba(212,175,100,0.38), transparent)" }} />
              </div>
            </div>

            {/* ── Google ── */}
            <button
              onMouseEnter={() => setHoverG(true)}
              onMouseLeave={() => setHoverG(false)}
             onClick={() => { setGLoading(true); googleLogin(); }}
              disabled={gLoading}
              style={{
                width: "100%", display:"flex", alignItems:"center", justifyContent:"center", gap:12,
                padding:"13px 20px",
                background: hoverG ? "rgba(212,175,100,0.09)" : "rgba(255,255,255,0.025)",
                border: `1px solid ${hoverG ? "rgba(212,175,100,0.48)" : "rgba(212,175,100,0.18)"}`,
                borderRadius: 2,
                color: hoverG ? "#d4af64" : "#cbbf9f",
                fontFamily: "'DM Sans', sans-serif", fontSize:11, fontWeight:500,
                letterSpacing:"0.18em", textTransform:"uppercase", cursor:"pointer",
                transition:"all 0.3s ease",
                transform: hoverG ? "translateY(-1px)" : "translateY(0)",
                boxShadow: hoverG ? "0 6px 24px rgba(212,175,100,0.13)" : "none",
              }}
            >
              {gLoading ? <Spinner /> : <GoogleIcon />}
              <span>{gLoading ? "Authenticating…" : "Continue with Google"}</span>
            </button>

            {/* ── OR divider ── */}
            <div style={{ display:"flex", alignItems:"center", gap:14, margin:"22px 0" }}>
              <div style={{ flex:1, height:1, background:"rgba(212,175,100,0.1)" }} />
              <span style={{ fontSize:10, letterSpacing:"0.18em", textTransform:"uppercase", color:"rgba(200,175,130,0.26)" }}>or</span>
              <div style={{ flex:1, height:1, background:"rgba(212,175,100,0.1)" }} />
            </div>

            {/* ── Email ── */}
            <div style={{ marginBottom:24 }}>
              <label style={{ display:"block", fontSize:10, letterSpacing:"0.2em", textTransform:"uppercase",
                color: emailFocus ? "rgba(212,175,100,0.65)" : "rgba(200,175,130,0.35)",
                marginBottom:10, fontWeight:500, transition:"color 0.3s" }}>
                Email Address
              </label>
              <input
                className="lp-input"
                type="email" placeholder="you@example.com"
                value={email} onChange={e => setEmail(e.target.value)}
                onFocus={() => setEmailFocus(true)} onBlur={() => setEmailFocus(false)}
                autoComplete="email"
                style={{ width:"100%", background:"transparent", border:"none",
                  borderBottom:`1px solid ${emailFocus ? "rgba(212,175,100,0.65)" : "rgba(212,175,100,0.2)"}`,
                  padding:"10px 0", color:"#f0e6cc", fontFamily:"'DM Sans', sans-serif",
                  fontSize:14, fontWeight:300, letterSpacing:"0.04em",
                  caretColor:"#d4af64", transition:"border-color 0.3s" }}
              />
            </div>

            {/* ── Password ── */}
            <div style={{ marginBottom:22 }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
                <label style={{ fontSize:10, letterSpacing:"0.2em", textTransform:"uppercase",
                  color: passFocus ? "rgba(212,175,100,0.65)" : "rgba(200,175,130,0.35)",
                  fontWeight:500, transition:"color 0.3s" }}>Password</label>
                <span style={{ fontSize:11, color:"rgba(212,175,100,0.42)", cursor:"pointer",
                  fontStyle:"italic", letterSpacing:"0.04em", transition:"color 0.2s" }}
                  onMouseEnter={e => e.target.style.color="#d4af64"}
                  onMouseLeave={e => e.target.style.color="rgba(212,175,100,0.42)"}>
                  Forgot password?
                </span>
              </div>
              <div style={{ position:"relative" }}>
                <input
                  className="lp-input"
                  type={showPass ? "text" : "password"} placeholder="••••••••"
                  value={password} onChange={e => setPassword(e.target.value)}
                  onFocus={() => setPassFocus(true)} onBlur={() => setPassFocus(false)}
                  autoComplete="current-password"
                  style={{ width:"100%", background:"transparent", border:"none",
                    borderBottom:`1px solid ${passFocus ? "rgba(212,175,100,0.65)" : "rgba(212,175,100,0.2)"}`,
                    padding:"10px 36px 10px 0", color:"#f0e6cc",
                    fontFamily:"'DM Sans', sans-serif", fontSize:14, fontWeight:300,
                    letterSpacing:"0.06em", caretColor:"#d4af64", transition:"border-color 0.3s" }}
                />
                <button type="button" onClick={() => setShowPass(!showPass)}
                  style={{ position:"absolute", right:0, top:"50%", transform:"translateY(-50%)",
                    background:"none", border:"none", cursor:"pointer", padding:4,
                    color: showPass ? "rgba(212,175,100,0.7)" : "rgba(200,175,130,0.28)",
                    transition:"color 0.2s", display:"flex", alignItems:"center" }}>
                  {showPass ? <EyeOpen /> : <EyeClosed />}
                </button>
              </div>
            </div>

            {/* ── Remember me ── */}
            <div onClick={() => setChecked(!checked)}
              style={{ display:"flex", alignItems:"center", gap:10, marginBottom:28, cursor:"pointer" }}>
              <div style={{ width:16, height:16, flexShrink:0, borderRadius:2,
                border:`1px solid ${checked ? "rgba(212,175,100,0.6)" : "rgba(212,175,100,0.28)"}`,
                background: checked ? "rgba(212,175,100,0.12)" : "transparent",
                display:"flex", alignItems:"center", justifyContent:"center", transition:"all 0.2s" }}>
                {checked && (
                  <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                    <path d="M1 4l3 3 5-6" stroke="#d4af64" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                )}
              </div>
              <span style={{ fontSize:12, color:"rgba(200,175,130,0.36)", letterSpacing:"0.06em" }}>
                Keep me signed in
              </span>
            </div>

            {/* ── Sign In ── */}
            <button
              onMouseEnter={() => setHoverS(true)}
              onMouseLeave={() => setHoverS(false)}
              onClick={handleSignIn}
              disabled={loading}
              style={{
                width:"100%", padding:"15px 20px",
                background: hoverS
                  ? "linear-gradient(135deg, #daa520 0%, #f5d060 50%, #daa520 100%)"
                  : "linear-gradient(135deg, #b8860b 0%, #daa520 40%, #e8c84a 60%, #b8860b 100%)",
                backgroundSize: "200% auto",
                border:"none", borderRadius:2,
                color:"#120d00",
                fontFamily:"'DM Sans', sans-serif", fontSize:11, fontWeight:600,
                letterSpacing:"0.26em", textTransform:"uppercase", cursor:"pointer",
                transition:"all 0.35s ease",
                transform: hoverS ? "translateY(-2px)" : "translateY(0)",
                boxShadow: hoverS ? "0 12px 36px rgba(212,175,100,0.38)" : "0 4px 16px rgba(212,175,100,0.14)",
                display:"flex", alignItems:"center", justifyContent:"center", gap:10,
              }}>
              {loading && <Spinner />}
              <span>{loading ? "Signing In…" : "Sign In"}</span>
            </button>

            {/* ── Footer ── */}
            <p style={{ textAlign:"center", marginTop:24, fontSize:12,
              color:"rgba(200,175,130,0.3)", letterSpacing:"0.05em" }}>
              Don't have an account?{" "}
              <span style={{ color:"rgba(212,175,100,0.5)", cursor:"pointer", fontStyle:"italic", transition:"color 0.2s" }}
                onMouseEnter={e => e.target.style.color="#d4af64"}
                onMouseLeave={e => e.target.style.color="rgba(212,175,100,0.5)"}>
                Create one
              </span>
            </p>

            {/* ── Bottom ornament ── */}
            <div style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:8, marginTop:22, opacity:0.18 }}>
              <div style={{ height:1, width:28, background:"rgba(212,175,100,1)" }} />
              <div style={{ width:4, height:4, transform:"rotate(45deg)", background:"rgba(212,175,100,1)" }} />
              <div style={{ height:1, width:28, background:"rgba(212,175,100,1)" }} />
            </div>
          </div>
        </div>

        {/* Footer text */}
        <p style={{ position:"absolute", bottom:14, left:0, right:0, textAlign:"center",
          fontFamily:"'DM Sans', sans-serif", fontSize:9, letterSpacing:"0.22em",
          color:"rgba(200,175,130,0.16)", textTransform:"uppercase", pointerEvents:"none" }}>
          Secured by Enterprise Encryption
        </p>
      </div>
    </>
  );
}