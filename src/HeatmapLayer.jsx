import { useEffect, useRef } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";

export default function HeatmapLayer({ data }) {
    const map = useMap();
    const heatLayerRef = useRef(null);

    useEffect(() => {
        // Ensure L is globally available for the leaflet.heat plugin
        window.L = window.L || L;

        import("leaflet.heat").then(() => {
            if (!L.heatLayer) return;

            const points = data.map((p) => [p.lat, p.lng, p.tds]);

            const currentZoom = map.getZoom();

            // Calibrate so that the visual looks like atmospheric density, not a solid painted circle
            const radius = Math.max(12, currentZoom * 2);
            const blur = Math.max(15, currentZoom * 2.5);

            // Create new layer
            const newLayer = L.heatLayer(points, {
                radius: radius,
                blur: blur,
                maxZoom: 10, // Point at which intensity hits maximum visual strength
                max: 800, // Important: greatly expanded the max so stacks of points don't instantly blow out to solid red
                minOpacity: 0.15, // Provide base texture
                gradient: {
                    0.3: 'green',
                    0.5: 'yellow',
                    0.7: 'orange',
                    0.9: 'red'
                }
            });

            // Remove the old one if it exists
            if (heatLayerRef.current && map.hasLayer(heatLayerRef.current)) {
                map.removeLayer(heatLayerRef.current);
            }

            // Add the new one and ref it
            heatLayerRef.current = newLayer;
            map.addLayer(heatLayerRef.current);
        });

        return () => {
            if (heatLayerRef.current && map.hasLayer(heatLayerRef.current)) {
                map.removeLayer(heatLayerRef.current);
            }
        };
    }, [map, data]); // Recreate when data changes

    // Listen to zoom events to dynamically update radius and blur
    useEffect(() => {
        const onZoom = () => {
            if (!heatLayerRef.current) return;

            const currentZoom = map.getZoom();

            // Ensure patches scale correctly on zoom
            const newRadius = Math.max(12, currentZoom * 2);
            const newBlur = Math.max(15, currentZoom * 2.5);

            heatLayerRef.current.setOptions({
                radius: newRadius,
                blur: newBlur
            });
        };

        map.on('zoomend', onZoom);

        return () => {
            map.off('zoomend', onZoom);
        };
    }, [map]);

    return null;
}
