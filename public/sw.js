// public/sw-propio.js
importScripts("/lib/workbox-v7.4.1/workbox-sw.js");
workbox.setConfig({ modulePathPrefix: "/lib/workbox-v7.4.1/", debug: false });

// Lectura de módulos en nivel superior
const { precacheAndRoute, cleanupOutdatedCaches } = workbox.precaching;
const { registerRoute, setCatchHandler } = workbox.routing;
const { CacheFirst, NetworkFirst, NetworkOnly, StaleWhileRevalidate } = workbox.strategies;
const { ExpirationPlugin } = workbox.expiration;

cleanupOutdatedCaches();
precacheAndRoute([{"revision":"0fced93491811524b657f9260edec65a","url":"index.html"},{"revision":"f22d221a4d725ec08405cd6956250cc1","url":"backoffice.html"},{"revision":"255b94e36df3c246a4cb2a6e7359dddb","url":"offline.html"},{"revision":"dc923b114a31bf44cb8c6089094d0d43","url":"styleguide.html"},{"revision":"533693f93ee02c9aab40385831d3966f","url":"manifest.json"},{"revision":"6b20840d89c2f64f4741486ef6e248f8","url":"assets/ui-dialog-Dju8F_L8.css"},{"revision":"1e86c8c5428e522a24a00343a9f753cd","url":"assets/ui-dialog-CiIMnK7o.js"},{"revision":"dcb489e19ec68f60df7e9230ef4acf7d","url":"assets/styleguide-BjkK0Ysr.js"},{"revision":"e9dabe013743d4304e7da1cd450f7137","url":"assets/status-badge-CKGoXOPm.js"},{"revision":"5147d4ba1a90cecc9092a1cee2be22cb","url":"assets/install-prompt-Fu7aH7e9.js"},{"revision":"bb5381a541890de8e1dd8ddbda215ceb","url":"assets/index-CGAd_O99.js"},{"revision":"912efa9c1d76c16b8a765c05217caaa6","url":"assets/booking-stepper-DJ10ppAF.js"},{"revision":"51d22ab41b75cb05390a92d965bd1908","url":"assets/backoffice-B1491kY8.js"},{"revision":"4836ea148892c29f1730baa234c62fa9","url":"icons/launchericon-96x96.png"},{"revision":"e0e18106be09696cfc5480335f7de5a4","url":"icons/launchericon-72x72.png"},{"revision":"42959a3e0244843d1adc7550888e7366","url":"icons/launchericon-512x512.png"},{"revision":"63c48d1c5d163f4011b8b19f12589241","url":"icons/launchericon-48x48.png"},{"revision":"6981daf1e4a024a8ddf56f9a58fff3ed","url":"icons/launchericon-192x192.png"},{"revision":"50d689b81a1a1a22442665adda270877","url":"icons/launchericon-144x144.png"},{"revision":"42959a3e0244843d1adc7550888e7366","url":"icons/icon-512-maskable.png"},{"revision":"6981daf1e4a024a8ddf56f9a58fff3ed","url":"icons/icon-192.png"}]);

const isSameOrigin = (url) => url.origin === self.location.origin;

// 1. Imágenes e íconos estáticos -> CacheFirst (LCP < 2.5s en 4G, RNF-01)
registerRoute(
  ({ url }) =>
    isSameOrigin(url) &&
    (url.pathname.startsWith("/icons/") || url.pathname.startsWith("/uploads/barberos/")),
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
    isSameOrigin(url) &&
    (url.pathname.startsWith("/api/public/disponibilidad") ||
      url.pathname.startsWith("/api/v1/public/disponibilidad") ||
      url.pathname.startsWith("/api/v1/auth/")),
  new NetworkOnly()
);

// 4. Datos públicos Landing y lecturas GET del Backoffice -> NetworkFirst con fallback a caché
registerRoute(
  ({ url, request }) =>
    isSameOrigin(url) &&
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

// Fallback editorial para navegación offline y respuesta controlada 503 para API sin red
setCatchHandler(async ({ request, url }) => {
  if (request.destination === "document") {
    return caches.match("/offline.html");
  }
  const reqUrl = url || new URL(request.url);
  if (isSameOrigin(reqUrl) && reqUrl.pathname.startsWith("/api/")) {
    return new Response(
      JSON.stringify({
        success: false,
        error: {
          code: "OFFLINE_OR_UNREACHABLE",
          message: "Servidor no disponible o dispositivo sin conexión a internet."
        }
      }),
      {
        status: 503,
        statusText: "Service Unavailable",
        headers: { "Content-Type": "application/json" }
      }
    );
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
    if (event.data) {
      const parsed = event.data.json();
      datos = { ...datos, ...parsed };
    }
  } catch {
    if (event.data) {
      datos.cuerpo = event.data.text();
    }
  }

  const opciones = {
    body: datos.cuerpo,
    icon: "/icons/icon-192.png",
    badge: "/icons/icon-192.png",
    tag: datos.tag,
    renotify: true,
    vibrate: [100, 50, 100],
    data: {
      url: datos.url || "/backoffice.html#agenda",
    },
  };

  event.waitUntil(self.registration.showNotification(datos.titulo, opciones));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const destinoUrl = event.notification.data?.url || "/backoffice.html#agenda";
  const destino = new URL(destinoUrl, self.location.origin).href;

  event.waitUntil(
    (async () => {
      const ventanas = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      const abierta = ventanas.find((v) => new URL(v.url).origin === self.location.origin);
      if (abierta) {
        if ("navigate" in abierta) {
          await abierta.navigate(destino);
        }
        return abierta.focus();
      }
      return self.clients.openWindow(destino);
    })()
  );
});
