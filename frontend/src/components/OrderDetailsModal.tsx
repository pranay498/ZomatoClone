import React from "react";
import { IOrder } from "../types";
import { cardBg, gold, goldBorder, textMuted } from "./Restaurnant/Restaurant.shared";

const getStatusColor = (status: string) => {
  switch (status) {
    case "placed": return "bg-yellow-100 text-yellow-700";
    case "accepted": return "bg-orange-100 text-orange-700";
    case "preparing": return "bg-blue-100 text-blue-700";
    case "ready_for_rider": return "bg-indigo-100 text-indigo-700";
    case "rider_assigned": return "bg-teal-100 text-teal-700";
    case "picked_up": return "bg-purple-100 text-purple-700";
    case "delivered": return "bg-green-100 text-green-700";
    default: return "bg-gray-100 text-gray-700";
  }
};

interface OrderDetailsModalProps {
  order: IOrder;
  onClose: () => void;
}

const OrderDetailsModal: React.FC<OrderDetailsModalProps> = ({ order, onClose }) => {
  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4" 
      style={{ backgroundColor: "rgba(0, 0, 0, 0.75)", backdropFilter: "blur(4px)" }}
      onClick={onClose}
    >
      <div 
        className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-xl shadow-2xl"
        style={{ background: cardBg, border: `1px solid ${goldBorder}` }}
        onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside the modal
      >
        {/* Header */}
        <div className="sticky top-0 p-6 flex justify-between items-start" style={{ background: cardBg, borderBottom: `1px solid ${goldBorder}` }}>
          <div>
            <h2 style={{ margin: 0, color: gold, fontSize: "24px", fontFamily: "'Playfair Display', serif" }}>
              Order Details
            </h2>
            <p style={{ margin: "4px 0 0", color: textMuted, fontSize: "14px" }}>
              #{order._id?.toUpperCase()}
            </p>
          </div>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
            style={{ fontSize: "24px", lineHeight: "1" }}
          >
            &times;
          </button>
        </div>

        <div className="p-6">
          {/* Status & Timing */}
          <div className="mb-6 flex justify-between items-center bg-black/20 p-4 rounded-lg border border-white/5">
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Status</p>
              <div className={`px-3 py-1 rounded-full text-xs font-bold uppercase inline-block ${getStatusColor(order.status)}`}>
                {order.status.replace(/_/g, " ")}
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Placed At</p>
              <p className="text-sm text-gray-200">
                {new Date(order.createdAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
              </p>
            </div>
          </div>

          {/* Delivery Details */}
          {order.deliveryAddress && (
            <div className="mb-6">
              <h3 className="text-sm uppercase tracking-wider mb-3" style={{ color: gold }}>📍 Delivery Information</h3>
              <div className="bg-black/20 p-4 rounded-lg border border-white/5 space-y-2">
                <p className="text-sm text-gray-300">
                  <span className="text-gray-500 mr-2">Address:</span> 
                  {order.deliveryAddress.formattedAddress}
                </p>
                <p className="text-sm text-gray-300">
                  <span className="text-gray-500 mr-2">Contact:</span> 
                  +91 {order.deliveryAddress.mobile}
                </p>
              </div>
            </div>
          )}

          {/* Rider Details (If assigned) */}
          {order.riderName && (
            <div className="mb-6">
              <h3 className="text-sm uppercase tracking-wider mb-3" style={{ color: gold }}>🛵 Delivery Partner</h3>
              <div className="bg-black/20 p-4 rounded-lg border border-white/5 flex justify-between items-center">
                <div>
                  <p className="text-sm font-semibold text-gray-200">{order.riderName}</p>
                  <p className="text-sm text-gray-400">{order.riderPhone || "Number pending"}</p>
                </div>
                <div className="h-10 w-10 bg-gray-800 rounded-full flex items-center justify-center text-xl">
                  👤
                </div>
              </div>
            </div>
          )}

          {/* Order Items */}
          <div className="mb-6">
            <h3 className="text-sm uppercase tracking-wider mb-3" style={{ color: gold }}>🛍️ Order Summary</h3>
            <div className="bg-black/20 p-4 rounded-lg border border-white/5">
              {order.items.map((item: any, idx: number) => (
                <div key={idx} className="flex justify-between text-sm text-gray-200 py-2 border-b border-white/5 last:border-0">
                  <span>
                    <span style={{ color: gold, fontWeight: "bold" }} className="mr-2">{item.quantity}x</span> 
                    {item.name}
                  </span>
                  <span>₹{item.price * item.quantity}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Payment Info */}
          <div>
            <h3 className="text-sm uppercase tracking-wider mb-3" style={{ color: gold }}>💳 Payment Information</h3>
            <div className="bg-black/20 p-4 rounded-lg border border-white/5 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Method</span>
                <span className="text-gray-200 font-medium capitalize">{order.paymentMethod === "cod" ? "Cash on Delivery" : "Online Payment"}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Status</span>
                <span className={`font-medium ${order.paymentStatus === 'paid' ? 'text-green-500' : 'text-yellow-500'} capitalize`}>
                  {order.paymentStatus}
                </span>
              </div>
              {order.paymentId && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Txn ID</span>
                  <span className="text-gray-200 text-xs font-mono">{order.paymentId}</span>
                </div>
              )}
              <hr className="border-white/10 my-2" />
              <div className="flex justify-between items-center pt-2">
                <span className="text-gray-300 font-semibold">Grand Total</span>
                <span style={{ color: gold }} className="text-xl font-bold">₹{order.totalAmount}</span>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default OrderDetailsModal;
