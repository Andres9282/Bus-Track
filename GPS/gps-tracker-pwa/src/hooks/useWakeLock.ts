import { useRef } from 'react';

const getWakeLock = () =>
  typeof navigator !== 'undefined' && 'wakeLock' in navigator
    ? (navigator as Navigator & { wakeLock: { request: (type: 'screen') => Promise<{ release: () => Promise<void> }> } }).wakeLock
    : null;

export function useWakeLock() {
  const sentinelRef = useRef<{ release: () => Promise<void> } | null>(null);

  const request = async () => {
    const wakeLock = getWakeLock();
    if (!wakeLock) return;
    try {
      sentinelRef.current = await wakeLock.request('screen');
    } catch (e) {
      console.warn('Wake Lock request failed', e);
    }
  };

  const release = async () => {
    if (sentinelRef.current) {
      try {
        await sentinelRef.current.release();
      } catch (_) {}
      sentinelRef.current = null;
    }
  };

  return { request, release };
}
