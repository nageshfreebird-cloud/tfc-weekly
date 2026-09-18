const CACHE_NAME = 'tfc-v4';
const ASSETS = ['/', '/index.html', '/css/style.css', '/js/ui.js', '/logo.webp'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE_NAME).then(c => c.addAll(ASSETS)));
});

self.addEventListener('fetch', e => {
  e.respondWith(
    fetch(e.request).catch(() => caches.match(e.request))
  );
});
