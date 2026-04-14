import React, { useEffect, useState } from "react";
import { fetchMyOrders } from "../services/api";
import { IOrder } from "../types";
import OrderCard from "../components/OrderCard";
import toast from "react-hot-toast";
import { useSocket } from "../Context/SocketContext";

// yeh componet customer order ke liye hai 

const Orders = () => {
  const [orders, setOrders] = useState<IOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const { socket } = useSocket();

  useEffect(() => {
    const getOrders = async () => {
      try {
        const res = await fetchMyOrders();
        if (res.success) {
          setOrders(res.data);
        }
      } catch (error) {
        toast.error("Failed to fetch past orders");
      } finally {
        setLoading(false);
      }
    };

    getOrders();
  }, []);

  // 📡 Listen for Real-Time Status Updates
  useEffect(() => {
    if (!socket) return;

    const handleStatusUpdate = (data: { orderId: string; status: string; updatedAt: string }) => {
      setOrders(prev =>
        prev.map(o =>
          o._id === data.orderId ? { ...o, status: data.status, updatedAt: data.updatedAt } : o
        )
      );
      toast.success(`Your order status was updated to: ${data.status.replace(/_/g, " ")}`);
    };

    socket.on("ORDER_STATUS_UPDATED", handleStatusUpdate);

    return () => {
      socket.off("ORDER_STATUS_UPDATED", handleStatusUpdate);
    };
  }, [socket]);

  if (loading) {
    return (
      <div className="flex-1 min-h-screen bg-[#090705] flex items-center justify-center">
        <div style={{ color: "#9ca3af", fontFamily: "'Playfair Display', serif", fontSize: "1.2rem" }}>
          Fetching your orders...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-10 pb-20" style={{ background: "#090705" }}>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1
          className="text-3xl font-bold mb-8"
          style={{ fontFamily: "'Playfair Display', serif", color: "#d4af37" }}
        >
          My Orders
        </h1>

        {orders.length === 0 ? (
          <div
            className="text-center p-12 rounded-xl"
            style={{
              background: "rgba(255,255,255,0.02)",
              border: "1px dashed rgba(212,175,55,0.3)"
            }}
          >
            <span className="text-4xl mb-4 block">🛒</span>
            <h2 className="text-xl font-medium" style={{ color: "#d1d5db" }}>No orders placed yet.</h2>
            <p className="mt-2 text-sm" style={{ color: "#6b7280" }}>Looks like you haven't made your first order.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            {orders.map((order) => (
              <div key={order._id} style={{ position: "relative" }}>
                <OrderCard order={order} />

                {/* For aesthetics, display Restaurant context above or inside the card */}
                <div style={{
                  position: "absolute", top: "18px", right: "120px",
                  pointerEvents: "none"
                }}>
                  <span style={{
                    background: "rgba(255,255,255,0.05)",
                    color: "#9ca3af",
                    padding: "2px 8px",
                    borderRadius: "10px",
                    fontSize: "12px",
                    border: "1px solid rgba(255,255,255,0.1)"
                  }}>
                    Restaurant ID: {(order as any).restaurantId?.slice(-2) || 'Unk'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Orders;
