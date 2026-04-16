import React, { useEffect, useState } from "react";
import { fetchPendingRestaurants, verifyRestaurant, fetchPendingRiders, verifyRider } from "../services/api";
import { toast } from "react-hot-toast";
import { FaStore, FaMotorcycle, FaCheckCircle, FaUserShield, FaSpinner } from "react-icons/fa";
import { MdOutlineLocationOn, MdDriveEta, MdPhone } from "react-icons/md";

type Tab = "restaurants" | "riders";

const AdminDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>("restaurants");
  const [restaurants, setRestaurants] = useState<any[]>([]);
  const [riders, setRiders] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [verifyingId, setVerifyingId] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, [activeTab]);

  const loadData = async () => {
    setLoading(true);
    try {
      if (activeTab === "restaurants") {
        const res = await fetchPendingRestaurants();
        if (res.success) setRestaurants(res.data);
      } else {
        const res = await fetchPendingRiders();
        if (res.success) setRiders(res.data);
      }
    } catch (error) {
      toast.error(`Failed to fetch pending ${activeTab}`);
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (id: string) => {
    setVerifyingId(id);
    try {
      let res;
      if (activeTab === "restaurants") {
        res = await verifyRestaurant(id);
      } else {
        res = await verifyRider(id);
      }

      if (res.success) {
        toast.success(res.message || "Verified successfully");
        if (activeTab === "restaurants") {
          setRestaurants((prev) => prev.filter((r) => r._id !== id));
        } else {
          setRiders((prev) => prev.filter((r) => r._id !== id));
        }
      } else {
        toast.error(res.message || "Verification failed");
      }
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "An error occurred");
    } finally {
      setVerifyingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0c] text-white p-6 md:p-10 font-sans selection:bg-rose-500/30">
      
      {/* HEADER SECTION */}
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-gradient-to-br from-rose-500 to-orange-500 rounded-xl shadow-[0_0_20px_rgba(244,63,94,0.4)]">
            <FaUserShield className="text-3xl text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">
              Admin Portal
            </h1>
            <p className="text-gray-400 font-medium tracking-wide text-sm mt-1">
              Verify platform participants
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-4 gap-8">
        
        {/* SIDE MENU */}
        <div className="lg:col-span-1 flex flex-col gap-3">
          <button
            onClick={() => setActiveTab("restaurants")}
            className={`w-full flex items-center justify-between p-4 rounded-2xl transition-all duration-300 border backdrop-blur-md ${
              activeTab === "restaurants"
                ? "bg-white/10 border-rose-500/50 shadow-[0_4px_30px_rgba(244,63,94,0.15)] text-rose-400"
                : "bg-white/[0.02] border-white/5 text-gray-400 hover:bg-white/5 hover:text-white"
            }`}
          >
            <div className="flex items-center gap-3 font-semibold text-lg">
              <FaStore className={activeTab === "restaurants" ? "text-rose-400" : "text-gray-500"} />
              Restaurants
            </div>
          </button>
          
          <button
            onClick={() => setActiveTab("riders")}
            className={`w-full flex items-center justify-between p-4 rounded-2xl transition-all duration-300 border backdrop-blur-md ${
              activeTab === "riders"
                ? "bg-white/10 border-teal-500/50 shadow-[0_4px_30px_rgba(20,184,166,0.15)] text-teal-400"
                : "bg-white/[0.02] border-white/5 text-gray-400 hover:bg-white/5 hover:text-white"
            }`}
          >
            <div className="flex items-center gap-3 font-semibold text-lg">
              <FaMotorcycle className={activeTab === "riders" ? "text-teal-400" : "text-gray-500"} />
              Riders
            </div>
          </button>
        </div>

        {/* FEED SECTION */}
        <div className="lg:col-span-3">
          <div className="p-8 rounded-3xl bg-white/[0.02] border border-white/5 backdrop-blur-lg min-h-[600px] shadow-2xl relative overflow-hidden">
            
            {/* Ambient Background Glow */}
            <div className={`absolute top-0 right-0 w-96 h-96 rounded-full blur-[120px] opacity-20 pointer-events-none transition-colors duration-700 ${activeTab === 'restaurants' ? 'bg-rose-500' : 'bg-teal-500'}`} />

            <h2 className="text-2xl font-bold mb-8 flex items-center gap-3 relative z-10">
              Pending {activeTab === "restaurants" ? "Restaurants" : "Riders"}
              <span className="text-sm px-3 py-1 bg-white/10 rounded-full font-medium tracking-wider text-gray-300">
                {activeTab === "restaurants" ? restaurants.length : riders.length} total
              </span>
            </h2>

            {loading ? (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="relative w-16 h-16">
                  <div className={`absolute inset-0 rounded-full border-t-2 animate-spin ${activeTab === 'restaurants' ? 'border-rose-500' : 'border-teal-500'}`}></div>
                  <div className={`absolute inset-2 rounded-full border-r-2 animate-spin animation-delay-150 ${activeTab === 'restaurants' ? 'border-rose-400' : 'border-teal-400'}`}></div>
                </div>
              </div>
            ) : (activeTab === "restaurants" ? restaurants : riders).length === 0 ? (
              <div className="flex flex-col items-center justify-center h-[400px] opacity-60">
                {activeTab === "restaurants" ? (
                  <FaStore className="text-7xl mb-6 text-gray-700 drop-shadow-lg" />
                ) : (
                  <FaMotorcycle className="text-7xl mb-6 text-gray-700 drop-shadow-lg" />
                )}
                <p className="text-xl text-gray-400 font-medium">All caught up!</p>
                <p className="text-sm text-gray-600 mt-2">No pending verifications at the moment.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative z-10">
                {(activeTab === "restaurants" ? restaurants : riders).map((item) => (
                  <div
                    key={item._id}
                    className="p-6 rounded-2xl bg-black/40 border border-white/10 hover:border-white/20 transition-all duration-300 group hover:-translate-y-1 hover:shadow-xl hover:bg-white/[0.04]"
                  >
                    <div className="flex items-start gap-4 mb-4">
                      <div className="w-16 h-16 rounded-full overflow-hidden bg-white/5 border border-white/10 shrink-0">
                        {item.picture || item.imageUrl ? (
                          <img src={item.picture || item.imageUrl} alt={item.name || item.restaurantName} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-gray-800">
                            {activeTab === "restaurants" ? <FaStore className="text-gray-400 text-xl" /> : <FaMotorcycle className="text-gray-400 text-xl" />}
                          </div>
                        )}
                      </div>
                      <div className="flex-1 w-full overflow-hidden">
                        <h3 className="text-xl font-bold truncate text-white mb-1 group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-white group-hover:to-gray-400 transition-colors">
                          {item.name || item.restaurantName}
                        </h3>
                        <p className="text-gray-400 text-sm mb-1 truncate">{item.email || item.ownerEmail}</p>
                        <p className="text-gray-500 text-xs font-mono bg-white/5 px-2 py-1 rounded w-fit">ID: {item._id.slice(-6)}</p>
                      </div>
                    </div>

                    <div className="space-y-3 mb-6 bg-white/[0.02] p-4 rounded-xl border border-white/5">
                      {activeTab === "restaurants" ? (
                         <div className="flex items-start gap-2 text-sm text-gray-400">
                           <MdOutlineLocationOn className="text-rose-400 text-lg shrink-0 mt-0.5" />
                           <span className="line-clamp-2">{item.address || "No address provided"}</span>
                         </div>
                      ) : (
                        <>
                          <div className="flex items-center gap-2 text-sm text-gray-400">
                             <MdPhone className="text-teal-400 text-lg shrink-0" />
                             <span>{item.phoneNumber || "N/A"}</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-gray-400 mt-2">
                             <MdDriveEta className="text-teal-400 text-lg shrink-0" />
                             <span className="font-mono text-xs bg-white/10 px-2 py-0.5 rounded">{item.drivingLicenseNumber || "N/A"}</span>
                          </div>
                        </>
                      )}
                    </div>

                    <button
                      onClick={() => handleVerify(item._id)}
                      disabled={verifyingId === item._id}
                      className={`w-full py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all duration-300 ${
                        activeTab === "restaurants" 
                          ? "bg-rose-500/10 text-rose-400 hover:bg-rose-500 hover:text-white border border-rose-500/20 hover:border-rose-500 hover:shadow-[0_0_20px_rgba(244,63,94,0.4)]"
                          : "bg-teal-500/10 text-teal-400 hover:bg-teal-500 hover:text-white border border-teal-500/20 hover:border-teal-500 hover:shadow-[0_0_20px_rgba(20,184,166,0.4)]"
                      } disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                      {verifyingId === item._id ? (
                        <FaSpinner className="animate-spin text-lg" />
                      ) : (
                        <>
                          <FaCheckCircle className="text-lg" />
                          Approve {activeTab === "restaurants" ? "Restaurant" : "Rider"}
                        </>
                      )}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
