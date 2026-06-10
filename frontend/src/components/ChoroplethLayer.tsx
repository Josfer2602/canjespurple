import React, { useEffect, useState } from 'react';
import { GeoJSON, useMap } from 'react-leaflet';
import * as turf from '@turf/turf';

interface ChoroplethLayerProps {
  geojsonUrl: string;
  points: { lat: number; lng: number }[];
}

const ChoroplethLayer: React.FC<ChoroplethLayerProps> = ({ geojsonUrl, points }) => {
  const [geoData, setGeoData] = useState<any>(null);
  const [maxCount, setMaxCount] = useState<number>(0);
  const map = useMap();

  useEffect(() => {
    const fetchAndProcess = async () => {
      try {
        const response = await fetch(geojsonUrl);
        const data = await response.json();

        // Crear una FeatureCollection de puntos usando turf
        const turfPoints = turf.featureCollection(
          points.map(p => turf.point([p.lng, p.lat]))
        );

        let maxC = 0;

        // Iterar sobre cada polígono del GeoJSON
        data.features.forEach((feature: any) => {
          // Contar los puntos dentro del polígono
          let count = 0;
          try {
            if (feature.geometry && (feature.geometry.type === 'Polygon' || feature.geometry.type === 'MultiPolygon')) {
              const ptsWithin = turf.pointsWithinPolygon(turfPoints, feature);
              count = ptsWithin.features.length;
            }
          } catch (e) {
            console.error('Error calculando intersección de polígono', e);
          }
          feature.properties = feature.properties || {};
          feature.properties.redemptionCount = count;
          if (count > maxC) maxC = count;
        });

        setMaxCount(maxC);
        setGeoData(data);

        // Ajustar la vista del mapa para que abarque el geojson
        try {
          const bbox = turf.bbox(data);
          // leaflet bounds son [lat, lng], turf bbox es [minX, minY, maxX, maxY]
          map.fitBounds([
            [bbox[1], bbox[0]], // minLat, minLng
            [bbox[3], bbox[2]]  // maxLat, maxLng
          ]);
        } catch (e) {
          console.error("No se pudo auto-centrar el geojson", e);
        }

      } catch (error) {
        console.error('Error cargando GeoJSON:', error);
      }
    };

    if (geojsonUrl && points) {
      fetchAndProcess();
    }
  }, [geojsonUrl, points, map]);

  if (!geoData) return null;

  const getStyle = (feature: any) => {
    const count = feature.properties?.redemptionCount || 0;
    
    // Si no hay canjes, pintar muy tenue
    if (count === 0) {
      return {
        fillColor: '#f1f5f9',
        weight: 1,
        opacity: 1,
        color: '#cbd5e1',
        fillOpacity: 0.2
      };
    }

    // Calcular intensidad basada en el máximo (0 a 1)
    const intensity = maxCount > 0 ? count / maxCount : 0;
    
    let fillColor = '#6b0096'; // brand-purple default
    if (intensity > 0.8) fillColor = '#4a0069'; // muy oscuro
    else if (intensity > 0.6) fillColor = '#6b0096';
    else if (intensity > 0.4) fillColor = '#9333ea';
    else if (intensity > 0.2) fillColor = '#c084fc';
    else fillColor = '#e9d5ff'; // muy claro

    return {
      fillColor,
      weight: 1,
      opacity: 1,
      color: '#ffffff',
      fillOpacity: 0.7
    };
  };

  const onEachFeature = (feature: any, layer: any) => {
    const count = feature.properties?.redemptionCount || 0;
    const name = feature.properties?.name || feature.properties?.NOM_DIST || feature.properties?.NOM_PROV || 'Región';
    
    layer.bindTooltip(`
      <div style="text-align: center;">
        <strong style="font-size: 14px; color: #1e293b;">${name}</strong><br/>
        <span style="font-size: 12px; font-weight: bold; color: #6b0096;">
          ${count} Canje${count !== 1 ? 's' : ''}
        </span>
      </div>
    `, {
      sticky: true,
      className: 'custom-choropleth-tooltip'
    });
  };

  return (
    <GeoJSON
      key={JSON.stringify(geoData)} // Forzar re-render si cambian los datos
      data={geoData}
      style={getStyle}
      onEachFeature={onEachFeature}
    />
  );
};

export default ChoroplethLayer;
