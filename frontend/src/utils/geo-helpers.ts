// ==============================
// GEO HELPERS - Point-in-Polygon & Color Utils
// ==============================

// GeoJSON CDN URLs
export const PERU_DEPS_URL = 'https://raw.githubusercontent.com/juaneladio/peru-geojson/master/peru_departamental_simple.geojson';
export const PERU_DIST_URL = 'https://raw.githubusercontent.com/juaneladio/peru-geojson/master/peru_distrital_simple.geojson';
export const PERU_PROV_URL = 'https://raw.githubusercontent.com/juaneladio/peru-geojson/master/peru_provincial_simple.geojson';

// Lima bounding box (approximate)
export const LIMA_BBOX = {
  minLat: -12.52,
  maxLat: -11.57,
  minLng: -77.20,
  maxLng: -76.62
};

export const LIMA_CENTER: [number, number] = [-12.046, -77.043];
export const PERU_CENTER: [number, number] = [-9.19, -75.015];

/**
 * Ray-casting point-in-polygon algorithm
 * Works with a single polygon ring (array of [lng, lat] pairs)
 */
function pointInRing(point: [number, number], ring: number[][]): boolean {
  const x = Number(point[0]), y = Number(point[1]); // [lng, lat]
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = Number(ring[i][0]), yi = Number(ring[i][1]);
    const xj = Number(ring[j][0]), yj = Number(ring[j][1]);
    const intersect = ((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

/**
 * Check if a point [lng, lat] is inside a GeoJSON geometry
 * Supports Polygon and MultiPolygon
 */
export function pointInGeometry(point: [number, number], geometry: any): boolean {
  if (!geometry || !geometry.type) return false;
  if (geometry.type === 'Polygon') {
    // Check outer ring (index 0) - skip holes for simplicity
    return pointInRing(point, geometry.coordinates[0]);
  }
  if (geometry.type === 'MultiPolygon') {
    return geometry.coordinates.some((polygon: number[][][]) => pointInRing(point, polygon[0]));
  }
  return false;
}

/**
 * Count points per GeoJSON feature
 * Returns a map: featureName -> count
 */
export function countPointsPerFeature(
  points: { lat: number; lng: number }[],
  geojson: any,
  nameProperty: string
): Record<string, number> {
  const counts: Record<string, number> = {};
  
  if (!geojson || !geojson.features) return counts;

  // Initialize all features with 0
  geojson.features.forEach((f: any) => {
    if (f.properties && f.properties[nameProperty]) {
      counts[f.properties[nameProperty]] = 0;
    }
  });

  if (!points || !Array.isArray(points)) return counts;

  // Count each point
  points.forEach(pt => {
    if (pt && pt.lng !== undefined && pt.lat !== undefined) {
      const coord: [number, number] = [Number(pt.lng), Number(pt.lat)];
      for (const feature of geojson.features) {
        if (pointInGeometry(coord, feature.geometry)) {
          if (feature.properties && feature.properties[nameProperty]) {
            counts[feature.properties[nameProperty]] = (counts[feature.properties[nameProperty]] || 0) + 1;
          }
          break; // point can only be in one region
        }
      }
    }
  });

  return counts;
}

/**
 * Determine if all points are concentrated in Lima
 */
export function isLimaFocused(points: { lat: number; lng: number }[]): boolean {
  if (!points || points.length === 0) return true; // Default to Lima
  const limaPoints = points.filter(p =>
    Number(p.lat) >= LIMA_BBOX.minLat && Number(p.lat) <= LIMA_BBOX.maxLat &&
    Number(p.lng) >= LIMA_BBOX.minLng && Number(p.lng) <= LIMA_BBOX.maxLng
  );
  return limaPoints.length / points.length >= 0.7; // 70%+ in Lima = Lima focused
}

/**
 * Purple-gradient color scale based on value intensity
 */
export function getChoroplethColor(value: number, maxValue: number): string {
  if (value === 0 || maxValue === 0) return '#f1f5f9'; // Slate-100
  const intensity = value / maxValue;
  if (intensity > 0.8) return '#6d28d9'; // Purple-700
  if (intensity > 0.6) return '#7c3aed'; // Purple-600
  if (intensity > 0.4) return '#8b5cf6'; // Purple-500
  if (intensity > 0.2) return '#a78bfa'; // Purple-400
  return '#c4b5fd'; // Purple-300
}

/**
 * Calculate bounds from an array of points
 */
export function calculateBounds(points: { lat: number; lng: number }[]): [[number, number], [number, number]] | null {
  if (!points || points.length === 0) return null;
  let minLat = Infinity, maxLat = -Infinity;
  let minLng = Infinity, maxLng = -Infinity;
  points.forEach(p => {
    const lat = Number(p.lat);
    const lng = Number(p.lng);
    if (lat < minLat) minLat = lat;
    if (lat > maxLat) maxLat = lat;
    if (lng < minLng) minLng = lng;
    if (lng > maxLng) maxLng = lng;
  });
  // Add a small padding
  const pad = 0.1;
  return [[minLat - pad, minLng - pad], [maxLat + pad, maxLng + pad]];
}

/**
 * Filter GeoJSON features for Lima province only
 * (NOMBDEP === 'LIMA' for departments, or filter districts by province)
 */
export function filterLimaFeatures(geojson: any, _nameProperty: string): any {
  if (!geojson || !geojson.features) return geojson;

  // For distrital-level data, filter by NOMBPROV to get Lima city and Callao districts
  const limaFeatures = geojson.features.filter((f: any) => {
    const prov = f.properties && f.properties.NOMBPROV ? f.properties.NOMBPROV : '';
    return prov === 'LIMA' || prov === 'CALLAO';
  });

  return {
    ...geojson,
    features: limaFeatures.length > 0 ? limaFeatures : geojson.features
  };
}
