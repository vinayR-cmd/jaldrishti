import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import { AlertTriangle, Zap } from 'lucide-react';
import { waterData as initialWaterData } from "./data";
import HeatmapLayer from "./HeatmapLayer";
import L from 'leaflet';

// Fix missing Leaflet marker icons issue in React
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconUrl: markerIcon,
    iconRetinaUrl: markerIcon2x,
    shadowUrl: markerShadow,
});

export default function MapView({ height = "600px", analysis = null }) {
    const [data, setData] = useState(initialWaterData);

    useEffect(() => {
        const interval = setInterval(() => {
            setData((prevData) =>
                prevData.map((point) => ({
                    ...point,
                    // Ensuring TDS doesn't go negative during random fluctuations
                    tds: Math.max(0, point.tds + Math.floor(Math.random() * 50) - 25),
                }))
            );
        }, 5000);

        return () => clearInterval(interval);
    }, []);

    return (
        <div style={{ position: "relative", width: "100%", height: height, borderRadius: "1.5rem", overflow: "hidden" }}>
            <MapContainer center={[22.0, 79.0]} zoom={5} style={{ height: "100%", width: "100%" }}>
                <TileLayer
                    attribution="&copy; OpenStreetMap"
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />

                <HeatmapLayer data={data} />

                {analysis && data.length > 0 && (
                    <Marker position={[data[0].lat, data[0].lng]}>
                        <Popup className="water-analysis-popup">
                            <div className="p-1 min-w-[200px]">
                                <h3 className="text-sm font-black uppercase tracking-widest mb-3 flex items-center gap-2 border-b pb-2">
                                    <AlertTriangle className="w-4 h-4 text-unsafe" />
                                    Known Hazards
                                </h3>
                                <ul className="mb-4 space-y-1">
                                    {analysis.side_effects.map((effect, i) => (
                                        <li key={i} className="text-xs flex items-start gap-1.5 leading-tight">
                                            <span className="text-unsafe mt-0.5">•</span> {effect}
                                        </li>
                                    ))}
                                </ul>

                                <h3 className="text-sm font-black uppercase tracking-widest mb-3 flex items-center gap-2 border-b pb-2">
                                    <Zap className="w-4 h-4 text-safe" />
                                    Recommendations
                                </h3>
                                <ul className="space-y-1">
                                    {analysis.improvement_tips.map((tip, i) => (
                                        <li key={i} className="text-xs flex items-start gap-1.5 leading-tight">
                                            <span className="text-safe mt-0.5">•</span> {tip}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </Popup>
                    </Marker>
                )}
            </MapContainer>

            <div
                className="legend"
                style={{
                    position: "absolute",
                    top: 10,
                    right: 10,
                    background: "rgba(0, 21, 41, 0.9)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    color: "white",
                    padding: "10px",
                    borderRadius: "1rem",
                    zIndex: 1000,
                    boxShadow: "0 4px 15px rgb(0 0 0 / 0.5)",
                    fontWeight: "bold",
                    fontSize: "0.8rem",
                    backdropFilter: "blur(10px)"
                }}
            >
                🟢 Safe | 🟠 Risk | 🔴 Unsafe
            </div>
        </div>
    );
}
