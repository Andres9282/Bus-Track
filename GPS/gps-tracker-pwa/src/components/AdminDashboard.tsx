import { useEffect, useState } from 'react';
import { getTrips, getTripRoute, type TripMetadata } from '../services/tripService';
import type { Position } from '../hooks/usePathTracker';

interface AdminDashboardProps {
    onClose: () => void;
}

interface UserGroup {
    dui: string;
    name: string;
    phone: string;
    password?: string;
    totalPoints: number;
    trips: TripMetadata[];
}

export default function AdminDashboard({ onClose }: AdminDashboardProps) {
    const [loadingList, setLoadingList] = useState(true);
    const [userGroups, setUserGroups] = useState<UserGroup[]>([]);
    const [tripPaths, setTripPaths] = useState<Record<string, Position[]>>({});
    const [loadingPaths, setLoadingPaths] = useState<Record<string, boolean>>({});

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoadingList(true);
        try {
            const data = await getTrips();
            const groups: Record<string, UserGroup> = {};

            for (const trip of data) {
                const { dui, name, phone, password } = trip.user;
                if (!groups[dui]) {
                    groups[dui] = {
                        dui,
                        name,
                        phone: phone || 'N/A',
                        password: password || 'N/A',
                        totalPoints: 0,
                        trips: []
                    };
                }
                groups[dui].trips.push(trip);
                groups[dui].totalPoints += trip.pointCount;
            }

            // Sort groups by totalPoints descending
            const sortedGroups = Object.values(groups).sort((a, b) => b.totalPoints - a.totalPoints);

            // Sort trips inside each group by startTime ascending (1, 2, ..., n)
            sortedGroups.forEach(g => {
                g.trips.sort((a, b) => a.startTime - b.startTime);
            });

            setUserGroups(sortedGroups);
        } catch (e) {
            console.error("Failed to load trips", e);
        } finally {
            setLoadingList(false);
        }
    };

    const loadCoordinates = async (tripId: string) => {
        if (!tripId || tripPaths[tripId]) return;
        setLoadingPaths(prev => ({ ...prev, [tripId]: true }));
        try {
            const path = await getTripRoute(tripId);
            setTripPaths(prev => ({ ...prev, [tripId]: path }));
        } catch (error) {
            console.error(error);
        } finally {
            setLoadingPaths(prev => ({ ...prev, [tripId]: false }));
        }
    };

    return (
        <div className="dashboard-overlay">
            <div className="dashboard-container glass-panel" style={{ maxWidth: '900px', width: '95%' }}>
                <div className="dashboard-header">
                    <h2>Admin Dashboard</h2>
                    <button className="btn btn-outline" onClick={onClose}>Close</button>
                </div>

                <div className="dashboard-content" style={{ display: 'block', overflowY: 'auto' }}>
                    {loadingList ? <p>Cargando datos...</p> : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', paddingBottom: '2rem' }}>
                            {userGroups.map((group) => (
                                <div key={group.dui} className="user-group" style={{
                                    background: 'rgba(255, 255, 255, 0.05)',
                                    padding: '1.5rem',
                                    borderRadius: '8px',
                                    border: '1px solid rgba(255, 255, 255, 0.1)'
                                }}>
                                    <h3 style={{ marginBottom: '1rem', color: '#4ade80' }}>
                                        USUARIO "{group.name}", CONTRASEÑA: "{group.password}", TELEFONO: "{group.phone}" <br />
                                        <small style={{ color: '#aaa', fontSize: '0.9rem' }}>(Total Datos: {group.totalPoints})</small>
                                    </h3>

                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                                        {group.trips.map((trip, tIndex) => {
                                            const tripNum = tIndex + 1;
                                            const startTimeStr = trip.tripStartTime
                                                ? trip.tripStartTime.toDate().toLocaleString('es-SV')
                                                : new Date(trip.startTime).toLocaleString('es-SV');
                                            const endTimeStr = trip.uploadedAt.toDate().toLocaleString('es-SV');
                                            const hasCoords = !!tripPaths[trip.id!] || trip.pointCount === 0;
                                            const isLoadingCoords = loadingPaths[trip.id!];

                                            return (
                                                <div key={trip.id} style={{ padding: '1rem', background: 'rgba(0,0,0,0.2)', borderRadius: '6px' }}>
                                                    <div style={{ marginBottom: '0.5rem' }}>
                                                        <strong>TIEMPO DE INICIO(viaje {tripNum}): </strong> "{startTimeStr}"
                                                    </div>

                                                    <div style={{ marginBottom: '0.5rem' }}>
                                                        <strong>COORDENADAS(viaje {tripNum}): </strong>
                                                        {!hasCoords && !isLoadingCoords && (
                                                            <button
                                                                className="btn btn-primary btn-sm"
                                                                style={{ padding: '0.25rem 0.5rem', fontSize: '0.8rem' }}
                                                                onClick={() => loadCoordinates(trip.id!)}
                                                            >
                                                                Cargar {trip.pointCount} coordenadas
                                                            </button>
                                                        )}
                                                        {isLoadingCoords && <span>Cargando...</span>}
                                                        {hasCoords && tripPaths[trip.id!] && (
                                                            <div style={{
                                                                maxHeight: '150px',
                                                                overflowY: 'auto',
                                                                background: '#111',
                                                                padding: '0.5rem',
                                                                marginTop: '0.5rem',
                                                                fontSize: '0.85rem',
                                                                fontFamily: 'monospace'
                                                            }}>
                                                                "[{tripPaths[trip.id!].map(p => `[${p.lat.toFixed(5)}, ${p.lng.toFixed(5)}]`).join(', ')}]"
                                                            </div>
                                                        )}
                                                    </div>

                                                    <div>
                                                        <strong>TIEMPO FINAL(viaje {tripNum}): </strong> "{endTimeStr}"
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            ))}
                            {userGroups.length === 0 && <p>No hay datos registrados.</p>}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
