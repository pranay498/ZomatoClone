import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useApp } from "../../Context/MainContext";
import toast from "react-hot-toast";
import {
  toggleRiderAvailability,
  acceptRiderOrder,
  getCurrentRiderOrder,
  updateRiderOrderStatus,
} from "../../services/api";
import { useSocket } from "../../Context/SocketContext";
import { IOrder, RiderProfile } from "../../types";
import RiderMap from "./RiderMap";

interface Props {
  riderData: RiderProfile;
  onProfileUpdate: () => void;
}

const NOTIFICATION_AUDIO_URL = "https://cdn.pixabay.com/download/audio/2021/08/04/audio_0625c1539c.mp3";

const RiderActiveDashboard: React.FC<Props> = ({ riderData, onProfileUpdate }) => {
  const [toggling, setToggling] = useState(false);
  const [incomingOrder, setIncomingOrder] = useState<any | null>(null);
  const [activeOrder, setActiveOrder] = useState<IOrder | null>(null);
  const [loadingOrder, setLoadingOrder] = useState(true);
  const [btnLoading, setBtnLoading] = useState(false);
  const [myLocation, setMyLocation] = useState<{ lat: number; lng: number } | null>(null);
  const { socket } = useSocket();
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Initialize audio
  useEffect(() => {
    audioRef.current = new Audio(NOTIFICATION_AUDIO_URL);
  }, []);

  // 🔄 Fetch current active order on mount
  useEffect(() => {
    const fetchCurrent = async () => {
      try {
        const res = await getCurrentRiderOrder();
        if (res.success && res.data) {
          setActiveOrder(res.data);
        }
      } catch (error) {
        console.error("Failed to fetch active order:", error);
      } finally {
        setLoadingOrder(false);
      }
    };
    fetchCurrent();
  }, []);

  // 🚀 Auto-toggle online when rider logs in
  useEffect(() => {
    if (!riderData.isAvailable && riderData.isVerified) {
      // Small timeout to ensure everything is mounted
      setTimeout(() => {
        handleToggle();
      }, 500);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 📡 Socket Listeners
  useEffect(() => {
    if (!socket || !riderData.isAvailable) return;

    const onNewOrder = (payload: any) => {
      console.log("🛵 [Socket] New Order Available:", payload);
      setIncomingOrder(payload);

      // Play sound if possible (requires interaction first)
      if (audioRef.current) {
        audioRef.current.play().catch(e => console.warn("Audio blocked:", e));
      }
    };

    const handleStatusUpdate = (payload: any) => {
      // If our current order changed externally
      if (activeOrder && payload.orderId === activeOrder._id) {
        setActiveOrder(prev => prev ? { ...prev, status: payload.status } : null);
      }
    };

    socket.on("order:available", onNewOrder);
    socket.on("ORDER_STATUS_UPDATED", handleStatusUpdate);

    return () => {
      socket.off("order:available", onNewOrder);
      socket.off("ORDER_STATUS_UPDATED", handleStatusUpdate);
    };
  }, [socket, riderData.isAvailable, activeOrder]);

  useEffect(() => {
    // Agar socket nahi hai, ya order nahi hai, ya order picked up nahi hua hai, toh ruk jao
    if (!socket || !activeOrder || activeOrder.status !== "picked_up") {
      return;
    }

    console.log("📍 [Live Tracking] Broadcasting location...");

    // Immediate first ping
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setMyLocation({ lat: position.coords.latitude, lng: position.coords.longitude });
          const payload = {
            orderId: activeOrder._id,
            userId: activeOrder.userId,
            restaurantId: activeOrder.restaurantId,
            lat: position.coords.latitude,
            lng: position.coords.longitude
          };
          socket.emit("rider:live_location", payload);
        }
      );
    }

    const locationInterval = setInterval(() => {
      if ("geolocation" in navigator) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            setMyLocation({ lat: position.coords.latitude, lng: position.coords.longitude });
            const payload = {
              orderId: activeOrder._id,
              userId: activeOrder.userId,
              restaurantId: activeOrder.restaurantId,
              lat: position.coords.latitude,
              lng: position.coords.longitude
            };

            console.log("📡 Emitting rider:live_location", payload);
            socket.emit("rider:live_location", payload);
          },
          (error) => console.error("GPS error:", error.message),
          { enableHighAccuracy: true }
        );
      }
    }, 10000); // 10 seconds

    return () => {
      console.log("🛑 [Live Tracking] Stopped.");
      clearInterval(locationInterval);
    };
  }, [socket, activeOrder]);

  const { setToken, setUser, setIsAuth } = useApp();
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("user");
    setToken(null);
    setUser(null);
    setIsAuth(false);
    toast.success("Logged out successfully");
    navigate("/login");
  };

  const handleToggle = async () => {
    // ... existing handleToggle logic ...
    setToggling(true);
    try {
      const payload: any = {};
      if ("geolocation" in navigator) {
        navigator.geolocation.getCurrentPosition(
          async (position) => {
            payload.longitude = position.coords.longitude;
            payload.latitude = position.coords.latitude;
            await executeToggle(payload);
          },
          async () => {
            await executeToggle(payload);
          }
        );
      } else {
        await executeToggle(payload);
      }
    } catch {
      setToggling(false);
    }
  };

  const executeToggle = async (payload: { longitude?: number; latitude?: number }) => {
    try {
      const data = await toggleRiderAvailability(payload);
      if (data.success) {
        toast.success(data.message);
        onProfileUpdate(); // refresh data
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to toggle status");
    } finally {
      setToggling(false);
    }
  };

  const handleAcceptOrder = async () => {
    if (!incomingOrder) return;
    setBtnLoading(true);
    try {
      const res = await acceptRiderOrder(incomingOrder.orderId || incomingOrder._id!);
      if (res.success) {
        toast.success("Order accepted! Head to the restaurant.");
        setActiveOrder(res.data);
        setIncomingOrder(null);
        onProfileUpdate(); // refresh isAvailable status (now false)
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to accept order");
      setIncomingOrder(null);
    } finally {
      setBtnLoading(false);
    }
  };

  const handleStatusUpdate = async (nextStatus: "picked_up" | "delivered") => {
    if (!activeOrder?._id) return;
    setBtnLoading(true);
    try {
      const res = await updateRiderOrderStatus(activeOrder._id, nextStatus);
      if (res.success) {
        toast.success(`Order marked as ${nextStatus.replace("_", " ")}`);
        if (nextStatus === "delivered") {
          setActiveOrder(null);
          onProfileUpdate(); // refresh availability (now true)
        } else {
          setActiveOrder(res.data);
        }
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to update status");
    } finally {
      setBtnLoading(false);
    }
  };

  const isOnline = riderData.isAvailable;

  return (
    <div className="w-full min-h-screen relative overflow-hidden py-24 pb-32">
      {/* Dynamic Background Glow */}
      <div className={`absolute top-0 left-1/2 -translate-x-1/2 w-full h-[600px] blur-[150px] pointer-events-none -z-10 transition-colors duration-1000 ${isOnline ? 'bg-emerald-500/10' : 'bg-red-500/5'}`}></div>

      <div className="max-w-6xl mx-auto px-6 grid grid-cols-1 md:grid-cols-12 gap-8 relative z-10">

        {/* Left column: Controls and Profile */}
        <div className="col-span-1 md:col-span-4 space-y-6">
          <div className="bg-[#141210]/60 backdrop-blur-md border border-amber-500/10 rounded-2xl p-8 relative overflow-hidden">
            <h3 className="text-amber-500/50 text-[10px] uppercase tracking-[0.2em] font-semibold mb-6">Current Status</h3>
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className={`text-3xl font-['Playfair_Display'] ${isOnline ? 'text-emerald-400 drop-shadow-[0_0_15px_rgba(52,211,153,0.3)]' : 'text-stone-400'}`}>
                  {isOnline ? 'Online' : 'Offline'}
                </h2>
                <p className="text-stone-500 text-xs mt-1">
                  {isOnline ? 'Accepting new deliveries' : 'Standby mode activated'}
                </p>
              </div>
              <button
                onClick={handleToggle}
                disabled={toggling || !riderData.isVerified || !!activeOrder}
                className={`relative w-20 h-10 rounded-full transition-all duration-500 outline-none flex items-center shadow-inner py-1 px-1
                  ${!riderData.isVerified || !!activeOrder ? 'bg-stone-900/40 cursor-not-allowed opacity-50' :
                    isOnline ? 'bg-emerald-900/40 border border-emerald-500/30' : 'bg-stone-900/80 border border-stone-800'
                  }
                `}
              >
                <div className={`w-8 h-8 rounded-full shadow-[0_0_10px_rgba(0,0,0,0.5)] transition-all duration-500 flex items-center justify-center
                    ${isOnline ? 'translate-x-10 bg-gradient-to-br from-emerald-400 to-emerald-600' : 'translate-x-0 bg-stone-600'}
                  `}>
                  {toggling && (
                    <div className="w-4 h-4 rounded-full border-2 border-white/20 border-t-white animate-spin"></div>
                  )}
                </div>
              </button>
            </div>
            {activeOrder && (
              <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-500/80 text-[10px] p-2 rounded text-center uppercase tracking-widest">
                Currently on an active delivery
              </div>
            )}
            {!riderData.isVerified && (
              <div className="bg-amber-500/10 border border-amber-500/20 text-amber-500/80 text-[10px] p-3 rounded tracking-wide mt-4">
                Pending Admin Verification
              </div>
            )}
          </div>

          <div className="bg-[#141210]/60 backdrop-blur-md border border-amber-500/10 rounded-2xl p-6 flex items-center justify-between gap-4">
            <div className="flex flex-1 items-center gap-4">
              {riderData.picture ? (
                <img src={riderData.picture} alt="Rider" className="w-14 h-14 rounded-full border border-amber-500/30 p-0.5 object-cover shrink-0" />
              ) : (
                <div className="w-14 h-14 rounded-full border border-amber-500/30 bg-amber-500/10 flex items-center justify-center text-amber-500 flex-shrink-0">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                </div>
              )}
              <div className="flex-1 w-full overflow-hidden">
                <h4 className="text-amber-50 font-bold tracking-wide text-lg truncate" title={riderData.name}>{riderData.name}</h4>
                <div className="flex items-center gap-2 mt-0.5">
                  <p className="text-amber-500/80 text-[10px] font-mono leading-none bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">ID:{riderData.userId.slice(-6).toUpperCase()}</p>
                  <p className="text-stone-400 text-xs leading-none">{riderData.phoneNumber}</p>
                </div>
              </div>
            </div>

            <button
              onClick={handleLogout}
              className="group relative p-3 bg-red-500/5 hover:bg-red-500 text-red-500/80 hover:text-white rounded-xl transition-all duration-500 border border-red-500/10 hover:border-red-500 shrink-0 hover:shadow-[0_0_20px_rgba(239,68,68,0.3)] flex items-center justify-center overflow-hidden"
              title="Sign Off / Logout"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-red-500 to-red-600 opacity-0 group-hover:opacity-100 transition-opacity duration-500 -z-10"></div>
              <svg className="w-5 h-5 transition-transform duration-500 group-hover:scale-110" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </div>
        </div>

        {/* Right column: Main Dashboard Area */}
        <div className="col-span-1 md:col-span-8 space-y-6">

          {/* Incoming Order Notification Overlay */}
          {incomingOrder && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/80 backdrop-blur-xl animate-in fade-in duration-500">
              <div className="bg-[#1a1816] border border-amber-500/20 w-full max-w-md rounded-3xl p-8 shadow-[0_0_100px_rgba(16,185,129,0.1)] overflow-hidden relative">
                <div className="absolute top-0 left-0 w-full h-1 bg-emerald-500 animate-[progress_30s_linear]"></div>

                <div className="flex justify-between items-start mb-8">
                  <div>
                    <span className="bg-emerald-500/20 text-emerald-400 text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full border border-emerald-500/20">New Delivery</span>
                    <h2 className="text-3xl font-['Playfair_Display'] text-white mt-4">{incomingOrder.restaurantName || "Nearby Restaurant"}</h2>
                    <p className="text-stone-400 text-sm flex items-center gap-2 mt-2">
                      <svg className="w-4 h-4 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /></svg>
                      {incomingOrder.deliveryAddress?.formattedAddress.split(',')[0]}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-emerald-500 font-bold text-2xl">₹{incomingOrder.totalAmount}</p>
                    <p className="text-stone-500 text-[10px] uppercase">Estimated</p>
                  </div>
                </div>

                <div className="space-y-4 mb-8">
                  <div className="bg-white/5 p-4 rounded-xl border border-white/5">
                    <p className="text-xs text-stone-500 uppercase tracking-widest mb-2">Order Items</p>
                    {incomingOrder.items.map((item: any, idx: number) => (
                      <p key={idx} className="text-stone-300 text-sm flex justify-between">
                        <span>{item.quantity}x {item.name}</span>
                      </p>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <button
                    onClick={() => setIncomingOrder(null)}
                    className="py-4 rounded-2xl bg-stone-900 text-stone-400 font-bold tracking-wider hover:bg-stone-800 transition-colors uppercase text-xs"
                  >
                    Decline
                  </button>
                  <button
                    onClick={handleAcceptOrder}
                    disabled={btnLoading}
                    className="py-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-emerald-700 text-white font-bold tracking-wider hover:from-emerald-400 hover:to-emerald-600 transition-all uppercase text-xs shadow-[0_0_30px_rgba(16,185,129,0.3)] disabled:opacity-50"
                  >
                    {btnLoading ? 'Confirming...' : 'Accept Order'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Active Delivery View / Scanning View */}
          <div className="bg-[#141210]/40 backdrop-blur-md border border-amber-500/10 rounded-2xl relative overflow-hidden min-h-[600px]">
            {loadingOrder ? (
              <div className="h-full w-full flex items-center justify-center text-stone-500 italic">Syncing system state...</div>
            ) : activeOrder ? (
              /* ACTIVE DELIVERY VIEW */
              <div className="p-10 h-full flex flex-col">
                <div className="flex justify-between items-start mb-12">
                  <div>
                    <h2 className="text-3xl font-['Playfair_Display'] text-amber-50 mb-2">Current Delivery</h2>
                    <p className="text-stone-500 font-mono text-sm">#{activeOrder._id?.toUpperCase()}</p>
                  </div>
                  <div className="bg-amber-500/10 border border-amber-500/30 text-amber-500 px-4 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest">
                    {activeOrder.status.replace('_', ' ')}
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 flex-grow">
                  <div className="space-y-8">
                    <div className="space-y-6">
                      <div className="flex gap-4">
                        <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500 flex-shrink-0">
                          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                        </div>
                        <div>
                          <p className="text-[10px] text-stone-500 uppercase tracking-widest mb-1">Pickup from</p>
                          <p className="text-lg text-amber-100">{activeOrder.restaurantName || "Restaurant"}</p>
                        </div>
                      </div>

                      <div className="flex gap-4">
                        <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500 flex-shrink-0">
                          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                        </div>
                        <div>
                          <p className="text-[10px] text-stone-500 uppercase tracking-widest mb-1">Deliver to</p>
                          <p className="text-lg text-amber-100">{activeOrder.deliveryAddress?.formattedAddress}</p>
                        </div>
                      </div>

                      <div className="flex gap-4">
                        <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 flex-shrink-0">
                          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                        </div>
                        <div>
                          <p className="text-[10px] text-stone-500 uppercase tracking-widest mb-1">Customer Mobile</p>
                          <p className="text-lg text-amber-100">+91 {activeOrder.deliveryAddress?.mobile}</p>
                        </div>
                      </div>
                    </div>

                    <div className="pt-10 border-t border-white/5">
                      <div className="mb-6">
                        <p className="text-[10px] text-stone-500 uppercase tracking-widest mb-3">Order Progress</p>
                        <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                          <div className={`h-full bg-emerald-500 transition-all duration-1000 ${activeOrder.status === 'rider_assigned' ? 'w-1/3' : activeOrder.status === 'picked_up' ? 'w-2/3' : 'w-full'}`}></div>
                        </div>
                      </div>

                      {activeOrder.status === 'rider_assigned' && (
                        <button
                          disabled={btnLoading}
                          onClick={() => handleStatusUpdate('picked_up')}
                          className="w-full py-4 bg-emerald-500/80 hover:bg-emerald-500 text-white font-bold rounded-2xl transition-all uppercase tracking-widest text-xs disabled:opacity-50"
                        >
                          {btnLoading ? 'Updating...' : 'I have picked up the order'}
                        </button>
                      )}
                      {activeOrder.status === 'picked_up' && (
                        <button
                          disabled={btnLoading}
                          onClick={() => handleStatusUpdate('delivered')}
                          className="w-full py-4 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-400 hover:to-indigo-500 text-white font-bold rounded-2xl transition-all uppercase tracking-widest text-xs shadow-[0_0_30px_rgba(59,130,246,0.3)] disabled:opacity-50"
                        >
                          {btnLoading ? 'Updating...' : 'Mark as Delivered'}
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="hidden lg:block bg-black/40 border border-white/5 rounded-3xl p-6 h-full">
                    {activeOrder.deliveryAddress ? (
                      <RiderMap
                        myLocation={myLocation}
                        customerLat={activeOrder.deliveryAddress.latitude}
                        customerLng={activeOrder.deliveryAddress.longitude}
                      />
                    ) : (
                      <div className="h-full flex flex-col items-center justify-center text-center">
                        <svg className="w-8 h-8 text-emerald-500 animate-bounce mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        </svg>
                        <p className="text-stone-400 text-sm">Navigation active.<br />Follow the route to the restaurant/customer.</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              /* SCANNING VIEW (Original Radar) */
              <div className="h-full w-full flex items-center justify-center">
                <div className={`absolute inset-0 z-0 transition-opacity duration-1000 ${isOnline ? 'opacity-100' : 'opacity-10 blur-md grayscale'}`}>
                  <div className="absolute inset-0 bg-[linear-gradient(rgba(212,175,100,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(212,175,100,0.03)_1px,transparent_1px)] bg-[size:40px_40px]"></div>
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full border border-amber-500/5 shadow-[0_0_100px_rgba(212,175,100,0.05)_inset]">
                    <div className="w-full h-1/2 bg-gradient-to-t from-emerald-500/20 to-transparent rounded-t-full origin-bottom animate-[spin_4s_linear_infinite]" style={{ clipPath: 'polygon(50% 100%, 0 0, 100% 0)' }}></div>
                  </div>
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 bg-emerald-500 rounded-full shadow-[0_0_15px_#10b981]">
                    <div className="absolute inset-0 border-2 border-emerald-500 rounded-full animate-ping opacity-75"></div>
                  </div>
                </div>

                <div className="relative z-10 text-center flex flex-col items-center">
                  {isOnline ? (
                    <>
                      <div className="w-16 h-16 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(16,185,129,0.2)]">
                        <svg className="w-8 h-8 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                      </div>
                      <h3 className="text-xl font-['Playfair_Display'] text-emerald-50 mb-2">Scanning for Deliveries</h3>
                      <p className="text-stone-400 text-sm max-w-sm">You are online and visible to the dispatcher. Wait here for new order assignments.</p>
                    </>
                  ) : (
                    <>
                      <div className="w-16 h-16 bg-stone-900 border border-stone-800 rounded-2xl flex items-center justify-center mb-6">
                        <svg className="w-8 h-8 text-stone-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>
                      </div>
                      <h3 className="text-xl font-['Playfair_Display'] text-stone-400 mb-2">You are Offline</h3>
                      <p className="text-stone-600 text-sm max-w-sm">Toggle your status to online to start receiving orders.</p>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>

        </div>

      </div>

      {/* Footer / Mobile floating indicator */}
      <div className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-[#141210]/60 backdrop-blur-xl border border-white/5 px-6 py-3 rounded-full flex gap-3 items-center z-50">
        <div className={`w-2 h-2 rounded-full animate-pulse ${isOnline ? 'bg-emerald-500' : 'bg-stone-600'}`}></div>
        <span className="text-[10px] uppercase tracking-widest font-bold text-stone-300">
          System Status: {isOnline ? 'Active & Signal Strength High' : 'Hibernation Mode'}
        </span>
      </div>

      <style>{`
        @keyframes progress {
          from { width: 100%; }
          to { width: 0%; }
        }
      `}</style>
    </div>
  );
};

export default RiderActiveDashboard;
