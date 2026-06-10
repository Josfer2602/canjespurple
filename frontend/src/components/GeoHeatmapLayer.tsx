import React, { useEffect } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet.heat';

interface GeoHeatmapLayerProps {
  points: { lat: number; lng: number }[];
  radius?: number;
  blur?: number;
  maxZoom?: number;
}

const GeoHeatmapLayer: React.FC<GeoHeatmapLayerProps> = ({ points, radius = 25, blur = 15, maxZoom = 17 }) => {
  const map = useMap();

  useEffect(() => {
    if (!points || points.length === 0) return;

    // Convert points to [lat, lng, intensity]
    // Default intensity is 1 if not provided
    const heatData = points.map(p => [p.lat, p.lng, 1] as [number, number, number]);

    // Create heat layer
    const heatLayer = (L as any).heatLayer(heatData, {
      radius,
      blur,
      maxZoom,
      max: 1.0,
      gradient: { 0.4: 'blue', 0.6: 'cyan', 0.7: 'lime', 0.8: 'yellow', 1.0: 'red' }
    });

    heatLayer.addTo(map);

    return () => {
      map.removeLayer(heatLayer);
    };
  }, [map, points, radius, blur, maxZoom]);

  return null;
};

export default GeoHeatmapLayer;
