import { useState, useEffect, useCallback } from "react";
import { useApp } from "../../Context/MainContext";
import apiClient from "../../services/apiClient";
import { INearbyRestaurant } from "../../types";
import { RestaurantCard } from "./RestaurantCard";


// ── Haversine (client-side distance fallback) ──────────────────────
const getDistanceKm = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
    Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return +(2 * 6371 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))).toFixed(2);
};

const HOME_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;500;600&family=DM+Sans:wght@300;400;500&display=swap');
  @keyframes shimmer { 0%{background-position:0% center;} 100%{background-position:200% center;} }
  @keyframes drift1  { 0%,100%{transform:translate(0,0);} 50%{transform:translate(28px,-20px);} }
  @keyframes drift2  { 0%,100%{transform:translate(0,0);} 50%{transform:translate(-22px,-26px);} }
  @keyframes fadeUp  { from{opacity:0;transform:translateY(18px);} to{opacity:1;transform:translateY(0);} }
  @keyframes spin    { to{transform:rotate(360deg);} }
  @keyframes pulse   { 0%,100%{opacity:1;} 50%{opacity:0.4;} }
  .home-root *, .home-root *::before, .home-root *::after { box-sizing: border-box; margin: 0; padding: 0; }
  .restaurant-card:hover .card-image img { transform: scale(1.06); }
  .restaurant-card:hover { border-color: rgba(212,175,100,0.5) !important; box-shadow: 0 12px 40px rgba(0,0,0,0.6) !important; }
  .restaurant-card:hover .card-name { color: #e8c14e !important; }
`;

// ── Skeleton card ──────────────────────────────────────────────────
const SkeletonCard = () => (
  <div style={{
    background: "linear-gradient(155deg, rgba(20,15,7,0.98) 0%, rgba(11,8,3,0.99) 100%)",
    border: "1px solid rgba(212,175,100,0.1)", borderRadius: 4, overflow: "hidden",
    animation: "pulse 1.6s ease-in-out infinite",
  }}>
    <div style={{ height: 180, background: "rgba(212,175,100,0.06)" }} />
    <div style={{ padding: "18px 20px", display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ height: 14, width: "60%", background: "rgba(212,175,100,0.08)", borderRadius: 2 }} />
      <div style={{ height: 11, width: "85%", background: "rgba(212,175,100,0.05)", borderRadius: 2 }} />
      <div style={{ height: 11, width: "40%", background: "rgba(212,175,100,0.05)", borderRadius: 2 }} />
    </div>
  </div>
);



// ── Main Home Component ────────────────────────────────────────────
const Home = () => {
  const { location, city, loadingLocation } = useApp();
  const [restaurants, setRestaurants] = useState<INearbyRestaurant[]>([]);
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState<string | null>(null);
  const [ready, setReady]             = useState(false);

  useEffect(() => {
    setTimeout(() => setReady(true), 60);
  }, []);

  // ── Fetch nearby restaurants ──
  const fetchRestaurants = useCallback(async () => {
    // Wait for location to resolve
    if (loadingLocation) return;

    setLoading(true);
    setError(null);

    try {
      let params = "";

      if (location?.latitude && location?.longitude) {
        // Strategy 1: GPS coordinates
        params = `lat=${location.latitude}&lng=${location.longitude}&radius=10000`;
      } else if (city?.name) {
        // Strategy 2: fallback to city
        params = `city=${encodeURIComponent(city.name)}`;
      } else {
        setError("Could not determine your location. Please allow location access.");
        setLoading(false);
        return;
      }

      const res = await apiClient.get(`/restaurant/nearby?${params}`);

      if (res.data.success) {
        let data: INearbyRestaurant[] = res.data.data;

        // Client-side distance enrichment if backend didn't return it
        if (location?.latitude && location?.longitude) {
          data = data.map(r => ({
            ...r,
            distanceKm: r.distanceKm ?? getDistanceKm(
              location.latitude,
              location.longitude,
              r.autoLocation.coordinates[1],
              r.autoLocation.coordinates[0],
            ),
          }));
        }

        setRestaurants(data);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to fetch restaurants");
    } finally {
      setLoading(false);
    }
  }, [location, city, loadingLocation]);

  useEffect(() => {
    fetchRestaurants();
  }, [fetchRestaurants]);

  const locationLabel = city?.name
    ? `${city.name}${city.state ? `, ${city.state}` : ""}`
    : location ? "Your Location" : "Detecting…";

  return (
    <>
      <style>{HOME_CSS}</style>

      <div className="home-root" style={{
        minHeight: "100vh", width: "100%", backgroundColor: "#090705",
        background: "radial-gradient(ellipse at 20% 20%, rgba(201,168,76,0.07) 0%, transparent 55%), radial-gradient(ellipse at 80% 80%, rgba(184,134,11,0.06) 0%, transparent 55%), #090705",
        fontFamily: "'DM Sans', system-ui, sans-serif",
        padding: "40px 16px 80px", position: "relative", overflow: "hidden",
      }}>

        {/* Ambient orbs */}
        <div style={{ position: "absolute", top: "-8%", left: "-4%", width: 500, height: 500, borderRadius: "50%", background: "radial-gradient(circle, rgba(201,168,76,0.12) 0%, transparent 68%)", filter: "blur(50px)", animation: "drift1 14s ease-in-out infinite", pointerEvents: "none" }} />
        <div style={{ position: "absolute", bottom: "-10%", right: "-6%", width: 420, height: 420, borderRadius: "50%", background: "radial-gradient(circle, rgba(184,134,11,0.1) 0%, transparent 68%)", filter: "blur(55px)", animation: "drift2 17s ease-in-out infinite", pointerEvents: "none" }} />
        <div style={{ position: "absolute", inset: 0, pointerEvents: "none", opacity: 0.025, backgroundImage: "linear-gradient(rgba(212,175,100,1) 1px, transparent 1px), linear-gradient(90deg, rgba(212,175,100,1) 1px, transparent 1px)", backgroundSize: "64px 64px" }} />

        <div style={{
          position: "relative", zIndex: 10, maxWidth: 1100, margin: "0 auto",
          opacity: ready ? 1 : 0, transform: ready ? "translateY(0)" : "translateY(20px)",
          transition: "opacity 0.6s cubic-bezier(.16,1,.3,1), transform 0.6s cubic-bezier(.16,1,.3,1)",
        }}>

          {/* ── Hero Header ── */}
          <div style={{ marginBottom: 48 }}>
            {/* Location pill */}
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 20 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 14px", background: "rgba(212,175,100,0.07)", border: "1px solid rgba(212,175,100,0.2)", borderRadius: 2 }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#d4af64" strokeWidth="1.5" strokeLinecap="round">
                  <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" />
                  <circle cx="12" cy="9" r="2.5" />
                </svg>
                <span style={{ fontSize: 11, color: "rgba(212,175,100,0.7)", letterSpacing: "0.14em", textTransform: "uppercase", fontWeight: 500 }}>
                  {loadingLocation ? "Detecting location…" : locationLabel}
                </span>
              </div>
            </div>

            {/* Title */}
            <h1 style={{
              fontFamily: "'Playfair Display', Georgia, serif",
              fontSize: "clamp(28px, 5vw, 48px)", fontWeight: 500, lineHeight: 1.15,
              background: "linear-gradient(90deg, #b8860b, #f0d070, #daa520, #c9a84c, #b8860b)",
              backgroundSize: "300% auto", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
              backgroundClip: "text", animation: "shimmer 6s linear infinite",
              marginBottom: 12,
            }}>
              Restaurants Near You
            </h1>
            <p style={{ fontSize: 14, color: "rgba(200,175,130,0.5)", letterSpacing: "0.04em", maxWidth: 500 }}>
              {loading
                ? "Finding the best restaurants nearby…"
                : restaurants.length > 0
                ? `${restaurants.length} restaurants found within reach`
                : error ? "" : "No restaurants found in your area yet"
              }
            </p>

            {/* Ornament */}
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 20 }}>
              <div style={{ height: 1, width: 48, background: "linear-gradient(90deg, transparent, rgba(212,175,100,0.35))" }} />
              <div style={{ width: 4, height: 4, borderRadius: "50%", background: "rgba(212,175,100,0.4)" }} />
              <div style={{ height: 1, width: 48, background: "linear-gradient(90deg, rgba(212,175,100,0.35), transparent)" }} />
            </div>
          </div>

          {/* ── Loading skeletons ── */}
          {(loading || loadingLocation) && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 20 }}>
              {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
            </div>
          )}

          {/* ── Error state ── */}
          {error && !loading && (
            <div style={{ textAlign: "center", padding: "64px 0" }}>
              <div style={{ fontSize: 40, marginBottom: 16, opacity: 0.3 }}>◈</div>
              <p style={{ color: "rgba(200,175,130,0.5)", fontSize: 14, marginBottom: 20 }}>{error}</p>
              <button
                onClick={fetchRestaurants}
                style={{ padding: "11px 28px", background: "rgba(212,175,100,0.08)", border: "1px solid rgba(212,175,100,0.3)", borderRadius: 2, color: "#d4af64", fontFamily: "'DM Sans', sans-serif", fontSize: 11, fontWeight: 500, letterSpacing: "0.16em", textTransform: "uppercase", cursor: "pointer", transition: "all 0.2s" }}
                onMouseEnter={e => (e.currentTarget.style.background = "rgba(212,175,100,0.14)")}
                onMouseLeave={e => (e.currentTarget.style.background = "rgba(212,175,100,0.08)")}
              >
                Try Again
              </button>
            </div>
          )}

          {/* ── Empty state ── */}
          {!loading && !loadingLocation && !error && restaurants.length === 0 && (
            <div style={{ textAlign: "center", padding: "64px 0" }}>
              <div style={{ fontSize: 48, marginBottom: 16, opacity: 0.2 }}>🍽️</div>
              <p style={{ fontFamily: "'Playfair Display', serif", fontSize: 22, color: "rgba(212,175,100,0.4)", marginBottom: 8 }}>
                No restaurants nearby
              </p>
              <p style={{ color: "rgba(200,175,130,0.35)", fontSize: 13 }}>
                Be the first to open one in {city?.name || "your area"}
              </p>
            </div>
          )}

          {/* ── Restaurant Grid ── */}
          {!loading && !loadingLocation && restaurants.length > 0 && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(290px, 1fr))", gap: 20 }}>
              {restaurants.map((r, i) => (
                <RestaurantCard key={r._id} restaurant={r} index={i} />
              ))}
            </div>
          )}

          {/* ── Refresh button ── */}
          {!loading && !loadingLocation && restaurants.length > 0 && (
            <div style={{ display: "flex", justifyContent: "center", marginTop: 48 }}>
              <button
                onClick={fetchRestaurants}
                style={{ display: "flex", alignItems: "center", gap: 8, padding: "12px 32px", background: "rgba(212,175,100,0.07)", border: "1px solid rgba(212,175,100,0.25)", borderRadius: 2, color: "rgba(212,175,100,0.6)", fontFamily: "'DM Sans', sans-serif", fontSize: 11, fontWeight: 500, letterSpacing: "0.18em", textTransform: "uppercase", cursor: "pointer", transition: "all 0.25s" }}
                onMouseEnter={e => { e.currentTarget.style.background = "rgba(212,175,100,0.12)"; e.currentTarget.style.color = "#d4af64"; }}
                onMouseLeave={e => { e.currentTarget.style.background = "rgba(212,175,100,0.07)"; e.currentTarget.style.color = "rgba(212,175,100,0.6)"; }}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <polyline points="1 4 1 10 7 10" />
                  <path d="M3.51 15a9 9 0 1 0 .49-4.5" />
                </svg>
                Refresh
              </button>
            </div>
          )}

        </div>
      </div>
    </>
  );
};

export default Home;