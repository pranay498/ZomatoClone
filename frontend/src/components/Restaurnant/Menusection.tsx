import React, { useState, useEffect } from "react";
import toast from "react-hot-toast";
import { menuApi,
  gold, goldBorder, goldFaint, textMuted, cardBg,
  labelStyle, inputStyle,
  Spinner, TrashIcon, PlusIcon,
} from "./Restaurant.shared";
import { IMenuItem } from "../../types";

const CATEGORIES = ["Starters", "Main Course", "Desserts", "Beverages", "Snacks", "Breads", "Rice & Biryani", "Other"];
type TabId = "menu" | "add" | "sales";

// ─────────────────────────────────────────────
//  MENU ITEMS LIST
// ─────────────────────────────────────────────
const MenuItemsList: React.FC<{ restaurantId: string }> = ({ restaurantId }) => {
  const [items, setItems]   = useState<IMenuItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    menuApi.getAll(restaurantId)
      .then(setItems)
      .catch(() => toast.error("Failed to load menu items"))
      .finally(() => setLoading(false));
  }, [restaurantId]);

  const handleDelete = async (id: string) => {
    try {
      await menuApi.remove(id);
      const confirmed = window.confirm("Are you sure you want to delete this item?");
      if (!confirmed) return;
      else{
      setItems(p => p.filter(i => i._id !== id));
      }

      toast.success("Item removed");
    } catch { toast.error("Failed to delete"); }
  };

  const handleToggle = async (item: IMenuItem) => {
    try {
      await menuApi.toggleAvailability(item._id, !item.isAvailable);
      setItems(p => p.map(i => i._id === item._id ? { ...i, isAvailable: !i.isAvailable } : i));
    } catch { toast.error("Failed to update"); }
  };

  if (loading) return <div style={{ padding: "48px 0", display: "flex", justifyContent: "center" }}><Spinner size={28} /></div>;

  if (items.length === 0) return (
    <div style={{ padding: "56px 0", textAlign: "center" }}>
      <div style={{ fontSize: 36, marginBottom: 12, opacity: 0.3 }}>◈</div>
      <p style={{ color: textMuted, fontSize: 13, letterSpacing: "0.12em", textTransform: "uppercase" }}>No menu items yet</p>
      <p style={{ color: "rgba(200,175,130,0.3)", fontSize: 12, marginTop: 6 }}>Switch to "Add Item" tab to get started</p>
    </div>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {items.map(item => (
        <div key={item._id}
          style={{ display: "flex", alignItems: "center", gap: 16, padding: "16px 20px", background: "rgba(212,175,100,0.03)", border: `1px solid ${goldBorder}`, borderRadius: 3, transition: "border-color 0.2s" }}
          onMouseEnter={e => (e.currentTarget.style.borderColor = "rgba(212,175,100,0.45)")}
          onMouseLeave={e => (e.currentTarget.style.borderColor = goldBorder)}
        >
          {/* Thumbnail */}
          {item.imageUrl
            ? <img src={item.imageUrl} alt={item.name} style={{ width: 52, height: 52, borderRadius: 2, objectFit: "cover", flexShrink: 0, opacity: 0.85 }} />
            : <div style={{ width: 52, height: 52, borderRadius: 2, flexShrink: 0, background: goldFaint, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, opacity: 0.4 }}>🍽️</div>
          }

          {/* Info */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
              <p style={{ color: "#f0e6cc", fontSize: 14, fontWeight: 500, margin: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{item.name}</p>
              <span style={{ fontSize: 9, letterSpacing: "0.14em", padding: "2px 7px", border: `1px solid ${goldBorder}`, borderRadius: 2, color: textMuted, textTransform: "uppercase", flexShrink: 0 }}>{item.category}</span>
            </div>
            <p style={{ color: textMuted, fontSize: 12, margin: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{item.description}</p>
          </div>

          {/* Price */}
          <p style={{ color: gold, fontSize: 15, fontWeight: 600, flexShrink: 0, margin: "0 12px" }}>₹{item.price}</p>

          {/* Availability */}
          <button onClick={() => handleToggle(item)}
            style={{ padding: "5px 12px", borderRadius: 2, fontSize: 10, letterSpacing: "0.14em", textTransform: "uppercase", fontWeight: 500, cursor: "pointer", transition: "all 0.2s", flexShrink: 0, background: item.isAvailable ? "rgba(74,222,128,0.1)" : "rgba(239,68,68,0.08)", border: `1px solid ${item.isAvailable ? "rgba(74,222,128,0.3)" : "rgba(239,68,68,0.25)"}`, color: item.isAvailable ? "#4ade80" : "#f87171" }}>
            {item.isAvailable ? "Available" : "Unavailable"}
          </button>

          {/* Delete */}
          <button onClick={() => handleDelete(item._id)}
            style={{ padding: "7px", borderRadius: 2, cursor: "pointer", background: "transparent", border: "1px solid rgba(239,68,68,0.2)", color: "#f87171", transition: "all 0.2s", display: "flex", flexShrink: 0 }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "rgba(239,68,68,0.1)"; (e.currentTarget as HTMLElement).style.borderColor = "rgba(239,68,68,0.45)"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "transparent"; (e.currentTarget as HTMLElement).style.borderColor = "rgba(239,68,68,0.2)"; }}
          ><TrashIcon /></button>
        </div>
      ))}
    </div>
  );
};

// ─────────────────────────────────────────────
//  ADD ITEM FORM
// ─────────────────────────────────────────────
const AddItemForm: React.FC<{ restaurantId: string; onAdded: () => void }> = ({ restaurantId, onAdded }) => {
  const [saving, setSaving]       = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [form, setForm] = useState({ name: "", description: "", price: "", category: "Main Course" });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm(p => ({ ...p, [e.target.name]: e.target.value }));

  const handleSubmit = async () => {
    if (!form.name || !form.price) { toast.error("Name and price are required"); return; }
    try {
      setSaving(true);
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => fd.append(k, v));
      fd.append("restaurantId", restaurantId);
      if (imageFile) fd.append("file", imageFile);
      await menuApi.add(restaurantId, fd);
      toast.success("Item added!");
      setForm({ name: "", description: "", price: "", category: "Main Course" });
      setImageFile(null);
      onAdded();
    } catch (err: any) {
      toast.error(err?.message || "Connect your API first");
    } finally { setSaving(false); }
  };

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 28 }}>
      {/* Left */}
      <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
        <div><label style={labelStyle}>Item Name *</label>
          <input className="rp-input" name="name" value={form.name} onChange={handleChange} placeholder="e.g. Butter Chicken" style={inputStyle} /></div>
        <div><label style={labelStyle}>Price (₹) *</label>
          <input className="rp-input" name="price" type="number" value={form.price} onChange={handleChange} placeholder="e.g. 299" style={inputStyle} /></div>
        <div><label style={labelStyle}>Category *</label>
          <select name="category" value={form.category} onChange={handleChange} style={{ ...inputStyle, cursor: "pointer" }}>
            {CATEGORIES.map(c => <option key={c} value={c} style={{ background: "#1a1208", color: "#f0e6cc" }}>{c}</option>)}
          </select></div>
        <div><label style={labelStyle}>Description</label>
          <textarea className="rp-input" name="description" value={form.description} onChange={handleChange} placeholder="Short description…" rows={3} style={{ ...inputStyle, resize: "none" }} /></div>
      </div>

      {/* Right */}
      <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
        <div><label style={labelStyle}>Item Image</label>
          <label style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: 160, border: `1px dashed ${goldBorder}`, borderRadius: 2, cursor: "pointer", transition: "all 0.3s", gap: 8, background: imageFile ? "rgba(212,175,100,0.05)" : "transparent" }}
            onMouseEnter={e => (e.currentTarget.style.borderColor = "rgba(212,175,100,0.55)")}
            onMouseLeave={e => (e.currentTarget.style.borderColor = goldBorder)}>
            <input type="file" accept="image/*" onChange={e => e.target.files?.[0] && setImageFile(e.target.files[0])} style={{ display: "none" }} />
            {imageFile
              ? <><span style={{ fontSize: 22 }}>✓</span><span style={{ fontSize: 11, color: "rgba(212,175,100,0.6)", textAlign: "center", padding: "0 12px" }}>{imageFile.name}</span></>
              : <><span style={{ fontSize: 28, opacity: 0.25 }}>◈</span><span style={{ fontSize: 10, color: textMuted, letterSpacing: "0.16em", textTransform: "uppercase" }}>Click to upload</span></>
            }
          </label>
        </div>

        {/* Live preview */}
        {(form.name || form.price) && (
          <div style={{ padding: "14px 16px", background: goldFaint, border: `1px solid ${goldBorder}`, borderRadius: 3 }}>
            <p style={{ fontSize: 9, letterSpacing: "0.18em", textTransform: "uppercase", color: textMuted, marginBottom: 10 }}>Preview</p>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <p style={{ color: "#f0e6cc", fontSize: 14, fontWeight: 500, marginBottom: 3 }}>{form.name || "Item name"}</p>
                <p style={{ color: textMuted, fontSize: 11 }}>{form.category}</p>
              </div>
              {form.price && <p style={{ color: gold, fontSize: 16, fontWeight: 700 }}>₹{form.price}</p>}
            </div>
          </div>
        )}
      </div>

      {/* Submit */}
      <div style={{ gridColumn: "1 / -1", paddingTop: 8 }}>
        <div style={{ height: 1, background: "rgba(212,175,100,0.1)", marginBottom: 24 }} />
        <button onClick={handleSubmit} disabled={saving}
          style={{ width: "100%", padding: "14px 20px", background: saving ? "rgba(212,175,100,0.08)" : "linear-gradient(135deg, #b8860b 0%, #daa520 40%, #e8c84a 60%, #b8860b 100%)", border: saving ? `1px solid ${goldBorder}` : "none", borderRadius: 2, color: saving ? "rgba(212,175,100,0.4)" : "#120d00", fontFamily: "'DM Sans', sans-serif", fontSize: 11, fontWeight: 700, letterSpacing: "0.22em", textTransform: "uppercase", cursor: saving ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 10, transition: "all 0.3s" }}>
          {saving ? <Spinner /> : <PlusIcon />}
          <span>{saving ? "Adding…" : "Add to Menu"}</span>
        </button>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────
//  SALES PLACEHOLDER
// ─────────────────────────────────────────────
const SalesPlaceholder = () => (
  <div style={{ padding: "48px 0", textAlign: "center" }}>
    <div style={{ fontSize: 36, marginBottom: 12, opacity: 0.25 }}>📊</div>
    <p style={{ color: textMuted, fontSize: 13, letterSpacing: "0.12em", textTransform: "uppercase" }}>Sales analytics coming soon</p>
    <p style={{ color: "rgba(200,175,130,0.28)", fontSize: 12, marginTop: 6 }}>Connect your orders API to display revenue & stats</p>
  </div>
);

// ─────────────────────────────────────────────
//  MENU SECTION  (exported — used in RestaurantPage)
// ─────────────────────────────────────────────
interface MenuSectionProps {
  restaurantId: string;
}

const MenuSection: React.FC<MenuSectionProps> = ({ restaurantId }) => {
  const [activeTab, setActiveTab] = useState<TabId>("menu");
  const [itemCount, setItemCount] = useState(0);

  const tabs: { id: TabId; label: string }[] = [
    { id: "menu",  label: "Menu Items" },
    { id: "add",   label: "Add Item"   },
    { id: "sales", label: "Sales"      },
  ];

  return (
    <div style={{ maxWidth: 680, margin: "32px auto 0", position: "relative", zIndex: 10 }}>
      {/* Tab bar */}
      <div style={{ display: "flex", borderBottom: `1px solid ${goldBorder}` }}>
        {tabs.map(tab => {
          const active = activeTab === tab.id;
          return (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              style={{ padding: "14px 28px", background: "transparent", border: "none", borderBottom: active ? `2px solid ${gold}` : "2px solid transparent", color: active ? gold : textMuted, fontFamily: "'DM Sans', sans-serif", fontSize: 12, fontWeight: active ? 600 : 400, letterSpacing: "0.14em", textTransform: "uppercase", cursor: "pointer", transition: "all 0.2s", marginBottom: -1 }}
              onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.color = "rgba(212,175,100,0.75)"; }}
              onMouseLeave={e => { if (!active) (e.currentTarget as HTMLElement).style.color = textMuted; }}
            >
              {tab.label}
              {tab.id === "menu" && itemCount > 0 && (
                <span style={{ marginLeft: 8, fontSize: 9, padding: "2px 6px", background: goldFaint, border: `1px solid ${goldBorder}`, borderRadius: 2, color: gold }}>{itemCount}</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Panel */}
      <div style={{ position: "relative" }}>
        {[
          { top: 0,    left: 0,  borderTop:    `1px solid ${goldBorder}`, borderLeft:   `1px solid ${goldBorder}` },
          { top: 0,    right: 0, borderTop:    `1px solid ${goldBorder}`, borderRight:  `1px solid ${goldBorder}` },
          { bottom: 0, left: 0,  borderBottom: `1px solid ${goldBorder}`, borderLeft:   `1px solid ${goldBorder}` },
          { bottom: 0, right: 0, borderBottom: `1px solid ${goldBorder}`, borderRight:  `1px solid ${goldBorder}` },
        ].map((s, i) => <div key={i} style={{ position: "absolute", width: 20, height: 20, ...s, zIndex: 2 }} />)}

        <div style={{ background: cardBg, border: `1px solid rgba(212,175,100,0.1)`, borderTop: "none", borderRadius: "0 0 3px 3px", padding: "28px 32px", boxShadow: "0 24px 64px rgba(0,0,0,0.7)", minHeight: 200 }}>
          {activeTab === "menu"  && <MenuItemsList restaurantId={restaurantId} />}
          {activeTab === "add"   && <AddItemForm   restaurantId={restaurantId} onAdded={() => { setItemCount(p => p + 1); setActiveTab("menu"); }} />}
          {activeTab === "sales" && <SalesPlaceholder />}
        </div>
      </div>

      {/* Bottom ornament */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 28, opacity: 0.15 }}>
        <div style={{ height: 1, width: 28, background: "rgba(212,175,100,1)" }} />
        <div style={{ width: 4, height: 4, transform: "rotate(45deg)", background: "rgba(212,175,100,1)" }} />
        <div style={{ height: 1, width: 28, background: "rgba(212,175,100,1)" }} />
      </div>
    </div>
  );
};

export default MenuSection;