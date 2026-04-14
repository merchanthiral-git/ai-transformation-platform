// Service Worker — cache invalidation on new deploys
// Version is injected at registration time via query param

self.addEventListener("install", () => {
  // Activate immediately, don't wait for old SW to retire
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  // On activation, delete ALL old caches so users get fresh assets
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.map((key) => caches.delete(key)))
    ).then(() => self.clients.claim())
  );
});

// Pass through all fetches — this SW exists purely for cache busting,
// not for offline support or request interception
self.addEventListener("fetch", () => {});
