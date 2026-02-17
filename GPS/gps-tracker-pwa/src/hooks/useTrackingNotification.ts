import { useEffect, useRef } from 'react';

const NOTIFICATION_TAG = 'bus-tracker-tracking';

export function useTrackingNotification(isTracking: boolean) {
  const notificationRef = useRef<Notification | null>(null);

  useEffect(() => {
    if (!isTracking) {
      if (notificationRef.current) {
        try {
          notificationRef.current.close();
        } catch (_) {}
        notificationRef.current = null;
      }
      return;
    }

    let cancelled = false;

    const show = async () => {
      if (!('Notification' in window)) return;
      if (Notification.permission === 'granted') {
        try {
          await navigator.serviceWorker?.ready;
          const reg = await navigator.serviceWorker.getRegistration();
          if (reg?.showNotification && !cancelled) {
            await reg.showNotification('Bus Tracker', {
              tag: NOTIFICATION_TAG,
              body: 'Rastreo en curso. Mantén la app en primer plano para mejor precisión.',
              icon: '/vite.svg',
              requireInteraction: true
            });
          } else if (!cancelled) {
            notificationRef.current = new Notification('Bus Tracker', {
              tag: NOTIFICATION_TAG,
              body: 'Rastreo en curso.',
              requireInteraction: true
            });
          }
        } catch (e) {
          if (!cancelled && Notification.permission === 'granted') {
            notificationRef.current = new Notification('Bus Tracker', {
              body: 'Rastreo en curso.',
              requireInteraction: true
            });
          }
        }
      } else if (Notification.permission === 'default') {
        const perm = await Notification.requestPermission();
        if (perm === 'granted' && !cancelled) show();
      }
    };

    show();
    return () => {
      cancelled = true;
      if (notificationRef.current) {
        try {
          notificationRef.current.close();
        } catch (_) {}
        notificationRef.current = null;
      }
    };
  }, [isTracking]);
}
