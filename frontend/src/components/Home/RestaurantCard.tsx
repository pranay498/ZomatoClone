import { useNavigate } from "react-router-dom";
import { INearbyRestaurant } from "../../types";

export const RestaurantCard = ({
    restaurant,
    index,
}: {
    restaurant: INearbyRestaurant;
    index: number;
}) => {
    const navigate = useNavigate();
    const distLabel = restaurant.distanceKm != null
        ? `${restaurant.distanceKm} km`
        : restaurant.distance != null
            ? `${(restaurant.distance / 1000).toFixed(1)} km`
            : null;

    return (
        <div
            className="restaurant-card"
            onClick={() => navigate(`/restaurant/${restaurant._id}`)}
            style={{
                background: "linear-gradient(155deg, rgba(20,15,7,0.98) 0%, rgba(11,8,3,0.99) 100%)",
                border: "1px solid rgba(212,175,100,0.15)",
                borderRadius: 4, overflow: "hidden", cursor: "pointer",
                transition: "all 0.3s ease",
                boxShadow: "0 4px 20px rgba(0,0,0,0.4)",
                animation: `fadeUp 0.5s ease both`,
                animationDelay: `${index * 80}ms`,
            }}
        >
            {/* Image */}
            <div className="card-image" style={{ height: 180, overflow: "hidden", position: "relative" }}>
                {restaurant.imageUrl ? (
                    <img
                        src={restaurant.imageUrl}
                        alt={restaurant.name}
                        style={{ width: "100%", height: "100%", objectFit: "cover", opacity: 0.82, transition: "transform 0.4s ease" }}
                    />
                ) : (
                    <div style={{ width: "100%", height: "100%", background: "radial-gradient(circle at 30% 50%, rgba(212,175,100,0.12), rgba(0,0,0,0.4))", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <span style={{ fontSize: 40, opacity: 0.25 }}>🍽️</span>
                    </div>
                )}
                {/* Gradient overlay */}
                <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom, transparent 50%, rgba(9,7,5,0.9) 100%)" }} />

                {/* Badges */}
                <div style={{ position: "absolute", top: 12, left: 12, display: "flex", gap: 6 }}>
                    <span style={{
                        fontSize: 9, letterSpacing: "0.14em", padding: "3px 8px", borderRadius: 2,
                        fontWeight: 600, textTransform: "uppercase",
                        background: restaurant.isOpen ? "rgba(74,222,128,0.15)" : "rgba(239,68,68,0.15)",
                        border: `1px solid ${restaurant.isOpen ? "rgba(74,222,128,0.4)" : "rgba(239,68,68,0.4)"}`,
                        color: restaurant.isOpen ? "#4ade80" : "#f87171",
                    }}>
                        {restaurant.isOpen ? "● Open" : "● Closed"}
                    </span>
                    {restaurant.isVerified && (
                        <span style={{ fontSize: 9, letterSpacing: "0.14em", padding: "3px 8px", borderRadius: 2, fontWeight: 600, textTransform: "uppercase", background: "rgba(212,175,100,0.12)", border: "1px solid rgba(212,175,100,0.35)", color: "#d4af64" }}>
                            ✓ Verified
                        </span>
                    )}
                </div>

                {/* Distance badge */}
                {distLabel && (
                    <div style={{ position: "absolute", bottom: 12, right: 12 }}>
                        <span style={{ fontSize: 11, fontWeight: 600, padding: "4px 10px", borderRadius: 2, background: "rgba(9,7,5,0.85)", border: "1px solid rgba(212,175,100,0.3)", color: "#d4af64", fontFamily: "'DM Sans', sans-serif" }}>
                            📍 {distLabel}
                        </span>
                    </div>
                )}
            </div>

            {/* Info */}
            <div style={{ padding: "18px 20px" }}>
                <h3 className="card-name" style={{ fontFamily: "'Playfair Display', serif", fontSize: 16, fontWeight: 500, color: "#f0e6cc", marginBottom: 6, transition: "color 0.2s", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {restaurant.name}
                </h3>
                <p style={{ fontSize: 12, color: "rgba(200,175,130,0.55)", lineHeight: 1.5, marginBottom: 12, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                    {restaurant.description}
                </p>

                {/* Divider */}
                <div style={{ height: 1, background: "rgba(212,175,100,0.08)", marginBottom: 12 }} />

                {/* Address */}
                <p style={{ fontSize: 11, color: "rgba(200,175,130,0.38)", letterSpacing: "0.04em", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    📍 {restaurant.autoLocation?.formattedAddress}
                </p>
            </div>
        </div>
    );
};