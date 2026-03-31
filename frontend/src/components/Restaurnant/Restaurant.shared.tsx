import React from "react";
import apiClient from  "../../services/apiClient"
import { IMenuItem } from "../../types";


export const gold       = "#d4af64";
export const goldBorder = "rgba(212,175,100,0.25)";
export const goldFaint  = "rgba(212,175,100,0.18)";
export const textMuted  = "rgba(200,175,130,0.5)";
export const textBody   = "rgba(200,175,130,0.75)";
export const cardBg     = "linear-gradient(155deg, rgba(20,15,7,0.98) 0%, rgba(11,8,3,0.99) 100%)";

export const labelStyle: React.CSSProperties = {
  display: "block", fontSize: 10, letterSpacing: "0.2em",
  textTransform: "uppercase", color: "rgba(200,175,130,0.45)",
  marginBottom: 8, fontWeight: 500,
};

export const inputStyle: React.CSSProperties = {
  width: "100%", background: "transparent", border: "none",
  borderBottom: `1px solid ${goldBorder}`,
  padding: "10px 0", color: "#f0e6cc",
  fontFamily: "'DM Sans', sans-serif", fontSize: 14, fontWeight: 300,
  letterSpacing: "0.04em", caretColor: gold,
  outline: "none", transition: "border-color 0.3s",
};

export const GLOBAL_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;500;600&family=DM+Sans:ital,wght@0,300;0,400;0,500;1,300&display=swap');
  @keyframes spin    { to { transform: rotate(360deg); } }
  @keyframes shimmer { 0%{background-position:0% center;} 100%{background-position:200% center;} }
  @keyframes drift1  { 0%,100%{transform:translate(0,0);} 50%{transform:translate(28px,-20px);} }
  @keyframes drift2  { 0%,100%{transform:translate(0,0);} 50%{transform:translate(-22px,-26px);} }
  .rp-root *, .rp-root *::before, .rp-root *::after { box-sizing: border-box; margin: 0; padding: 0; }
  .rp-input:focus { border-bottom-color: rgba(212,175,100,0.7) !important; }
  .rp-input::placeholder { color: rgba(200,180,140,0.22); font-style: italic; }
  .rp-input:-webkit-autofill { -webkit-box-shadow: 0 0 0 1000px #0d0a05 inset !important; -webkit-text-fill-color: #f0e6cc !important; }
  .badge { display:inline-flex; align-items:center; padding:4px 10px; border-radius:2px; font-size:10px; letter-spacing:0.16em; text-transform:uppercase; font-weight:500; }
`;


export const Spinner = ({ size = 16 }: { size?: number }) => (
  <svg style={{ animation: "spin 0.8s linear infinite", flexShrink: 0 }} width={size} height={size} viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" opacity="0.2" />
    <path d="M12 2a10 10 0 0110 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
  </svg>
);

export const LocationIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
    <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" />
    <circle cx="12" cy="9" r="2.5" />
  </svg>
);

export const EditIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
    <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
    <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
  </svg>
);

export const TrashIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
    <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14H6L5 6" />
    <path d="M10 11v6M14 11v6" /><path d="M9 6V4h6v2" />
  </svg>
);

export const PlusIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);


export const menuApi = {
  /** GET  /api/v1/menu/restaurant/:restaurantId  — fetch all items for a restaurant */
  getAll: async (restaurantId: string): Promise<IMenuItem[]> => {
    const res = await apiClient.get(`/menu/restaurant/${restaurantId}`);
    return res.data.data;
  },
 
  /** POST  /api/v1/menu/create  — add a new menu item */
  add: async (restaurantId: string, data: FormData): Promise<IMenuItem> => {
    const res = await apiClient.post(`/menu/create`, data);
    return res.data.data;
  },
 
  /** DELETE  /api/v1/menu/:itemId  — remove a menu item */
  remove: async (itemId: string): Promise<void> => {
    await apiClient.delete(`/menu/${itemId}`);
  },
 
  /** PATCH  /api/v1/menu/:itemId/toggle  — toggle availability */
  toggleAvailability: async (itemId: string, isAvailable: boolean): Promise<void> => {
    await apiClient.patch(`/menu/${itemId}/toggle`);
},
};