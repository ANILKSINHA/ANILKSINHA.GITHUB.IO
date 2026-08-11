// Lineage service worker — caches the app shell so it works offline and is installable.
const CACHE = 'lineage-v7';
const APP_FILES = [
  '.',
  'index.html'
];

self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE).then(cache => cache.addAll(APP_FILES).catch(()=>{}))
  );
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
  // Never cache the activation server calls — those must go to the network.
  if (req.url.includes('/activate') || req.url.includes('workers.dev')) {
    return; // let it hit the network normally
  }
  // For the app itself: cache-first, falling back to network.
  event.respondWith(
    caches.match(req).then(cached => cached || fetch(req).then(res => {
      // Cache same-origin GET responses for offline use
      if (req.method === 'GET' && res.status === 200 && res.type === 'basic') {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(req, copy));
      }
      return res;
    }).catch(() => cached))
  );
});
