'use client';

import { useEffect } from 'react';

export function ServiceWorkerCleanup() {
  useEffect(() => {
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) {
      return;
    }

    async function cleanup() {
      try {
        const registrations = await navigator.serviceWorker.getRegistrations();
        for (const registration of registrations) {
          await registration.unregister();
        }

        if ('caches' in window) {
          const cacheNames = await caches.keys();
          for (const name of cacheNames) {
            await caches.delete(name);
          }
        }
      } catch (error) {
        console.error('Service worker cleanup failed:', error);
      }
    }

    cleanup();
  }, []);

  return null;
}
