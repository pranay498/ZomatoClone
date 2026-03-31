import React, { useState, useEffect } from "react";
import apiClient from "../../services/apiClient";
import { ICartItem } from "../../types";
import { IMenuItem } from "../../types";


const MenuItemCard: React.FC<{
  item: IMenuItem;
  onAdd: (item: Omit<ICartItem, "quantity">) => void;
  cartQty: number;
  onRemove: (id: string) => void;
  restaurantIsOpen?: boolean;
}> = ({ item, onAdd, cartQty, onRemove, restaurantIsOpen = true }) => {
  const gold       = "#d4af64";
  const goldBorder = "rgba(212,175,100,0.22)";
  const textMuted  = "rgba(200,175,130,0.5)";

  return (
    <div style={{
      display: "flex", gap: 16, padding: "18px 0",
      borderBottom: `1px solid rgba(212,175,100,0.07)`,
      opacity: item.isAvailable ? 1 : 0.45,
    }}>
      {/* Info — left */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {/* Veg / Non-veg dot — placeholder, wire to your data if available */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
          <div style={{ width: 12, height: 12, border: "1.5px solid #4ade80", borderRadius: 2, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#4ade80" }} />
          </div>
          <p style={{ color: "#f0e6cc", fontSize: 14, fontWeight: 500, fontFamily: "'DM Sans', sans-serif" }}>
            {item.name}
          </p>
          {!item.isAvailable && (
            <span style={{ fontSize: 9, letterSpacing: "0.12em", padding: "2px 6px", borderRadius: 2, background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.25)", color: "#f87171", textTransform: "uppercase" }}>
              Unavailable
            </span>
          )}
        </div>

        <p style={{ color: gold, fontSize: 14, fontWeight: 600, marginBottom: 6 }}>₹{item.price}</p>

        <p style={{ color: textMuted, fontSize: 12, lineHeight: 1.6, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
          {item.description}
        </p>
      </div>

      {/* Image + Add button — right */}
      <div style={{ flexShrink: 0, display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
        <div style={{ width: 110, height: 90, borderRadius: 3, overflow: "hidden", position: "relative" }}>
          {item.imageUrl ? (
            <img src={item.imageUrl} alt={item.name} style={{ width: "100%", height: "100%", objectFit: "cover", opacity: 0.85 }} />
          ) : (
            <div style={{ width: "100%", height: "100%", background: "radial-gradient(circle, rgba(212,175,100,0.1), rgba(0,0,0,0.3))", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, opacity: 0.3 }}>
              🍽️
            </div>
          )}
        </div>

        {/* Add / Qty control */}
        {!restaurantIsOpen ? (
            <button
              disabled
              style={{ width: 80, padding: "7px 0", background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 2, color: "#f87171", fontFamily: "'DM Sans', sans-serif", fontSize: 11, fontWeight: 600, letterSpacing: "0.14em", textTransform: "uppercase", cursor: "not-allowed", opacity: 0.8 }}
            >
              Closed
            </button>
        ) : item.isAvailable && (
          cartQty === 0 ? (
            <button
              onClick={() => onAdd({ _id: item._id, name: item.name, price: item.price, imageUrl: item.imageUrl, restaurantId: item.restaurantId })}
              style={{ width: 80, padding: "7px 0", background: "rgba(212,175,100,0.09)", border: `1px solid ${goldBorder}`, borderRadius: 2, color: gold, fontFamily: "'DM Sans', sans-serif", fontSize: 11, fontWeight: 600, letterSpacing: "0.14em", textTransform: "uppercase", cursor: "pointer", transition: "all 0.2s" }}
              onMouseEnter={e => (e.currentTarget.style.background = "rgba(212,175,100,0.18)")}
              onMouseLeave={e => (e.currentTarget.style.background = "rgba(212,175,100,0.09)")}
            >
              + Add
            </button>
          ) : (
            <div style={{ display: "flex", alignItems: "center", gap: 0, border: `1px solid ${goldBorder}`, borderRadius: 2, overflow: "hidden", width: 80 }}>
              <button onClick={() => onRemove(item._id)} style={{ flex: 1, padding: "7px 0", background: "rgba(212,175,100,0.09)", border: "none", color: gold, fontWeight: 700, fontSize: 14, cursor: "pointer", transition: "background 0.15s" }}
                onMouseEnter={e => (e.currentTarget.style.background = "rgba(212,175,100,0.18)")}
                onMouseLeave={e => (e.currentTarget.style.background = "rgba(212,175,100,0.09)")}
              >−</button>
              <span style={{ flex: 1, textAlign: "center", color: "#f0e6cc", fontSize: 13, fontWeight: 700, background: "rgba(212,175,100,0.04)" }}>{cartQty}</span>
              <button onClick={() => onAdd({ _id: item._id, name: item.name, price: item.price, imageUrl: item.imageUrl, restaurantId: item.restaurantId })} style={{ flex: 1, padding: "7px 0", background: "rgba(212,175,100,0.09)", border: "none", color: gold, fontWeight: 700, fontSize: 14, cursor: "pointer", transition: "background 0.15s" }}
                onMouseEnter={e => (e.currentTarget.style.background = "rgba(212,175,100,0.18)")}
                onMouseLeave={e => (e.currentTarget.style.background = "rgba(212,175,100,0.09)")}
              >+</button>
            </div>
          )
        )}
      </div>
    </div>
  );
};

const MenuSkeleton = () => (
  <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
    {Array.from({ length: 5 }).map((_, i) => (
      <div key={i} style={{ display: "flex", gap: 16, padding: "18px 0", borderBottom: "1px solid rgba(212,175,100,0.06)", animation: "pulse 1.6s ease-in-out infinite", animationDelay: `${i * 120}ms` }}>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ height: 13, width: "45%", background: "rgba(212,175,100,0.08)", borderRadius: 2 }} />
          <div style={{ height: 12, width: "20%", background: "rgba(212,175,100,0.06)", borderRadius: 2 }} />
          <div style={{ height: 11, width: "75%", background: "rgba(212,175,100,0.05)", borderRadius: 2 }} />
        </div>
        <div style={{ width: 110, height: 90, borderRadius: 3, background: "rgba(212,175,100,0.06)", flexShrink: 0 }} />
      </div>
    ))}
  </div>
);


interface MenuSectionProps {
  restaurantId: string;
  cartItems: ICartItem[];
  onAdd: (item: Omit<ICartItem, "quantity">) => void;
  onRemove: (id: string) => void;
  restaurantIsOpen?: boolean;
}

const MenuSection: React.FC<MenuSectionProps> = ({ restaurantId, cartItems, onAdd, onRemove, restaurantIsOpen = true }) => {
  const [menuItems, setMenuItems]     = useState<IMenuItem[]>([]);
  const [loading, setLoading]         = useState(true);
  const [activeCategory, setActiveCategory] = useState<string>("All");
  const gold       = "#d4af64";
  const goldBorder = "rgba(212,175,100,0.22)";
  const textMuted  = "rgba(200,175,130,0.5)";

  useEffect(() => {
    const fetch = async () => {
      try {
        // 🔌 GET /api/v1/menu/restaurant/:restaurantId
        const res = await apiClient.get(`/menu/restaurant/${restaurantId}`);
        if (res.data.success) setMenuItems(res.data.data);
      } catch {
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [restaurantId]);

  // Build category list
  const categories = ["All", ...Array.from(new Set(menuItems.map(i => i.category)))];

  // Filter by active category
  const filtered = activeCategory === "All"
    ? menuItems
    : menuItems.filter(i => i.category === activeCategory);

  // Group by category for display
  const grouped = filtered.reduce<Record<string, IMenuItem[]>>((acc, item) => {
    const cat = item.category;
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(item);
    return acc;
  }, {});

  const getCartQty = (id: string) => cartItems.find(i => i._id === id)?.quantity ?? 0;

  return (
    <div>
      {/* Category filter pills */}
      {!loading && categories.length > 1 && (
        <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 4, marginBottom: 24, scrollbarWidth: "none" }}>
          {categories.map(cat => (
            <button key={cat} onClick={() => setActiveCategory(cat)}
              style={{
                padding: "7px 16px", borderRadius: 2, border: `1px solid ${activeCategory === cat ? "rgba(212,175,100,0.6)" : goldBorder}`,
                background: activeCategory === cat ? "rgba(212,175,100,0.14)" : "transparent",
                color: activeCategory === cat ? gold : textMuted,
                fontFamily: "'DM Sans', sans-serif", fontSize: 11, fontWeight: activeCategory === cat ? 600 : 400,
                letterSpacing: "0.12em", textTransform: "uppercase", cursor: "pointer",
                transition: "all 0.2s", whiteSpace: "nowrap", flexShrink: 0,
              }}
            >
              {cat}
              {cat === "All" && <span style={{ marginLeft: 6, fontSize: 9, opacity: 0.6 }}>({menuItems.length})</span>}
            </button>
          ))}
        </div>
      )}

      {/* Loading */}
      {loading && <MenuSkeleton />}

      {/* Empty */}
      {!loading && menuItems.length === 0 && (
        <div style={{ padding: "48px 0", textAlign: "center" }}>
          <div style={{ fontSize: 36, opacity: 0.2, marginBottom: 12 }}>🍽️</div>
          <p style={{ color: textMuted, fontSize: 13, letterSpacing: "0.12em", textTransform: "uppercase" }}>No menu items yet</p>
        </div>
      )}

      {/* Grouped menu */}
      {!loading && Object.entries(grouped).map(([category, items]) => (
        <div key={category} style={{ marginBottom: 32 }}>
          {/* Category heading */}
          {activeCategory === "All" && (
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 4 }}>
              <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: 16, color: gold, fontWeight: 500 }}>{category}</h3>
              <div style={{ flex: 1, height: 1, background: "rgba(212,175,100,0.1)" }} />
              <span style={{ fontSize: 10, color: textMuted, letterSpacing: "0.12em" }}>{items.length} items</span>
            </div>
          )}

          {items.map(item => (
            <MenuItemCard
              key={item._id}
              item={item}
              cartQty={getCartQty(item._id)}
              onAdd={onAdd}
              onRemove={onRemove}
              restaurantIsOpen={restaurantIsOpen}
            />
          ))}
        </div>
      ))}
    </div>
  );
};

export default MenuSection;
