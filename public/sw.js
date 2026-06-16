// Cleanup service worker: unregister itself and clear caches.
self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      // Clear all caches
      const cacheNames = await caches.keys();
      for (const name of cacheNames) {
        await caches.delete(name);
      }

      // Unregister this service worker
      if (self.registration) {
        await self.registration.unregister();
      }
    })()
  );
  self.clients.claim();
});
