// public/sw-propio.js
importScripts("/lib/workbox-v7.4.1/workbox-sw.js");
workbox.setConfig({ modulePathPrefix: "/lib/workbox-v7.4.1/", debug: false });

// Lectura de módulos en nivel superior
const { precacheAndRoute, cleanupOutdatedCaches } = workbox.precaching;
const { registerRoute, setCatchHandler } = workbox.routing;
const { CacheFirst, NetworkFirst, NetworkOnly, StaleWhileRevalidate } = workbox.strategies;
const { ExpirationPlugin } = workbox.expiration;

cleanupOutdatedCaches();
precacheAndRoute([{"revision":"79b4b0893e54849ca8c06ba48ded76b4","url":"index.html"},{"revision":"38bf9b88f88e56cfb65411ea01f3c10e","url":"backoffice.html"},{"revision":"255b94e36df3c246a4cb2a6e7359dddb","url":"offline.html"},{"revision":"dcf388cb29cc1048fac19e8e740a4537","url":"styleguide.html"},{"revision":"533693f93ee02c9aab40385831d3966f","url":"manifest.json"},{"revision":"6bc8ce5ef934b7a60836b6b9f68e25c8","url":"assets/ui-dialog-DjyjkwHD.css"},{"revision":"388e370f76f9687174442189f9066ed1","url":"assets/ui-dialog-BDbWUpKg.js"},{"revision":"b56aa44f99f787dc0df3806b9cc05f58","url":"assets/styleguide-BqrsQu-P.js"},{"revision":"c92e0790b0beb19aa72deb1daee9227c","url":"assets/kpi-card-CLzpt3EB.js"},{"revision":"b99d020fc9050bf01d3a6cac2ee56a70","url":"assets/install-prompt-CwJy6x2o.js"},{"revision":"1e9c7cf8997250ea0c125498aa29320e","url":"assets/index-ZgliZP3B.js"},{"revision":"ec35674f5a599e30d41956032d91541f","url":"assets/booking-stepper-DV36Xe62.js"},{"revision":"8114d5c27c0949e0d0bc099d80881f19","url":"assets/backoffice-BY2UTPQZ.js"},{"revision":"4836ea148892c29f1730baa234c62fa9","url":"icons/launchericon-96x96.png"},{"revision":"e0e18106be09696cfc5480335f7de5a4","url":"icons/launchericon-72x72.png"},{"revision":"42959a3e0244843d1adc7550888e7366","url":"icons/launchericon-512x512.png"},{"revision":"63c48d1c5d163f4011b8b19f12589241","url":"icons/launchericon-48x48.png"},{"revision":"6981daf1e4a024a8ddf56f9a58fff3ed","url":"icons/launchericon-192x192.png"},{"revision":"50d689b81a1a1a22442665adda270877","url":"icons/launchericon-144x144.png"},{"revision":"42959a3e0244843d1adc7550888e7366","url":"icons/icon-512-maskable.png"},{"revision":"6981daf1e4a024a8ddf56f9a58fff3ed","url":"icons/icon-192.png"}]);

// 1. Imágenes e íconos estáticos -> CacheFirst (LCP < 2.5s en 4G, RNF-01)
registerRoute(
  ({ url }) => url.pathname.startsWith("/icons/") || url.pathname.startsWith("/uploads/barberos/"),
  new CacheFirst({
    cacheName: "smartbarber-imagenes",
    plugins: [new ExpirationPlugin({ maxEntries: 40, maxAgeSeconds: 60 * 60 * 24 * 30 })],
  })
);

// 2. Fuentes de Google (Playfair Display, Inter, JetBrains Mono) -> StaleWhileRevalidate
registerRoute(
  ({ url }) => url.origin === "https://fonts.googleapis.com" || url.origin === "https://fonts.gstatic.com",
  new StaleWhileRevalidate({
    cacheName: "smartbarber-fuentes",
    plugins: [new ExpirationPlugin({ maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 365 })],
  })
);

// 3. Disponibilidad en vivo y autenticación -> NetworkOnly (jamás servir slots obsoletos ni tokens)
registerRoute(
  ({ url }) =>
    url.pathname.startsWith("/api/public/disponibilidad") ||
    url.pathname.startsWith("/api/v1/public/disponibilidad") ||
    url.pathname.startsWith("/api/v1/auth/"),
  new NetworkOnly()
);

// 4. Datos públicos Landing y lecturas GET del Backoffice -> NetworkFirst con fallback a caché
registerRoute(
  ({ url, request }) =>
    request.method === "GET" &&
    (url.pathname.startsWith("/api/public/landing") ||
      url.pathname.startsWith("/api/public/info") ||
      url.pathname.startsWith("/api/v1/public/") ||
      url.pathname.startsWith("/api/v1/")),
  new NetworkFirst({
    cacheName: "smartbarber-api",
    networkTimeoutSeconds: 4,
    plugins: [new ExpirationPlugin({ maxEntries: 60, maxAgeSeconds: 60 * 60 * 24 })],
  })
);

// Fallback editorial para navegación offline no precacheada
setCatchHandler(async ({ request }) => {
  if (request.destination === "document") {
    return caches.match("/offline.html");
  }
  return Response.error();
});

// Control de actualización controlada (RF-PWA-08) e invalidación de caché reactiva
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
  if (event.data && event.data.type === "INVALIDATE_API_CACHE") {
    const pattern = event.data.pattern || "";
    event.waitUntil(
      caches.open("smartbarber-api").then(async (cache) => {
        const requests = await cache.keys();
        return Promise.all(
          requests.map((req) => {
            if (!pattern || req.url.includes(pattern)) {
              return cache.delete(req);
            }
          })
        );
      })
    );
  }
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

// ============================================================================
// MANEJADOR DE BACKGROUND SYNC (Outbox Pattern: sync-smartbarber)
// ============================================================================

self.addEventListener("sync", (event) => {
  if (event.tag === "sync-smartbarber") {
    event.waitUntil(vaciarBandejaDesdeSW().then(avisarDeSincronizacion));
  }
});

function abrirDBDesdeSW() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open("smartbarber-db", 2);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function pedirPromesa(req) {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function vaciarBandejaDesdeSW() {
  const db = await abrirDBDesdeSW().catch(() => null);
  if (!db || !db.objectStoreNames.contains("outbox")) return 0;

  const txRead = db.transaction("outbox", "readonly");
  const todos = await pedirPromesa(txRead.objectStore("outbox").getAll());
  const pendientes = todos
    .filter((c) => c.estadoSync === "pendiente")
    .sort((a, b) => a.creadoEn - b.creadoEn);

  let enviados = 0;

  for (const cambio of pendientes) {
    let resp;
    try {
      resp = await fetch("/api/v1/sync/outbox", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(cambio),
      });
    } catch {
      // Error de red: lanzar para que Chromium reprograme el sync con backoff
      throw new Error("Red no disponible durante Background Sync.");
    }

    if (resp.status === 409 || resp.status === 422) {
      // Conflicto de negocio definitivo: marcar para resolución manual en el Backoffice
      const detalle = await resp.json().catch(() => ({ message: "Conflicto de negocio" }));
      const txConf = db.transaction("outbox", "readwrite");
      const store = txConf.objectStore("outbox");
      const reg = await pedirPromesa(store.get(cambio.idCambio));
      if (reg) {
        reg.estadoSync = "conflicto";
        reg.errorConflicto = detalle;
        await pedirPromesa(store.put(reg));
      }
      continue;
    }

    if (!resp.ok) {
      // Error 5xx del servidor: lanzar para que se reintente con backoff
      throw new Error("Error temporal del servidor durante sync: " + resp.status);
    }

    // CRÍTICO: Borrado inmediato por ítem confirmado
    const txDel = db.transaction("outbox", "readwrite");
    await pedirPromesa(txDel.objectStore("outbox").delete(cambio.idCambio));
    enviados++;
  }

  return enviados;
}

async function avisarDeSincronizacion(enviados) {
  if (!enviados || enviados <= 0) return;

  const ventanas = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
  const tieneVentanaVisible = ventanas.some((v) => v.visibilityState === "visible");

  if (tieneVentanaVisible) {
    // Si hay ventana abierta y visible, notificar silenciosamente a la UI
    for (const v of ventanas) {
      v.postMessage({ type: "OUTBOX_SINCRONIZADO", enviados });
    }
  } else {
    // Si no hay ventana visible, mostrar notificación accesible del sistema
    await self.registration.showNotification("SmartBarber", {
      body: `Se sincronizaron ${enviados} cambio(s) offline con el servidor.`,
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
      tag: "sync-completado",
      data: { url: "/backoffice.html#agenda" },
    });
  }
}

// ============================================================================
// MANEJADORES DE PUSH NOTIFICATIONS Y CLIC (VAPID RFC 8292)
// ============================================================================

self.addEventListener("push", (event) => {
  let datos = {
    titulo: "SmartBarber",
    cuerpo: "Tienes una novedad operativa en tu barbería.",
    tag: "smartbarber-aviso",
    url: "/backoffice.html#agenda",
  };

  try {
    if (event.data) datos = { ...datos, ...event.data.json() };
  } catch {
    if (event.data) datos.cuerpo = event.data.text();
  }

  event.waitUntil(
    self.registration.showNotification(datos.titulo, {
      body: datos.cuerpo,
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
      tag: datos.tag,
      data: { url: datos.url },
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const destino = new URL(event.notification.data?.url ?? "/backoffice.html", self.location.origin).href;

  event.waitUntil(
    (async () => {
      const ventanas = await clients.matchAll({ type: "window", includeUncontrolled: true });
      const abierta = ventanas.find((v) => new URL(v.url).origin === self.location.origin);
      if (abierta) {
        if ("navigate" in abierta) await abierta.navigate(destino);
        return abierta.focus();
      }
      return clients.openWindow(destino);
    })()
  );
});
