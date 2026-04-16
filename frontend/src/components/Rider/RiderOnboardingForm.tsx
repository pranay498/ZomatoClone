import React, { useState } from "react";
import toast from "react-hot-toast";
import { createRiderProfile } from "../../services/api";

interface Props {
  onComplete: () => void;
}

const RiderOnboardingForm: React.FC<Props> = ({ onComplete }) => {
  const [name, setName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [addharNumber, setAddharNumber] = useState("");
  const [drivingLicenseNumber, setDrivingLicenseNumber] = useState("");
  const [picture, setPicture] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setPicture(e.target.files[0]);
    }
  };

  const submitData = async (formData: FormData) => {
    try {
      const data = await createRiderProfile(formData);
      if (data.success) {
        toast.success("Welcome aboard! Profile created.");
        onComplete();
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to create profile.");
      setLoading(false);
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !phoneNumber || !addharNumber || !drivingLicenseNumber) {
      toast.error("Please fill in all required fields!");
      return;
    }

    setLoading(true);

    const formData = new FormData();
    formData.append("name", name);
    formData.append("phoneNumber", phoneNumber);
    formData.append("addharNumber", addharNumber);
    formData.append("drivingLicenseNumber", drivingLicenseNumber);
    if (picture) {
      formData.append("picture", picture);
    }

    // Try to get location
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          formData.append("longitude", position.coords.longitude.toString());
          formData.append("latitude", position.coords.latitude.toString());
          await submitData(formData);
        },
        async () => {
          // Fallback if user denies location
          await submitData(formData);
        }
      );
    } else {
      await submitData(formData);
    }
  };

  const inputStyle = {
    width: "100%", background: "rgba(28,25,22,0.5)", border: "1px solid rgba(212,175,100,0.1)",
    color: "rgba(255,255,255,0.9)", borderRadius: 8, padding: "14px 16px", outline: "none",
    transition: "all 0.3s ease", fontSize: "14px", marginTop: "8px"
  };

  const labelStyle = {
    fontSize: "12px", textTransform: "uppercase" as const, letterSpacing: "0.1em",
    color: "rgba(212,175,100,0.6)", fontWeight: 600, display: "block"
  };

  return (
    <div style={{
      display: "flex", width: "100%", minHeight: "100vh", maxWidth: "900px", margin: "0 auto",
      padding: "96px 24px", position: "relative", zIndex: 10
    }}>
      <style>{`
        @keyframes fadeUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes shimmer { 0% { background-position: 0% center; } 100% { background-position: 200% center; } }
        .onboarding-wrap { animation: fadeUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards; width: 100%; position: relative; }
        .premium-input:focus { border-color: rgba(212,175,100,0.5) !important; box-shadow: 0 0 0 1px rgba(212,175,100,0.2) !important; }
        .premium-btn {
          background: linear-gradient(135deg, #b8860b 0%, #daa520 40%, #e8c84a 60%, #b8860b 100%);
          transition: all 0.3s ease; box-shadow: 0 4px 24px rgba(212,175,100,0.25);
        }
        .premium-btn:hover:not(:disabled) { box-shadow: 0 8px 32px rgba(212,175,100,0.35); transform: translateY(-2px); }
        .premium-btn:disabled { opacity: 0.5; cursor: not-allowed; }
      `}</style>

      <div className="onboarding-wrap">
        {/* Glow */}
        <div style={{
          position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)",
          width: "80%", height: "80%", background: "rgba(245, 158, 11, 0.08)", filter: "blur(120px)",
          borderRadius: "50%", pointerEvents: "none", zIndex: -10
        }} />

        <div style={{
          background: "linear-gradient(135deg, rgba(20,18,16,0.9) 0%, rgba(12,10,8,0.9) 100%)",
          border: "1px solid rgba(212,175,100,0.2)", borderRadius: "16px",
          padding: "56px", boxShadow: "0 0 80px rgba(0,0,0,0.8), inset 0 1px 0 rgba(255,255,255,0.05)",
          backdropFilter: "blur(20px)"
        }}>

          <div style={{ marginBottom: "48px" }}>
            <h1 style={{
              fontFamily: "'Playfair Display', serif", fontSize: "40px", margin: "0 0 16px 0",
              background: "linear-gradient(90deg, #b8860b, #f0d070, #c9a84c, #b8860b)",
              backgroundSize: "200% auto", WebkitBackgroundClip: "text", color: "transparent",
              animation: "shimmer 5s linear infinite"
            }}>
              Join the Fleet
            </h1>
            <p style={{
              color: "rgba(254, 243, 199, 0.4)", fontSize: "14px", letterSpacing: "0.2em",
              textTransform: "uppercase", fontWeight: 300, margin: 0
            }}>Set up your delivery profile</p>
          </div>

          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "32px" }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "32px" }}>

              <div>
                <label style={labelStyle}>Full Name</label>
                <input
                  type="text" value={name} onChange={(e) => setName(e.target.value)}
                  placeholder="John Doe" className="premium-input" style={inputStyle}
                />
              </div>

              <div>
                <label style={labelStyle}>Phone Number</label>
                <input
                  type="tel" value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="+91 98765 43210" className="premium-input" style={inputStyle}
                />
              </div>

              <div>
                <label style={labelStyle}>Aadhaar Number</label>
                <input
                  type="text" value={addharNumber} onChange={(e) => setAddharNumber(e.target.value)}
                  placeholder="XXXX XXXX XXXX" className="premium-input" style={inputStyle}
                />
              </div>

              <div>
                <label style={labelStyle}>Driving License</label>
                <input
                  type="text" value={drivingLicenseNumber} onChange={(e) => setDrivingLicenseNumber(e.target.value)}
                  placeholder="DL-XX-XXXXXXXXX" className="premium-input" style={inputStyle}
                />
              </div>

              <div>
                <label style={labelStyle}>Profile Picture</label>
                <input
                  type="file" accept="image/*" onChange={handleImageChange}
                  className="premium-input" style={{ ...inputStyle, padding: "10px 16px", cursor: "pointer" }}
                />
              </div>

            </div>

            <div style={{
              marginTop: "40px", paddingTop: "32px", borderTop: "1px solid rgba(212,175,100,0.1)",
              display: "flex", justifyContent: "flex-end"
            }}>
              <button
                type="submit" disabled={loading} className="premium-btn"
                style={{
                  padding: "16px 32px", color: "#120d00", borderRadius: "4px", border: "none",
                  textTransform: "uppercase", letterSpacing: "0.2em", fontSize: "12px",
                  fontWeight: 700, minWidth: "200px", display: "flex", alignItems: "center", justifyContent: "center"
                }}
              >
                {loading ? "PROCESSING..." : "COMPLETE SETUP"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default RiderOnboardingForm;
