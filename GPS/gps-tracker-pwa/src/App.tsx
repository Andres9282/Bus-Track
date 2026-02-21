import { useState, useEffect, useRef, useCallback } from 'react';
import { usePathTracker } from './hooks/usePathTracker';
import { useWakeLock } from './hooks/useWakeLock';
import { useTrackingNotification } from './hooks/useTrackingNotification';
import MapTracker from './components/MapTracker';
import RegistrationModal from './components/RegistrationModal';
import TripCompleteModal from './components/TripCompleteModal';
import AdminDashboard from './components/AdminDashboard';
import { uploadTrip, saveTemporaryPoints } from './services/tripService';
import type { RouteMetadata } from './services/tripService';
import './App.css';

function formatElapsed(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

function App() {
  const { request: requestWakeLock, release: releaseWakeLock } = useWakeLock();

  const onSyncTemporary = useCallback(async (draftId: string, path: Parameters<typeof saveTemporaryPoints>[2]) => {
    const user = localStorage.getItem('gps-user');
    if (!user) return;
    const parsed = JSON.parse(user) as { name: string; dui: string; phone: string; password?: string };
    await saveTemporaryPoints(draftId, parsed, path);
  }, []);

  const {
    positions,
    isTracking,
    userInfo,
    savedUsers,
    saveUserInfo,
    error,
    startTracking,
    stopTracking,
    clearPath,
    stopsDetected
  } = usePathTracker(onSyncTemporary);

  useTrackingNotification(isTracking);

  const [showDashboard, setShowDashboard] = useState(false);
  const [showTripCompleteModal, setShowTripCompleteModal] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const tripStartRef = useRef<number | null>(null);

  const currentPosition = positions.length > 0 ? positions[positions.length - 1] : undefined;

  useEffect(() => {
    if (!isTracking) return;
    tripStartRef.current = Date.now();
    setElapsedSeconds(0);
    const interval = setInterval(() => {
      if (tripStartRef.current) {
        setElapsedSeconds(Math.floor((Date.now() - tripStartRef.current) / 1000));
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [isTracking]);

  useEffect(() => {
    if (!isTracking) return;
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        requestWakeLock();
      }
    };
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => document.removeEventListener('visibilitychange', onVisibilityChange);
  }, [isTracking, requestWakeLock]);

  const handleStartTracking = () => {
    startTracking();
    requestWakeLock();
  };

  const handleStopTracking = () => {
    stopTracking();
    releaseWakeLock();
    if (positions.length > 0) {
      setShowTripCompleteModal(true);
    }
  };

  const handleTripCompleteConfirm = async (metadata: RouteMetadata) => {
    if (!userInfo || positions.length === 0) return;
    setIsUploading(true);
    try {
      await uploadTrip(userInfo, positions, metadata);
      setShowTripCompleteModal(false);
      clearPath();
    } catch (e) {
      console.error(e);
      alert('Error al subir el viaje. Intenta de nuevo.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleTripCompleteCancel = () => {
    setShowTripCompleteModal(false);
  };

  return (
    <div className="app-container">
      <RegistrationModal isOpen={!userInfo} onSave={saveUserInfo} savedUsers={savedUsers} />

      <TripCompleteModal
        isOpen={showTripCompleteModal}
        pointCount={positions.length}
        onConfirm={handleTripCompleteConfirm}
        onCancel={handleTripCompleteCancel}
        isUploading={isUploading}
      />

      {showDashboard && <AdminDashboard onClose={() => setShowDashboard(false)} />}

      <div className="map-wrapper">
        <MapTracker positions={positions} currentPosition={currentPosition} isTracking={isTracking} />
      </div>

      <div className="controls-overlay">
        <div className="glass-panel">
          <div className="controls-header">
            <h1>Bus Tracker</h1>
            <button
              type="button"
              className="btn btn-outline btn-admin"
              onClick={() => setShowDashboard(true)}
            >
              Admin
            </button>
          </div>
          {userInfo && (
            <div className="user-info-badge">{userInfo.name} ({userInfo.dui})</div>
          )}

          {error && <div className="error-message">{error}</div>}

          {!isTracking ? (
            <div className="start-section">
              <button
                type="button"
                className="btn btn-primary btn-start"
                onClick={handleStartTracking}
              >
                Iniciar rastreo
              </button>
              {positions.length > 0 && (
                <p className="resume-hint">Hay un camino guardado. Iniciar borrará o añadirá puntos.</p>
              )}
            </div>
          ) : (
            <div className="trip-in-progress">
              <div className="trip-timer">{formatElapsed(elapsedSeconds)}</div>
              <div className="stats">
                <span>Puntos: {positions.length}</span>
                <span>Paradas: {stopsDetected}</span>
              </div>
              <span className="badge pulsing">En ruta</span>
              <button type="button" className="btn btn-danger btn-stop" onClick={handleStopTracking}>
                Finalizar viaje
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
