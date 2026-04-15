import React from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import "leaflet-routing-machine";
import { useMap } from "react-leaflet";

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

const RoutingComponent = ({ startLat, startLng, endLat, endLng }: { startLat: number, startLng: number, endLat: number, endLng: number }) => {
    const map = useMap();

    React.useEffect(() => {
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
            fitSelectedRoutes: true, // Auto-zoom to fit the route on the Rider's screen
            show: false,
            createMarker: () => null,
        }).addTo(map);

        return () => {
            try {
                map.removeControl(routingControl);
            } catch (e) {
                // Ignore
            }
        };
    }, [map, startLat, startLng, endLat, endLng]);

    return null;
};

interface Props {
    myLocation: { lat: number; lng: number } | null;
    customerLat: number;
    customerLng: number;
}

const RiderMap: React.FC<Props> = ({ myLocation, customerLat, customerLng }) => {
    if (!myLocation || !customerLat || !customerLng) {
        return (
            <div className="h-full flex flex-col items-center justify-center text-center">
                <svg className="w-8 h-8 text-emerald-500 animate-spin mb-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <p className="text-stone-400 text-sm">Getting GPS Coordinates...</p>
            </div>
        );
    }

    return (
        <div className="w-full h-full relative rounded-3xl overflow-hidden border border-white/5">
            <MapContainer
                center={[myLocation.lat, myLocation.lng]}
                zoom={14}
                style={{ height: "100%", width: "100%", zIndex: 1 }}
            >
                <TileLayer
                    attribution='&copy; <a href="https://carto.com/">CartoDB</a>'
                    url="https://{s}.basemaps.cartocdn.com/rastertiles/dark_all/{z}/{x}/{y}{r}.png"
                />

                <Marker position={[myLocation.lat, myLocation.lng]} icon={riderIcon}>
                    <Popup className="text-black font-bold text-center">You are here</Popup>
                </Marker>

                <Marker position={[customerLat, customerLng]} icon={homeIcon}>
                    <Popup className="text-black font-bold text-center">Customer Drop-off</Popup>
                </Marker>

                <RoutingComponent
                    startLat={myLocation.lat}
                    startLng={myLocation.lng}
                    endLat={customerLat}
                    endLng={customerLng}
                />
            </MapContainer>
        </div>
    );
};

export default RiderMap;
