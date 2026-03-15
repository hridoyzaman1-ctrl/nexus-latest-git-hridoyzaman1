const CACHE_NAME = 'mindflow-v2.1';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json',
  '/pwa-192.png',
  '/pwa-512.png',
  '/audio/alarm-chime.mp3',
  '/audio/Melody.mp3',
  '/audio/Chill.mp3',
  '/audio/Cafe.mp3',
  '/audio/Peaceful%20Piano.mp3',
  '/audio/Flute.mp3',
  '/audio/Gentle%20Rain.mp3',
  '/audio/Ocean%20Waves.mp3',
  '/audio/Meditation.mp3',
  '/audio/Yoga.mp3',
  '/audio/Quietphase%20Meditation.mp3',
  '/audio/Ambient%20Background.mp3',
  '/audio/Believer.mp3',
  '/audio/Stronger%20Every%20Day.mp3'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // Handle navigation requests (SPA routing)
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() => {
        return caches.match('/index.html') || caches.match('/');
      })
    );
    return;
  }

  // Aggressive Stale-While-Revalidate for all application assets (JS, CSS, images, audio)
  const isAppAsset = 
    url.pathname.match(/\.(js|css|png|jpg|jpeg|gif|svg|ico|mp3|wav|ogg|woff|woff2)$/) || 
    url.pathname.includes('/assets/') ||
    url.origin === self.location.origin;

  if (isAppAsset) {
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        const fetchPromise = fetch(event.request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseToCache));
          }
          return networkResponse;
        });
        return cachedResponse || fetchPromise;
      })
    );
  } else {
    // Network-first with cache fallback for everything else (API calls, etc.)
    event.respondWith(
      fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseToCache));
          }
          return networkResponse;
        })
        .catch(() => caches.match(event.request))
    );
  }
});
