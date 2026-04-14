import React, { useState } from "react";
import { IOrder } from "../types";
import { cardBg, gold, goldBorder, textMuted } from "./Restaurnant/Restaurant.shared";
import OrderDetailsModal from "./OrderDetailsModal";

const getStatusColor = (status: string) => {
  switch (status) {
    case "placed":
      return "bg-yellow-100 text-yellow-700";
    case "accepted":
      return "bg-orange-100 text-orange-700";
    case "preparing":
      return "bg-blue-100 text-blue-700";
    case "ready_for_rider":
      return "bg-indigo-100 text-indigo-700";
    case "rider_assigned":
      return "bg-teal-100 text-teal-700";
    case "picked_up":
      return "bg-purple-100 text-purple-700";
    case "delivered":
      return "bg-green-100 text-green-700";
    default:
      return "bg-gray-100 text-gray-700";
  }
};

const ACTIVE_STATUSES = [
  "placed",
  "accepted",
  "preparing",
  "ready_for_rider",
  "rider_assigned",
  "picked_up",
  "delivered"
];

interface OrderCardProps {
  order: IOrder;
  onUpdateOrder?: (orderId: string, currentStatus: string) => void;
  onRetrySearch?: (orderId: string) => void;
}

const OrderCard: React.FC<OrderCardProps> = ({ order, onUpdateOrder, onRetrySearch }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      <div
        onClick={() => setIsModalOpen(true)}
        className="transform transition-transform duration-200 hover:scale-[1.01] hover:shadow-lg hover:shadow-yellow-900/10 cursor-pointer outline-none"
        style={{ background: cardBg, border: `1px solid ${goldBorder}`, borderRadius: "6px", overflow: "hidden", padding: "16px", flex: 1 }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "12px" }}>
          <div>
            <h3 style={{ margin: 0, color: gold, fontSize: "18px", fontFamily: "'Playfair Display', serif" }}>
              Order #{order._id?.slice(-6).toUpperCase()}
            </h3>
            <p style={{ margin: "4px 0 0", color: textMuted, fontSize: "14px" }}>
              {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {order.paymentMethod === "cod" ? "Cash on Delivery" : "Paid Online"}
            </p>
          </div>
          <div className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${getStatusColor(order.status)}`}>
            {order.status.replace(/_/g, " ")}
          </div>
        </div>

        <hr style={{ border: 0, borderTop: `1px solid ${goldBorder}`, margin: "12px 0", opacity: 0.5 }} />

        <div style={{ marginBottom: "16px" }}>
          {order.items.map((item: any, idx: number) => (
            <div key={idx} style={{ display: "flex", justifyContent: "space-between", color: "#ddd", fontSize: "15px", marginBottom: "8px" }}>
              <span><span style={{ color: gold, fontWeight: "bold" }}>{item.quantity}x</span> {item.name}</span>
              <span>₹{item.price * item.quantity}</span>
            </div>
          ))}
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: "12px", borderTop: `1px dashed ${goldBorder}` }}>
          <span style={{ color: textMuted, fontSize: "14px" }}>
            Total Amount: <strong style={{ color: gold, fontSize: "16px" }}>₹{order.totalAmount}</strong>
          </span>
          <div style={{ display: "flex", gap: "10px" }}>
            {/* Purana Button (Accept/Preparing/Ready) */}
            {onUpdateOrder && ACTIVE_STATUSES.indexOf(order.status) < ACTIVE_STATUSES.indexOf("ready_for_rider") && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onUpdateOrder(order._id as string, order.status);
                }}
                style={{
                  background: "linear-gradient(90deg, rgba(212,175,100,0.2), rgba(184,134,11,0.2))",
                  border: `1px solid ${gold}`,
                  color: gold,
                  padding: "8px 16px",
                  borderRadius: "4px",
                  cursor: "pointer",
                  fontSize: "14px",
                  fontWeight: "bold",
                  transition: "transform 0.1s"
                }}
              >
                {order.status === "placed" ? "Accept Order" : order.status === "accepted" ? "Mark Preparing" : "Mark Ready"}
              </button>
            )}

            {/* 🚨 NAYA RETRY BUTTON (Sirf tab dikhega jab ready_for_rider ho) */}
            {onRetrySearch && order.status === "ready_for_rider" && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onRetrySearch(order._id as string);
                }}
                style={{
                  background: "rgba(239, 68, 68, 0.1)", // Light red background
                  border: "1px solid #ef4444", // Red border
                  color: "#f87171", // Light red text
                  padding: "8px 16px",
                  borderRadius: "4px",
                  cursor: "pointer",
                  fontSize: "14px",
                  fontWeight: "bold",
                  transition: "transform 0.1s",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px"
                }}
              >
                <svg className="w-4 h-4 animate-spin-slow" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Ping Riders Again
              </button>
            )}
          </div>
        </div>
      </div> {/* 🚨 MISSING DIV ADDED HERE */}

      {isModalOpen && (
        <OrderDetailsModal
          order={order}
          onClose={() => setIsModalOpen(false)}
          onUpdateOrder={onUpdateOrder}
        />
      )}
    </>
  );
};

export default OrderCard;