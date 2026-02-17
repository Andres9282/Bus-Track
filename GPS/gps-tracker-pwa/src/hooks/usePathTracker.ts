import { useState, useEffect, useRef, useCallback } from 'react';

export interface Position {
  lat: number;
  lng: number;
  timestamp: number;
  isStationary?: boolean;
  durationAtStop?: number;
  /** false = misma parada que la anterior (debounce); true o undefined = nueva parada */
  stopSegmentStart?: boolean;
}

export interface UserInfo {
  name: string;
  dui: string;
}

const MIN_DISTANCE_METERS = 2;
const MIN_TIME_MS = 5000;
const MAX_ACCURACY_METERS = 25;
const STATIONARY_RADIUS_METERS = 5;
const MIN_STATIONARY_DURATION_MS = 45 * 1000;
const STOP_DEBOUNCE_MS = 10 * 1000;
const SYNC_POINTS_INTERVAL = 10;

function getDistanceFromLatLonInM(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371;
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c * 1000;
}

function deg2rad(deg: number) {
  return deg * (Math.PI / 180);
}

export function usePathTracker(
  onSyncTemporaryPoints?: (draftId: string, path: Position[]) => Promise<void>
) {
  const [positions, setPositions] = useState<Position[]>([]);
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [savedUsers, setSavedUsers] = useState<UserInfo[]>([]);
  const [isTracking, setIsTracking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const lastPositionRef = useRef<Position | null>(null);
  const watchIdRef = useRef<number | null>(null);
  const stationarySinceRef = useRef<number | null>(null);
  const lastStopEndTimeRef = useRef<number | null>(null);
  const draftIdRef = useRef<string | null>(null);
  const lastSyncedCountRef = useRef(0);

  const syncTemporary = useCallback(async (draftId: string | null, path: Position[]) => {
    if (path.length === 0 || !draftId || !onSyncTemporaryPoints) return;
    try {
      await onSyncTemporaryPoints(draftId, path);
      lastSyncedCountRef.current = path.length;
    } catch (e) {
      console.error('Failed to sync temporary points', e);
    }
  }, [onSyncTemporaryPoints]);

  useEffect(() => {
    const savedPath = localStorage.getItem('gps-path');
    const savedUser = localStorage.getItem('gps-user');

    if (savedUser) {
      try {
        setUserInfo(JSON.parse(savedUser));
      } catch (e) {
        console.error("Failed to parse user info", e);
      }
    }

    if (savedPath) {
      try {
        const parsed: Position[] = JSON.parse(savedPath);
        setPositions(parsed);
        if (parsed.length > 0) {
          lastPositionRef.current = parsed[parsed.length - 1];
        }
      } catch (e) {
        console.error("Failed to load path from local storage", e);
      }
    }
  }, []);

  const saveUserInfo = (info: UserInfo) => {
    setUserInfo(info);
    localStorage.setItem('gps-user', JSON.stringify(info));
    setSavedUsers(prev => {
      const exists = prev.some(u => u.dui === info.dui);
      if (!exists) {
        const newHistory = [...prev, info];
        localStorage.setItem('gps-users-list', JSON.stringify(newHistory));
        return newHistory;
      }
      return prev;
    });
  };

  useEffect(() => {
    localStorage.setItem('gps-path', JSON.stringify(positions));
    const n = positions.length;
    if (onSyncTemporaryPoints && n > 0 && n >= lastSyncedCountRef.current + SYNC_POINTS_INTERVAL) {
      syncTemporary(draftIdRef.current, positions);
    }
  }, [positions, onSyncTemporaryPoints, syncTemporary]);

  const startTracking = () => {
    if (!navigator.geolocation) {
      setError("Geolocation is not supported by your browser");
      return;
    }

    setIsTracking(true);
    setError(null);
    stationarySinceRef.current = null;
    lastStopEndTimeRef.current = null;
    draftIdRef.current = crypto.randomUUID ? crypto.randomUUID() : `draft-${Date.now()}`;
    lastSyncedCountRef.current = 0;

    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        const accuracy = position.coords.accuracy ?? Infinity;
        if (accuracy > MAX_ACCURACY_METERS) return;

        const { latitude, longitude } = position.coords;
        const timestamp = position.timestamp;
        const timeNow = typeof timestamp === 'number' ? timestamp : Date.now();

        if (!lastPositionRef.current) {
          const newPos: Position = {
            lat: latitude,
            lng: longitude,
            timestamp: timeNow,
            isStationary: false,
            durationAtStop: 0
          };
          setPositions(prev => [...prev, newPos]);
          lastPositionRef.current = newPos;
          return;
        }

        const lastPos = lastPositionRef.current;
        const distance = getDistanceFromLatLonInM(lastPos.lat, lastPos.lng, latitude, longitude);
        const timeDiff = timeNow - lastPos.timestamp;

        if (distance < STATIONARY_RADIUS_METERS) {
          if (stationarySinceRef.current === null) {
            stationarySinceRef.current = lastPos.timestamp;
          }
          const stationaryDuration = timeNow - stationarySinceRef.current;
          if (stationaryDuration >= MIN_STATIONARY_DURATION_MS) {
            const durationAtStop = stationaryDuration / 1000;
            const mergedWithPrevious =
              lastStopEndTimeRef.current !== null &&
              (timeNow - lastStopEndTimeRef.current) < STOP_DEBOUNCE_MS;
            lastStopEndTimeRef.current = null;
            stationarySinceRef.current = timeNow;

            const newPos: Position = {
              lat: latitude,
              lng: longitude,
              timestamp: timeNow,
              isStationary: true,
              durationAtStop,
              stopSegmentStart: !mergedWithPrevious
            };
            setPositions(prev => [...prev, newPos]);
            lastPositionRef.current = newPos;
          }
          return;
        }

        if (lastPos.isStationary) {
          lastStopEndTimeRef.current = timeNow;
        }
        stationarySinceRef.current = null;

        if (timeDiff > MIN_TIME_MS || distance > MIN_DISTANCE_METERS) {
          const newPos: Position = {
            lat: latitude,
            lng: longitude,
            timestamp: timeNow,
            isStationary: false,
            durationAtStop: 0
          };
          setPositions(prev => [...prev, newPos]);
          lastPositionRef.current = newPos;
        }
      },
      (err) => {
        setError(err.message);
      },
      {
        enableHighAccuracy: true,
        timeout: 20000,
        maximumAge: 0
      }
    );
  };

  const stopTracking = () => {
    setIsTracking(false);
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    draftIdRef.current = null;
  };

  const clearPath = () => {
    setPositions([]);
    localStorage.removeItem('gps-path');
    lastPositionRef.current = null;
    stationarySinceRef.current = null;
    lastStopEndTimeRef.current = null;
    lastSyncedCountRef.current = 0;
  };

  const exportData = () => {
    const exportObject = {
      user: userInfo,
      path: positions
    };
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(exportObject, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", `gps_path_${userInfo?.dui || 'anon'}.json`);
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  const stopsDetected = (() => {
    let count = 0;
    for (let i = 0; i < positions.length; i++) {
      if (positions[i].isStationary && positions[i].stopSegmentStart === true) count++;
    }
    return count;
  })();

  return {
    positions,
    isTracking,
    userInfo,
    savedUsers,
    saveUserInfo,
    error,
    startTracking,
    stopTracking,
    clearPath,
    exportData,
    stopsDetected
  };
}
