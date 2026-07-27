const CACHE = 'econometrics-lab-v0.1.0';
const SHELL = ['./', './index.html', './styles-core.css', './styles-workspace.css', './styles-pages.css', './app-state.js', './app-data.js', './app-engine.js', './app-results.js', './app-project.js', './manifest.webmanifest', './assets/icon.svg', './data/sample-data.csv'];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key)))).then(() => self.clients.claim()));
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    caches.match(event.request).then((cached) => cached || fetch(event.request).then((response) => {
      const copy = response.clone();
      if (response.ok || response.type === 'opaque') caches.open(CACHE).then((cache) => cache.put(event.request, copy));
      return response;
    }).catch(() => caches.match('./index.html')))
  );
});
