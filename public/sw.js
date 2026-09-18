const CACHE_NAME = 'smart-barber-v1';

self.addEventListener('install', (event) => {
  console.log('[SW] Instalado con éxito');
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('[SW] Activado y listo para controlar clientes');
  return self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  event.respondWith(fetch(event.request));
});