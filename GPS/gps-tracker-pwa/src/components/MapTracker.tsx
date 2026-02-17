import { useCallback, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Polyline, CircleMarker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import type { Position } from '../hooks/usePathTracker';

interface MapTrackerProps {
  positions: Position[];
  currentPosition?: Position;
  isTracking?: boolean;
}

function RecenterControl({ position }: { position?: Position }) {
  const map = useMap();
  const handleRecenter = useCallback(() => {
    if (position) {
      map.setView([position.lat, position.lng], map.getZoom(), { animate: true });
    }
  }, [map, position]);

  if (!position) return null;

  return (
    <div className="map-recenter-wrap">
      <button
        type="button"
        className="map-recenter-btn"
        onClick={handleRecenter}
        aria-label="Centrar en mi ubicación"
        title="Centrar en mi ubicación"
      >
        ◎
      </button>
    </div>
  );
}

function FitBoundsOnTripEnd({ positions, isTracking }: { positions: Position[]; isTracking: boolean }) {
  const map = useMap();
  const wasTrackingRef = useRef(false);

  useEffect(() => {
    const wasTracking = wasTrackingRef.current;
    wasTrackingRef.current = isTracking;

    if (wasTracking && !isTracking && positions.length >= 2) {
      const lats = positions.map(p => p.lat);
      const lngs = positions.map(p => p.lng);
      const bounds: [number, number][] = [
        [Math.min(...lats), Math.min(...lngs)],
        [Math.max(...lats), Math.max(...lngs)]
      ];
      map.fitBounds(bounds, { padding: [24, 24], maxZoom: 17 });
    }
  }, [isTracking, positions, map]);

  return null;
}

export default function MapTracker({ positions, currentPosition, isTracking = false }: MapTrackerProps) {
  const path = positions.map(p => [p.lat, p.lng] as [number, number]);
  const startPosition = positions.length > 0 ? positions[0] : null;
  const stopPositions = positions.filter(p => p.isStationary === true);

  return (
    <MapContainer
      center={currentPosition ? [currentPosition.lat, currentPosition.lng] : positions[0] ? [positions[0].lat, positions[0].lng] : [0, 0]}
      zoom={15}
      style={{ height: '100%', width: '100%' }}
      zoomControl={false}
      className="map-tracker-touch"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      <Polyline positions={path} color="blue" weight={5} opacity={0.7} />

      {stopPositions.map((p, i) => (
        <CircleMarker
          key={`stop-${i}-${p.timestamp}`}
          center={[p.lat, p.lng]}
          radius={8}
          pathOptions={{ color: '#dc2626', fillColor: '#ef4444', fillOpacity: 0.9, weight: 2 }}
        >
          <Popup>
            Parada {p.durationAtStop != null ? `(${Math.round(p.durationAtStop)}s)` : ''}
          </Popup>
        </CircleMarker>
      ))}

      {startPosition && (
        <CircleMarker
          center={[startPosition.lat, startPosition.lng]}
          radius={5}
          pathOptions={{ color: '#16a34a', fillColor: '#22c55e', fillOpacity: 1, weight: 1 }}
        >
          <Popup>Inicio</Popup>
        </CircleMarker>
      )}

      {currentPosition && (
        <CircleMarker
          center={[currentPosition.lat, currentPosition.lng]}
          radius={5}
          pathOptions={{ color: '#2563eb', fillColor: '#3b82f6', fillOpacity: 1, weight: 1 }}
        >
          <Popup>Ubicación actual</Popup>
        </CircleMarker>
      )}

      <RecenterControl position={currentPosition} />
      <FitBoundsOnTripEnd positions={positions} isTracking={isTracking} />
    </MapContainer>
  );
}
