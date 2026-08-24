// Lineage service worker — network-first so the app is always up to date when online,
// with offline fallback to cache.
const CACHE = 'lineage-v14';

self.addEventListener('install', event => {
  self.skipWaiting();  // activate the new worker immediately
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const req = event.request;

  // Never intercept the activation server calls — always network.
  if (req.url.includes('/activate') || req.url.includes('workers.dev')) {
    return;
  }

  // NETWORK-FIRST: try to get the freshest version from the network.
  // If online, use and cache the latest. If offline, fall back to the cached copy.
  event.respondWith(
    fetch(req).then(res => {
      // Save a fresh copy for offline use
      if (req.method === 'GET' && res.status === 200 && res.type === 'basic') {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(req, copy));
      }
      return res;
    }).catch(() => {
      // Offline: serve from cache if we have it
      return caches.match(req);
    })
  );
});
