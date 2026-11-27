// Stock Car Manager offline support. Network first, so updates arrive; cache when offline.
const CACHE = 'scm-1.8';
const FILES = [
"./",
"index.html",
"manifest.json",
"css/style.css",
"vendor/three.module.min.js",
"icons/icon-192.png",
"icons/icon-512.png",
"icons/apple-touch-icon.png",
"js/business.js",
"js/career.js",
"js/data.js",
"js/geometry.js",
"js/input.js",
"js/main.js",
"js/pitwall.js",
"js/pixelfont.js",
"js/podium.js",
"js/raceday.js",
"js/racesim.js",
"js/render3d.js",
"js/renderer.js",
"js/settings.js",
"js/sprites.js",
"js/street.js",
"js/tutorial.js",
"js/ui.js",
"js/util.js",
"js/view.js"
];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET' || new URL(e.request.url).origin !== location.origin) return;
  e.respondWith(
    fetch(e.request).then(r => {
      if (r && r.ok) { const copy = r.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); }
      return r;
    }).catch(() => caches.match(e.request, { ignoreSearch: true }).then(m => m || caches.match('index.html')))
  );
});
