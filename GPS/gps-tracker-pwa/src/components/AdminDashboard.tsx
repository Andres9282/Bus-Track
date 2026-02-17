
import { useEffect, useState } from 'react';
import { getTrips, getTripRoute, type TripMetadata } from '../services/tripService';
import { MapContainer, TileLayer, Polyline, Marker, Popup } from 'react-leaflet';
import type { Position } from '../hooks/usePathTracker';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix for default marker icon in Leaflet with Webpack/Vite (copied from MapTracker)
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    iconSize: [25, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

interface AdminDashboardProps {
    onClose: () => void;
}

export default function AdminDashboard({ onClose }: AdminDashboardProps) {
    const [trips, setTrips] = useState<TripMetadata[]>([]);
    const [selectedTrip, setSelectedTrip] = useState<TripMetadata | null>(null);
    const [selectedTripPath, setSelectedTripPath] = useState<Position[]>([]);
    const [loadingList, setLoadingList] = useState(true);
    const [loadingMap, setLoadingMap] = useState(false);

    useEffect(() => {
        loadTrips();
    }, []);

    const loadTrips = async () => {
        setLoadingList(true);
        try {
            const data = await getTrips();
            setTrips(data);
        } catch (e) {
            console.error("Failed to load trips", e);
        } finally {
            setLoadingList(false);
        }
    };

    const handleSelectTrip = async (trip: TripMetadata) => {
        if (selectedTrip?.id === trip.id) return;

        setSelectedTrip(trip);
        setSelectedTripPath([]); // Clear previous path immediately
        setLoadingMap(true);

        try {
            if (trip.id) {
                const path = await getTripRoute(trip.id);
                setSelectedTripPath(path);
            }
        } catch (e) {
            console.error("Failed to load trip route", e);
        } finally {
            setLoadingMap(false);
        }
    };

    return (
        <div className="dashboard-overlay">
            <div className="dashboard-container glass-panel">
                <div className="dashboard-header">
                    <h2>Admin Dashboard</h2>
                    <button className="btn btn-outline" onClick={onClose}>Close</button>
                </div>

                <div className="dashboard-content">
                    <div className="trip-list">
                        <h3>Recorded Trips</h3>
                        {loadingList ? <p>Loading list...</p> : (
                            <div className="list-scroll">
                                {trips.map(trip => (
                                    <div
                                        key={trip.id}
                                        className={`trip-item ${selectedTrip?.id === trip.id ? 'active' : ''}`}
                                        onClick={() => handleSelectTrip(trip)}
                                    >
                                        <strong>{trip.user.name}</strong>
                                        <small>{trip.user.dui}</small>
                                        {trip.routeName && <span className="route-name">{trip.routeName}</span>}
                                        <span className="timestamp">{trip.uploadedAt.toDate().toLocaleString()}</span>
                                        <span className="timestamp" style={{ fontSize: '0.7rem' }}>
                                            Points: {trip.pointCount} | {(trip.duration / 60).toFixed(1)} mins
                                        </span>
                                    </div>
                                ))}
                                {trips.length === 0 && <p>No trips found.</p>}
                            </div>
                        )}
                    </div>

                    <div className="trip-map-view">
                        {selectedTrip ? (
                            <div className="map-view-container">
                                <div className="trip-details">
                                    <h4>Trip Details</h4>
                                    <p><strong>User:</strong> {selectedTrip.user.name}</p>
                                    <p><strong>Duration:</strong> {(selectedTrip.duration / 60).toFixed(2)} mins</p>
                                    <p><strong>Points:</strong> {selectedTrip.pointCount}</p>
                                </div>

                                {loadingMap ? (
                                    <div className="placeholder">
                                        <p>Loading full path data...</p>
                                    </div>
                                ) : (
                                    selectedTripPath.length > 0 ? (
                                        <MapContainer
                                            center={[selectedTripPath[0].lat, selectedTripPath[0].lng]}
                                            zoom={15}
                                            style={{ height: '300px', width: '100%', borderRadius: '0.5rem' }}
                                        >
                                            <TileLayer
                                                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                            />
                                            <Polyline positions={selectedTripPath.map(p => [p.lat, p.lng])} color="blue" weight={4} />
                                            <Marker position={[selectedTripPath[0].lat, selectedTripPath[0].lng]}>
                                                <Popup>Start</Popup>
                                            </Marker>
                                            <Marker position={[selectedTripPath[selectedTripPath.length - 1].lat, selectedTripPath[selectedTripPath.length - 1].lng]}>
                                                <Popup>End</Popup>
                                            </Marker>
                                        </MapContainer>
                                    ) : (
                                        <div className="placeholder">
                                            <p>No path data available.</p>
                                        </div>
                                    )
                                )}
                            </div>
                        ) : (
                            <div className="placeholder">Select a trip to view map</div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
