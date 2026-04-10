import React, { useState } from "react";
import toast from "react-hot-toast";
import { toggleRiderAvailability, RiderProfile } from "../../services/api";

interface Props {
  riderData: RiderProfile;
  onProfileUpdate: () => void;
}

const RiderActiveDashboard: React.FC<Props> = ({ riderData, onProfileUpdate }) => {
  const [toggling, setToggling] = useState(false);

  const handleToggle = async () => {
    setToggling(true);
    try {
      const payload: any = {};
      
      // Try to get updated location right when they toggle
      if ("geolocation" in navigator) {
        navigator.geolocation.getCurrentPosition(
          async (position) => {
            payload.longitude = position.coords.longitude;
            payload.latitude = position.coords.latitude;
            await executeToggle(payload);
          },
          async () => {
            await executeToggle(payload); // proceed without location update if denied
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

  const isOnline = riderData.isAvailable;

  return (
    <div className="w-full min-h-screen relative overflow-hidden py-24 pb-32">
      {/* Dynamic Background Glow based on status */}
      <div className={`absolute top-0 left-1/2 -translate-x-1/2 w-full h-[600px] blur-[150px] pointer-events-none -z-10 transition-colors duration-1000 ${isOnline ? 'bg-emerald-500/10' : 'bg-red-500/5'}`}></div>

      <div className="max-w-6xl mx-auto px-6 grid grid-cols-1 md:grid-cols-12 gap-8 relative z-10">
        
        {/* Left column: Controls and Profile */}
        <div className="col-span-1 md:col-span-4 space-y-6">
          {/* Status Card */}
          <div className="bg-[#141210]/60 backdrop-blur-md border border-amber-500/10 rounded-2xl p-8 relative overflow-hidden">
             <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
                <svg width="64" height="64" viewBox="0 0 24 24" fill="none">
                   <path d="M12 2L2 7L12 12L22 7L12 2Z" fill="currentColor" />
                   <path d="M2 17L12 22L22 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                   <path d="M2 12L12 17L22 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
             </div>

             <div className="relative z-10">
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

                 {/* Premium Toggle Switch */}
                 <button 
                  onClick={handleToggle}
                  disabled={toggling || !riderData.isVerified}
                  className={`relative w-20 h-10 rounded-full transition-all duration-500 outline-none flex items-center shadow-inner py-1 px-1
                    ${!riderData.isVerified ? 'bg-amber-900/40 cursor-not-allowed opacity-50' : 
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

               {!riderData.isVerified && (
                 <div className="bg-amber-500/10 border border-amber-500/20 text-amber-500/80 text-xs p-3 rounded tracking-wide mb-2 flex gap-2 items-start">
                   <svg className="w-4 h-4 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                   </svg>
                   <span>Your account is pending admin verification. You cannot go online until verified.</span>
                 </div>
               )}
             </div>
          </div>

          {/* Profile Quick Stats */}
          <div className="bg-[#141210]/60 backdrop-blur-md border border-amber-500/10 rounded-2xl p-8 flex items-center gap-6">
             {riderData.picture ? (
               <div className="w-16 h-16 rounded-full border border-amber-500/30 p-1 flex-shrink-0">
                 <img src={riderData.picture} alt="Rider" className="w-full h-full rounded-full object-cover" />
               </div>
             ) : (
               <div className="w-16 h-16 rounded-full border border-amber-500/30 bg-amber-500/10 flex items-center justify-center text-amber-500 flex-shrink-0">
                 <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                 </svg>
               </div>
             )}
             <div>
               <h4 className="text-amber-50 font-medium tracking-wide">ID: {riderData.userId.slice(-6).toUpperCase()}</h4>
               <p className="text-stone-400 text-sm mt-1">{riderData.phoneNumber}</p>
             </div>
          </div>
          
          {/* Mock Earnings Panel */}
          <div className="bg-[#141210]/60 backdrop-blur-md border border-amber-500/10 rounded-2xl p-8">
            <h3 className="text-amber-500/50 text-[10px] uppercase tracking-[0.2em] font-semibold mb-6">Today's Earnings</h3>
            <h2 className="text-4xl font-['DM_Sans'] text-amber-400 mb-2 font-medium">₹ 0</h2>
            <div className="flex gap-4 text-xs text-stone-500 tracking-wider">
               <span>0 Deliveries</span>
               <span>0 Hours</span>
            </div>
          </div>
        </div>

        {/* Right column: Map / Radar Placeholder */}
        <div className="col-span-1 md:col-span-8 bg-[#141210]/40 backdrop-blur-md border border-amber-500/10 rounded-2xl relative overflow-hidden min-h-[500px] flex items-center justify-center">
             
           {/* Animated Radar Pattern representing map scan */}
           <div className={`absolute inset-0 z-0 transition-opacity duration-1000 ${isOnline ? 'opacity-100' : 'opacity-10 blur-md grayscale'}`}>
             {/* Map Grid */}
             <div className="absolute inset-0 bg-[linear-gradient(rgba(212,175,100,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(212,175,100,0.03)_1px,transparent_1px)] bg-[size:40px_40px]"></div>
             
             {/* Radar Sweep */}
             <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full border border-amber-500/5 shadow-[0_0_100px_rgba(212,175,100,0.05)_inset]">
                <div className="w-full h-1/2 bg-gradient-to-t from-emerald-500/20 to-transparent rounded-t-full origin-bottom animate-[spin_4s_linear_infinite]" style={{ clipPath: 'polygon(50% 100%, 0 0, 100% 0)' }}></div>
             </div>

             {/* Center Point (Rider) */}
             <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 bg-emerald-500 rounded-full shadow-[0_0_15px_#10b981]">
                <div className="absolute inset-0 border-2 border-emerald-500 rounded-full animate-ping opacity-75"></div>
             </div>
             
             {/* Nearby Hotspots Mock */}
             <div className="absolute top-[30%] left-[60%] w-2 h-2 bg-amber-500 rounded-full shadow-[0_0_10px_#f59e0b] opacity-80 animate-pulse"></div>
             <div className="absolute top-[60%] left-[20%] w-2 h-2 bg-amber-500 rounded-full shadow-[0_0_10px_#f59e0b] opacity-60 animate-pulse delay-700"></div>
           </div>

           {/* Content overlay */}
           <div className="relative z-10 text-center flex flex-col items-center">
             {isOnline ? (
               <>
                 <div className="w-16 h-16 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(16,185,129,0.2)]">
                   <svg className="w-8 h-8 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                   </svg>
                 </div>
                 <h3 className="text-xl font-['Playfair_Display'] text-emerald-50 mb-2">Scanning for Deliveries</h3>
                 <p className="text-stone-400 text-sm max-w-sm">You are online and visible to the dispatcher. Wait here for new order assignments.</p>
               </>
             ) : (
               <>
                 <div className="w-16 h-16 bg-stone-900 border border-stone-800 rounded-2xl flex items-center justify-center mb-6">
                   <svg className="w-8 h-8 text-stone-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                   </svg>
                 </div>
                 <h3 className="text-xl font-['Playfair_Display'] text-stone-400 mb-2">You are Offline</h3>
                 <p className="text-stone-600 text-sm max-w-sm">Toggle your status to online to start receiving orders.</p>
               </>
             )}
           </div>

        </div>

      </div>
    </div>
  );
};

export default RiderActiveDashboard;
