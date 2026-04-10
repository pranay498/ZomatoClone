import React, { useState, useEffect } from "react";
import RiderOnboardingForm from "../../components/Rider/RiderOnboardingForm";
import RiderActiveDashboard from "../../components/Rider/RiderActiveDashboard";
import { useApp } from "../../Context/MainContext";
import { fetchRiderProfile, RiderProfile } from "../../services/api";

const RiderDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [profileExists, setProfileExists] = useState(false);
  const [riderData, setRiderData] = useState<RiderProfile | null>(null);
  const { user } = useApp();

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const data = await fetchRiderProfile();
      if (data.success && data.rider) {
        setRiderData(data.rider);
        setProfileExists(true);
      }
    } catch (error: any) {
      if (error.response?.status === 404) {
        setProfileExists(false); // No profile yet — show onboarding
      } else {
        console.error("Error fetching rider profile:", error);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.role === "rider") {
      fetchProfile();
    }
  }, [user]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#090705] flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-amber-600"></div>
      </div>
    );
  }

  return (
    <div className="absolute inset-0 z-50 w-full min-h-screen bg-[#090705] text-white overflow-y-auto">
      {profileExists ? (
        <RiderActiveDashboard riderData={riderData!} onProfileUpdate={fetchProfile} />
      ) : (
        <RiderOnboardingForm onComplete={fetchProfile} />
      )}
    </div>
  );
};

export default RiderDashboard;
