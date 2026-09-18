const CACHE_NAME = 'smart-barber-v1';

const CORE_ASSETS = [
  '/',              
  '/index.html',
  '/manifest.json',
  '/favicon.svg'    
];

self.addEventListener('install', (event) => {
  console.log('[SW] Instalado con éxito');

  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Guardando CORE_ASSETS en caché');
      return cache.addAll(CORE_ASSETS);
    }).then(() => {
      return self.skipWaiting();
    })
  );
});

self.addEventListener('activate', (event) => {
  console.log('[SW] Activado y listo para controlar clientes');
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(event.request);
    })
  );
});