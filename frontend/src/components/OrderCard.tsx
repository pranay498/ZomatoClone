import React from "react";
import { IOrder } from "../types";
import { cardBg, gold, goldBorder, textMuted } from "./Restaurnant/Restaurant.shared";

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
  onUpdateStatus?: (orderId: string, currentStatus: string) => void;
}

const OrderCard: React.FC<OrderCardProps> = ({ order, onUpdateStatus }) => {
  return (
    <div style={{ background: cardBg, border: `1px solid ${goldBorder}`, borderRadius: "6px", overflow: "hidden", padding: "16px", flex: 1 }}>
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
        
        {onUpdateStatus && ACTIVE_STATUSES.indexOf(order.status) < ACTIVE_STATUSES.indexOf("ready_for_rider") && (
          <button 
            onClick={() => onUpdateStatus(order._id as string, order.status)}
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
            onMouseDown={e => e.currentTarget.style.transform = "scale(0.96)"}
            onMouseUp={e => e.currentTarget.style.transform = "scale(1)"}
            onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"}
          >
            {order.status === "placed" ? "Accept Order" : order.status === "accepted" ? "Mark Preparing" : "Mark Ready"}
          </button>
        )}
      </div>
    </div>
  );
};

export default OrderCard;
