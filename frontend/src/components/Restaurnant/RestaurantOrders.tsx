import React, { useEffect, useState, useRef } from "react";
import { fetchRestaurantOrders, updateOrderStatus } from "../../services/api";
import { useSocket } from "../../Context/SocketContext";
import { IOrder } from "../../types";
import toast from "react-hot-toast";
import { gold, goldBorder, textMuted } from "./Restaurant.shared";
import OrderCard from "../OrderCard";

const ACTIVE_STATUSES = [
  "placed",
  "accepted",
  "preparing",
  "ready_for_rider",
  "rider_assigned",
  "picked_up",
  "delivered"
];

// Fallback audio URL since local MP3 isn't available in assets folder yet
const NOTIFICATION_AUDIO_URL = "https://cdn.pixabay.com/download/audio/2021/08/04/audio_0625c1539c.mp3";

const RestaurantOrders = ({ restaurantId }: { restaurantId: string }) => {
  const [orders, setOrders] = useState<IOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [audioUnlocked, setAudioUnlocked] = useState(false);
  const { socket } = useSocket();
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Initialize audio element
  useEffect(() => {
    audioRef.current = new Audio(NOTIFICATION_AUDIO_URL);
  }, []);

  const fetchOrders = async () => {
    try {
      const res = await fetchRestaurantOrders(restaurantId);
      if (res.success) {
        setOrders(res.data);
      }
    } catch (error) {
      toast.error("Failed to fetch active orders");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [restaurantId]);

  useEffect(() => {
    if (!socket) return;

    const onNewOrder = (payload: any) => {
      console.log("New Order received socket", payload);
      
      // Attempt to play sound
      if (audioRef.current && audioUnlocked) {
        audioRef.current.play().catch(err => console.error("Audio block:", err));
      }

      // Re-fetch to ensure sync, or optimally, mutate the state
      fetchOrders();
    };

    socket.on("ORDER_STATUS_UPDATED", onNewOrder);
    socket.on("NEW_ORDER_PLACED", onNewOrder);

    return () => {
      socket.off("ORDER_STATUS_UPDATED", onNewOrder);
      socket.off("NEW_ORDER_PLACED", onNewOrder);
    };
  }, [socket, audioUnlocked, restaurantId]);

  // Handle manual interaction to unlock audio policy
  const unlockAudio = () => {
    if (!audioUnlocked && audioRef.current) {
      audioRef.current.play().then(() => {
        audioRef.current?.pause();
        audioRef.current!.currentTime = 0;
        setAudioUnlocked(true);
        toast.success("Notifications unmuted");
      }).catch(err => console.warn(err));
    }
  };

  const onUpdateOrder = async (orderId: string, currentStatus: string) => {
    const currentIndex = ACTIVE_STATUSES.indexOf(currentStatus);
    if (currentIndex === -1 || currentIndex >= ACTIVE_STATUSES.length - 1) return;
    
    // In a real UI we might show a dropdown, but advance sequential for simplicity matching zomato partner flows
    const nextStatus = ACTIVE_STATUSES[currentIndex + 1];
    
    try {
      const res = await updateOrderStatus(orderId, nextStatus);
      if (res.success) {
        toast.success(`Order designated as ${nextStatus.replace(/_/g, " ")}`);
        // update local state
        setOrders(prev => prev.map(o => o._id === orderId ? { ...o, status: nextStatus } : o));
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to update order");
    }
  };

  if (loading) {
    return <div style={{ color: textMuted, padding: "20px", textAlign: "center" }}>Loading existing orders...</div>;
  }

  return (
    <div style={{ padding: "20px 0" }} onClick={unlockAudio}>
      {!audioUnlocked && (
        <div style={{ backgroundColor: "rgba(212,175,100,0.1)", padding: "12px", borderRadius: "4px", marginBottom: "20px", border: `1px solid ${goldBorder}`, color: gold, fontSize: "14px", textAlign: "center", cursor: "pointer" }}>
           Tap anywhere to enable notification sounds 🔔
        </div>
      )}

      {orders.length === 0 ? (
        <div style={{ color: textMuted, textAlign: "center", marginTop: "40px" }}>No active orders at the moment.</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {orders.map(order => (
            <OrderCard key={order._id} order={order} onUpdateOrder={onUpdateOrder} />
          ))}
        </div>
      )}
    </div>
  );
};

export default RestaurantOrders;
