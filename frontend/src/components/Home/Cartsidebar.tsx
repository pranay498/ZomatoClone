import React, { useRef, useCallback, useEffect } from "react";
import { ICartItem } from "../../types";
import apiClient from "../../services/apiClient";

// ─────────────────────────────────────────────
//  useCart — Client-side cart with backend sync
//
//  Flow:
//  1. Frontend manages state locally (fast UI updates)
//  2. After every change, a 2-second debounced sync
//     writes the cart to MongoDB via POST /api/v1/cart/sync
//  3. On checkout click the caller force-syncs first
// ─────────────────────────────────────────────

export const useCart = () => {
  const [items, setItems] = React.useState<ICartItem[]>([]);
  const syncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => { isMountedRef.current = false; };
  }, []);

  // ── Map frontend items → backend format for sync ──
  const toSyncPayload = useCallback((cartItems: ICartItem[]) => {
    return cartItems.map(item => ({
      menuItemId: item._id,    // frontend uses _id, backend expects menuItemId
      name: item.name,
      price: item.price,
      quantity: item.quantity,
      imageUrl: item.imageUrl || undefined,
    }));
  }, []);

  // ── Sync cart to backend (debounced) ──
  const syncToBackend = useCallback(async (cartItems: ICartItem[]) => {
    try {
      if (cartItems.length === 0) {
        await apiClient.delete("/cart/clear");
        console.log("🔵 Cart cleared on backend");
      } else {
        await apiClient.post("/cart/sync", {
          items: toSyncPayload(cartItems),
        });
        console.log("🔵 Cart synced to backend");
      }
    } catch (err) {
      console.warn("⚠️ Cart sync failed (will retry):", err);
    }
  }, [toSyncPayload]);

  // ── Schedule a debounced sync ──
  const scheduleSyncDebounced = useCallback((cartItems: ICartItem[]) => {
    if (syncTimerRef.current) clearTimeout(syncTimerRef.current);
    syncTimerRef.current = setTimeout(() => {
      syncToBackend(cartItems);
    }, 2000);
  }, [syncToBackend]);

  // ── Force sync (call before checkout / page unload) ──
  const forceSync = useCallback(async (cartItems?: ICartItem[]) => {
    if (syncTimerRef.current) clearTimeout(syncTimerRef.current);
    await syncToBackend(cartItems ?? items);
  }, [syncToBackend, items]);

  // ── Load cart from backend on mount ──
  useEffect(() => {
    const loadCart = async () => {
      try {
        const res = await apiClient.get("/cart");
        if (res.data.success && res.data.data?.items?.length > 0) {
          const backendItems: ICartItem[] = res.data.data.items.map((item: any) => ({
            _id: item.menuItemId?.toString?.() || item.menuItemId,
            name: item.name,
            price: item.price,
            quantity: item.quantity,
            imageUrl: item.imageUrl,
            restaurantId: res.data.data.restaurantId,
          }));
          setItems(backendItems);
          console.log("🟢 Cart loaded from backend:", backendItems.length, "items");
        }
      } catch (err) {
        console.log("ℹ️ No saved cart found or not logged in");
      }
    };
    loadCart();
  }, []);

  // ── Cleanup pending sync timer on unmount ──
  useEffect(() => {
    return () => {
      if (syncTimerRef.current) clearTimeout(syncTimerRef.current);
    };
  }, []);

  // ── Add item ──
  const addItem = (item: Omit<ICartItem, "quantity">) => {
    setItems(prev => {
      const existing = prev.find(i => i._id === item._id);
      let next: ICartItem[];
      if (existing) {
        next = prev.map(i => i._id === item._id ? { ...i, quantity: i.quantity + 1 } : i);
      } else {
        next = [...prev, { ...item, quantity: 1 }];
      }
      scheduleSyncDebounced(next);
      return next;
    });
  };

  // ── Remove item (decrement or remove) ──
  const removeItem = (id: string) => {
    setItems(prev => {
      const existing = prev.find(i => i._id === id);
      if (!existing) return prev;
      let next: ICartItem[];
      if (existing.quantity === 1) {
        next = prev.filter(i => i._id !== id);
      } else {
        next = prev.map(i => i._id === id ? { ...i, quantity: i.quantity - 1 } : i);
      }
      scheduleSyncDebounced(next);
      return next;
    });
  };

  // ── Clear cart ──
  const clearCart = () => {
    setItems([]);
    if (syncTimerRef.current) clearTimeout(syncTimerRef.current);
    apiClient.delete("/cart/clear").catch(() => {});
  };

  const total = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const itemCount = items.reduce((sum, i) => sum + i.quantity, 0);

  return { items, addItem, removeItem, clearCart, total, itemCount, forceSync };
};

// ─────────────────────────────────────────────
//  CartSidebar UI Component
// ─────────────────────────────────────────────

interface CartSidebarProps {
  items: ICartItem[];
  total: number;
  onAdd: (item: Omit<ICartItem, "quantity">) => void;
  onRemove: (id: string) => void;
  onClear: () => void;
  onCheckout: () => void;
  open: boolean;
  onClose: () => void;
}

const CartSidebar: React.FC<CartSidebarProps> = ({ items, total, onAdd, onRemove, onClear, onCheckout, open, onClose,}) => {
  const gold      = "#d4af64";
  const goldBorder = "rgba(212,175,100,0.25)";
  const textMuted  = "rgba(200,175,130,0.5)";

  return (
    <>
      {/* Backdrop */}
      {open && (
        <div
          onClick={onClose}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 40, backdropFilter: "blur(2px)" }}
        />
      )}

      {/* Sidebar panel */}
      <div style={{
        position: "fixed", top: 0, right: 0, bottom: 0, width: 360,
        zIndex: 50,
        background: "linear-gradient(180deg, #1a1208 0%, #0d0a05 100%)",
        borderLeft: `1px solid ${goldBorder}`,
        boxShadow: "-20px 0 60px rgba(0,0,0,0.7)",
        transform: open ? "translateX(0)" : "translateX(100%)",
        transition: "transform 0.35s cubic-bezier(.16,1,.3,1)",
        display: "flex", flexDirection: "column",
        fontFamily: "'DM Sans', sans-serif",
      }}>

        {/* Header */}
        <div style={{ padding: "24px 24px 20px", borderBottom: `1px solid ${goldBorder}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <p style={{ fontSize: 10, letterSpacing: "0.2em", textTransform: "uppercase", color: textMuted, marginBottom: 4 }}>Your Order</p>
            <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 20, color: gold, fontWeight: 500 }}>
              Cart {items.length > 0 && <span style={{ fontSize: 13, color: textMuted }}>({items.reduce((s, i) => s + i.quantity, 0)} items)</span>}
            </h2>
          </div>
          <button onClick={onClose} style={{ background: "transparent", border: `1px solid ${goldBorder}`, borderRadius: 2, width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: textMuted, transition: "all 0.2s" }}
            onMouseEnter={e => (e.currentTarget.style.borderColor = "rgba(212,175,100,0.5)")}
            onMouseLeave={e => (e.currentTarget.style.borderColor = goldBorder)}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Empty state */}
        {items.length === 0 ? (
          <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12 }}>
            <div style={{ fontSize: 40, opacity: 0.2 }}>🛒</div>
            <p style={{ color: textMuted, fontSize: 13, letterSpacing: "0.1em" }}>Your cart is empty</p>
            <p style={{ color: "rgba(200,175,130,0.3)", fontSize: 12 }}>Add items from the menu</p>
          </div>
        ) : (
          <>
            {/* Items list */}
            <div style={{ flex: 1, overflowY: "auto", padding: "16px 24px", display: "flex", flexDirection: "column", gap: 12 }}>
              {items.map(item => (
                <div key={item._id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", background: "rgba(212,175,100,0.04)", border: `1px solid ${goldBorder}`, borderRadius: 3 }}>
                  {/* Thumbnail */}
                  {item.imageUrl
                    ? <img src={item.imageUrl} alt={item.name} style={{ width: 44, height: 44, borderRadius: 2, objectFit: "cover", flexShrink: 0, opacity: 0.85 }} />
                    : <div style={{ width: 44, height: 44, borderRadius: 2, flexShrink: 0, background: "rgba(212,175,100,0.1)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, opacity: 0.4 }}>🍽️</div>
                  }

                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ color: "#f0e6cc", fontSize: 13, fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{item.name}</p>
                    <p style={{ color: gold, fontSize: 12, fontWeight: 600, marginTop: 2 }}>₹{item.price}</p>
                  </div>

                  {/* Qty controls */}
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                    <button onClick={() => onRemove(item._id)} style={{ width: 26, height: 26, borderRadius: 2, background: "rgba(212,175,100,0.08)", border: `1px solid ${goldBorder}`, color: gold, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, transition: "all 0.15s" }}
                      onMouseEnter={e => (e.currentTarget.style.background = "rgba(212,175,100,0.16)")}
                      onMouseLeave={e => (e.currentTarget.style.background = "rgba(212,175,100,0.08)")}
                    >−</button>
                    <span style={{ color: "#f0e6cc", fontSize: 13, fontWeight: 600, minWidth: 16, textAlign: "center" }}>{item.quantity}</span>
                    <button onClick={() => onAdd({ _id: item._id, name: item.name, price: item.price, imageUrl: item.imageUrl, restaurantId: item.restaurantId })} style={{ width: 26, height: 26, borderRadius: 2, background: "rgba(212,175,100,0.08)", border: `1px solid ${goldBorder}`, color: gold, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, transition: "all 0.15s" }}
                      onMouseEnter={e => (e.currentTarget.style.background = "rgba(212,175,100,0.16)")}
                      onMouseLeave={e => (e.currentTarget.style.background = "rgba(212,175,100,0.08)")}
                    >+</button>
                  </div>
                </div>
              ))}
            </div>

            {/* Footer */}
            <div style={{ padding: "20px 24px", borderTop: `1px solid ${goldBorder}` }}>
              {/* Subtotal */}     
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <span style={{ fontSize: 11, letterSpacing: "0.16em", textTransform: "uppercase", color: textMuted }}>Total</span>
                <span style={{ fontFamily: "'Playfair Display', serif", fontSize: 22, color: gold, fontWeight: 500 }}>₹{total}</span>
              </div>

              {/* Checkout button */}
              <button onClick={onCheckout} style={{ width: "100%", padding: "14px", background: "linear-gradient(135deg, #b8860b 0%, #daa520 40%, #e8c84a 60%, #b8860b 100%)", border: "none", borderRadius: 2, color: "#120d00", fontFamily: "'DM Sans', sans-serif", fontSize: 11, fontWeight: 700, letterSpacing: "0.22em", textTransform: "uppercase", cursor: "pointer", transition: "opacity 0.2s" }}
                onMouseEnter={e => (e.currentTarget.style.opacity = "0.88")}
                onMouseLeave={e => (e.currentTarget.style.opacity = "1")}
              >
                Proceed to Checkout
              </button>

              {/* Clear cart */}
              <button onClick={onClear} style={{ width: "100%", marginTop: 10, padding: "10px", background: "transparent", border: "none", color: "rgba(248,113,113,0.5)", fontFamily: "'DM Sans', sans-serif", fontSize: 11, letterSpacing: "0.14em", textTransform: "uppercase", cursor: "pointer", transition: "color 0.2s" }}
                onMouseEnter={e => (e.currentTarget.style.color = "#f87171")}
                onMouseLeave={e => (e.currentTarget.style.color = "rgba(248,113,113,0.5)")}
              >
                Clear Cart
              </button>
            </div>
          </>
        )}
      </div>
    </>
  );
};

export default CartSidebar;