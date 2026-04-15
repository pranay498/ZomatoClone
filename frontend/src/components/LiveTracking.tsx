import React, { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import "leaflet-routing-machine";
import { useSocket } from "../Context/SocketContext";
import { IOrder } from "../types";

// --- Custom Icons ---
const riderIcon = L.divIcon({
    className: "custom-icon",
    html: `<div style="background-color: #10b981; width: 30px; height: 30px; border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 2px solid white; box-shadow: 0 0 10px rgba(16,185,129,0.5); font-size: 16px;">🛵</div>`,
    iconSize: [30, 30],
    iconAnchor: [15, 15],
});

const homeIcon = L.divIcon({
    className: "custom-icon",
    html: `<div style="background-color: #b8860b; width: 30px; height: 30px; border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 2px solid white; box-shadow: 0 0 10px rgba(184,134,11,0.5); font-size: 16px;">🏠</div>`,
    iconSize: [30, 30],
    iconAnchor: [15, 15],
});

interface Props {
    order: IOrder;
    restaurantId: string;
}

const RoutingComponent = ({ startLat, startLng, endLat, endLng }: { startLat: number, startLng: number, endLat: number, endLng: number }) => {
    const map = useMap();

    useEffect(() => {
        if (!map) return;
        const LAny = L as any;

        if (!LAny.Routing) return;

        const routingControl = LAny.Routing.control({
            waypoints: [
                L.latLng(startLat, startLng),
                L.latLng(endLat, endLng)
            ],
            lineOptions: {
                styles: [{ color: "#10b981", weight: 4, dashArray: "10, 10" }],
                extendToWaypoints: true,
                missingRouteTolerance: 10
            },
            addWaypoints: false,
            draggableWaypoints: false,
            fitSelectedRoutes: false,
            show: false,
            createMarker: () => null,
        }).addTo(map);

        return () => {
            try {
                map.removeControl(routingControl);
            } catch (e) {
                // Ignore errors when unmounting
            }
        };
    }, [map, startLat, startLng, endLat, endLng]);

    return null;
};

const LiveTrackingMap: React.FC<Props> = ({ order, restaurantId }) => {
    const { socket } = useSocket();
    const [riderLocation, setRiderLocation] = useState<{ lat: number, lng: number } | null>(null);
    const [distance, setDistance] = useState<string | null>(null);

    // Extract customer's delivery coordinates
    const customerLat = order.deliveryAddress?.latitude;
    const customerLng = order.deliveryAddress?.longitude;

    useEffect(() => {
        if (!socket) return;

        const handleLocationUpdate = (payload: any) => {
            if (payload.orderId === order._id) {
                setRiderLocation({ lat: payload.lat, lng: payload.lng });

                // Calculate distance if we have both Rider and Customer coordinates
                if (customerLat && customerLng) {
                    const riderLatLng = L.latLng(payload.lat, payload.lng);
                    const customerLatLng = L.latLng(customerLat, customerLng);

                    // distanceTo returns meters
                    const distanceInMeters = riderLatLng.distanceTo(customerLatLng);

                    if (distanceInMeters > 1000) {
                        setDistance(`${(distanceInMeters / 1000).toFixed(1)} km`);
                    } else {
                        setDistance(`${Math.round(distanceInMeters)} meters`);
                    }
                }
            }
        };

        socket.on("RIDER_LOCATION_UPDATED", handleLocationUpdate);

        return () => {
            socket.off("RIDER_LOCATION_UPDATED", handleLocationUpdate);
        };
    }, [socket, order._id, customerLat, customerLng]);

    if (!riderLocation) {
        return (
            <div className="w-full h-full flex flex-col items-center justify-center bg-black/40 text-amber-500/70 text-sm p-6 text-center">
                <svg className="w-6 h-6 animate-spin mb-2" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Waiting for {order.riderName || "rider"}'s GPS signal...<br />
                <span className="text-xs text-stone-500 mt-2">(Ensure the rider has clicked "I have picked up the order")</span>
            </div>
        );
    }

    // Draw a line between the rider and the customer
    const polylinePositions: [number, number][] = [
        [riderLocation.lat, riderLocation.lng]
    ];
    if (customerLat && customerLng) {
        polylinePositions.push([customerLat, customerLng]);
    }

    return (
        <div className="relative w-full h-full">
            {/* Floating Distance Overlay */}
            {distance && (
                <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[1000] bg-[#141210]/90 backdrop-blur-md border border-amber-500/30 px-4 py-2 rounded-full shadow-lg flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                    <span className="text-amber-50 text-sm font-bold tracking-wider">
                        Distance: <span className="text-emerald-400">{distance}</span>
                    </span>
                </div>
            )}

            <MapContainer
                center={[riderLocation.lat, riderLocation.lng]}
                zoom={14}
                style={{ height: "100%", width: "100%", zIndex: 1 }}
            >
                <TileLayer
                    attribution='&copy; <a href="https://carto.com/">CartoDB</a>'
                    url="https://{s}.basemaps.cartocdn.com/rastertiles/dark_all/{z}/{x}/{y}{r}.png" // Dark theme map to match your UI
                />

                {/* Rider Marker */}
                <Marker position={[riderLocation.lat, riderLocation.lng]} icon={riderIcon}>
                    <Popup className="text-black font-bold text-center">
                        🛵 {order.riderName || "Rider"}<br />
                        <span className="text-xs font-normal">Live Location</span>
                    </Popup>
                </Marker>

                {/* Customer Destination Marker */}
                {customerLat && customerLng && (
                    <Marker position={[customerLat, customerLng]} icon={homeIcon}>
                        <Popup className="text-black font-bold text-center">
                            🏠 Customer<br />
                            <span className="text-xs font-normal">Drop-off Point</span>
                        </Popup>
                    </Marker>
                )}

                {/* Connecting Line - Using Leaflet Routing Machine */}
                {customerLat && customerLng && (
                    <RoutingComponent
                        startLat={riderLocation.lat}
                        startLng={riderLocation.lng}
                        endLat={customerLat}
                        endLng={customerLng}
                    />
                )}
            </MapContainer>
        </div>
    );
};

export default LiveTrackingMap; 