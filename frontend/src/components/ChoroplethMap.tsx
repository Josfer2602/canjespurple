import React, { useEffect, useState, useMemo, useRef } from 'react';
import { MapContainer, TileLayer, GeoJSON, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import {
  PERU_DEPS_URL,
  PERU_DIST_URL,
  LIMA_CENTER,
  PERU_CENTER,
  isLimaFocused,
  countPointsPerFeature,
  getChoroplethColor,
  filterLimaFeatures,
  calculateBounds
} from '../utils/geo-helpers';

interface ChoroplethMapProps {
  geoData: { id: string; lat: number; lng: number; pointName: string; startTime: string }[];
}

// Sub-component to dynamically fit the map to bounds
const FitBounds: React.FC<{ bounds: [[number, number], [number, number]] | null; center: [number, number]; zoom: number }> = ({ bounds, center, zoom }) => {
  const map = useMap();
  useEffect(() => {
    if (bounds) {
      map.fitBounds(bounds, { padding: [30, 30], maxZoom: 14 });
    } else {
      map.setView(center, zoom);
    }
  }, [bounds, center, zoom, map]);
  return null;
};

const ChoroplethMap: React.FC<ChoroplethMapProps> = ({ geoData }) => {
  const [depGeoJSON, setDepGeoJSON] = useState<any>(null);
  const [distGeoJSON, setDistGeoJSON] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const geoJsonRef = useRef<any>(null);

  // Determine view mode
  const limaMode = useMemo(() => isLimaFocused(geoData), [geoData]);
  
  // Compute counts
  const { counts, maxCount, activeGeoJSON, nameKey } = useMemo(() => {
    if (limaMode && distGeoJSON) {
      const limaGeo = filterLimaFeatures(distGeoJSON, 'NOMBPROV');
      const nameKey = 'NOMBDIST';
      const c = countPointsPerFeature(geoData, limaGeo, nameKey);
      const maxC = Math.max(...Object.values(c), 1);
      return { counts: c, maxCount: maxC, activeGeoJSON: limaGeo, nameKey };
    }
    if (!limaMode && depGeoJSON) {
      const nameKey = 'NOMBDEP';
      const c = countPointsPerFeature(geoData, depGeoJSON, nameKey);
      const maxC = Math.max(...Object.values(c), 1);
      return { counts: c, maxCount: maxC, activeGeoJSON: depGeoJSON, nameKey };
    }
    return { counts: {}, maxCount: 1, activeGeoJSON: null, nameKey: '' };
  }, [limaMode, distGeoJSON, depGeoJSON, geoData]);

  // Calculate bounds from data
  const bounds = useMemo(() => calculateBounds(geoData), [geoData]);

  // Fetch GeoJSON data
  useEffect(() => {
    const fetchGeo = async () => {
      try {
        setLoading(true);
        const [depRes, distRes] = await Promise.all([
          fetch(PERU_DEPS_URL).then(r => r.json()),
          fetch(PERU_DIST_URL).then(r => r.json())
        ]);
        setDepGeoJSON(depRes);
        setDistGeoJSON(distRes);
      } catch (err) {
        console.error('Error loading GeoJSON:', err);
        setError(true);
      } finally {
        setLoading(false);
      }
    };
    fetchGeo();
  }, []);

  // Style function for GeoJSON features
  const styleFeature = (feature: any) => {
    const name = feature?.properties?.[nameKey] || '';
    const count = counts[name] || 0;
    const fillColor = getChoroplethColor(count, maxCount);

    return {
      fillColor,
      weight: count > 0 ? 2 : 1,
      opacity: 1,
      color: count > 0 ? '#7c3aed' : '#cbd5e1',
      dashArray: count > 0 ? '' : '2',
      fillOpacity: count > 0 ? 0.7 : 0.15
    };
  };

  // Interactive handlers for each feature
  const onEachFeature = (feature: any, layer: any) => {
    const name = feature?.properties?.[nameKey] || 'Desconocido';
    const count = counts[name] || 0;

    layer.bindTooltip(
      `<div style="font-family:system-ui;padding:4px 8px;">
        <div style="font-weight:900;font-size:11px;text-transform:uppercase;color:#1e293b;letter-spacing:0.05em;">${name}</div>
        <div style="font-weight:800;font-size:18px;color:#7c3aed;margin-top:2px;">${count}</div>
        <div style="font-size:9px;color:#94a3b8;font-weight:700;text-transform:uppercase;">canjes registrados</div>
      </div>`,
      { sticky: true, className: 'choropleth-tooltip' }
    );

    layer.on({
      mouseover: (e: any) => {
        const l = e.target;
        l.setStyle({
          weight: 3,
          color: '#6d28d9',
          fillOpacity: 0.85
        });
        l.bringToFront();
      },
      mouseout: (e: any) => {
        if (geoJsonRef.current) {
          geoJsonRef.current.resetStyle(e.target);
        }
      }
    });
  };

  const center = limaMode ? LIMA_CENTER : PERU_CENTER;
  const zoom = limaMode ? 11 : 6;

  // Sorted top regions for the legend
  const topRegions = useMemo(() => {
    return Object.entries(counts)
      .filter(([, v]) => v > 0)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
  }, [counts]);

  if (loading) {
    return (
      <div className="h-[500px] bg-slate-50 rounded-3xl border border-slate-200 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin"></div>
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Cargando mapa geográfico...</span>
        </div>
      </div>
    );
  }

  if (error || !activeGeoJSON) {
    return (
      <div className="h-[500px] bg-slate-50 rounded-3xl border border-slate-200 flex items-center justify-center">
        <span className="text-slate-400 text-xs font-bold uppercase">Error cargando datos geográficos</span>
      </div>
    );
  }

  return (
    <div className="relative">
      <div className="bg-white p-2 rounded-3xl border border-slate-200 shadow-sm h-[500px] overflow-hidden relative">
        <MapContainer
          center={center}
          zoom={zoom}
          style={{ height: '100%', width: '100%', borderRadius: '1.2rem' }}
          zoomControl={true}
          scrollWheelZoom={true}
        >
          <TileLayer
            attribution='&copy; <a href="https://carto.com/">CARTO</a>'
            url="https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png"
          />
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/light_only_labels/{z}/{x}/{y}{r}.png"
          />
          <GeoJSON
            key={nameKey + JSON.stringify(counts)}
            ref={geoJsonRef}
            data={activeGeoJSON}
            style={styleFeature}
            onEachFeature={onEachFeature}
          />
          <FitBounds bounds={bounds} center={center} zoom={zoom} />
        </MapContainer>

        {/* View Mode Badge */}
        <div className="absolute top-5 right-5 z-[1000] bg-white/90 backdrop-blur-sm px-4 py-2 rounded-2xl shadow-lg border border-slate-200">
          <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Vista: </span>
          <span className="text-[10px] font-black text-purple-600 uppercase tracking-wider">
            {limaMode ? '📍 Lima Metropolitana' : '🗺️ Nacional (Perú)'}
          </span>
        </div>

        {/* Legend */}
        {topRegions.length > 0 && (
          <div className="absolute bottom-5 left-5 z-[1000] bg-white/95 backdrop-blur-sm p-4 rounded-2xl shadow-lg border border-slate-200 max-w-[220px]">
            <div className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-3">Top Zonas</div>
            <div className="space-y-1.5">
              {topRegions.map(([name, count]) => (
                <div key={name} className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <div
                      className="w-3 h-3 rounded-sm flex-shrink-0"
                      style={{ backgroundColor: getChoroplethColor(count, maxCount) }}
                    />
                    <span className="text-[9px] font-bold text-slate-600 uppercase truncate">{name}</span>
                  </div>
                  <span className="text-[10px] font-black text-purple-600 flex-shrink-0">{count}</span>
                </div>
              ))}
            </div>
            {/* Color Scale */}
            <div className="mt-3 pt-3 border-t border-slate-100">
              <div className="flex items-center gap-1">
                <span className="text-[8px] font-bold text-slate-400">0</span>
                <div className="flex-1 flex gap-0.5">
                  {['#f1f5f9', '#c4b5fd', '#a78bfa', '#8b5cf6', '#7c3aed', '#6d28d9'].map(c => (
                    <div key={c} className="flex-1 h-2 rounded-sm" style={{ backgroundColor: c }} />
                  ))}
                </div>
                <span className="text-[8px] font-bold text-slate-400">Max</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChoroplethMap;
