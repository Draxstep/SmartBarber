// public/sw-propio.js
importScripts("/lib/workbox-v7.4.1/workbox-sw.js");
workbox.setConfig({ modulePathPrefix: "/lib/workbox-v7.4.1/", debug: false });

// Lectura de módulos en nivel superior
const { precacheAndRoute, cleanupOutdatedCaches } = workbox.precaching;
const { registerRoute, setCatchHandler } = workbox.routing;
const { CacheFirst, NetworkFirst, NetworkOnly, StaleWhileRevalidate } = workbox.strategies;
const { ExpirationPlugin } = workbox.expiration;
const { CacheableResponsePlugin } = workbox.cacheableResponse;

const CACHE_NAMES = {
  IMAGENES: "smartbarber-imagenes-v2",
  FUENTES: "smartbarber-fuentes-v2",
  API: "smartbarber-api-v2",
};

const LEGACY_RUNTIME_CACHES = [
  "smartbarber-imagenes",
  "smartbarber-fuentes",
  "smartbarber-api",
];

/**
 * Plugin de presupuesto y validación estricta de caché (Cache Budget & MIME Safety):
 * - Rechaza respuestas opacas (status 0 -> padding ~7MB en Chromium)
 * - Valida Content-Type para evitar envenenamiento con HTML 200
 * - Aplica límite máximo de bytes por entrada
 */
function createBudgetedCachePlugin({ allowedMimePrefixes = [], maxBytes = 512 * 1024 } = {}) {
  return {
    cacheWillUpdate: async ({ response }) => {
      if (!response || response.status !== 200 || response.type === "opaque") {
        return null;
      }

      const contentType = (response.headers.get("content-type") || "").toLowerCase();
      if (
        allowedMimePrefixes.length > 0 &&
        !allowedMimePrefixes.some((prefix) => contentType.startsWith(prefix))
      ) {
        return null;
      }

      const contentLengthHeader = response.headers.get("content-length");
      if (contentLengthHeader) {
        const bytes = Number(contentLengthHeader);
        if (!Number.isNaN(bytes) && bytes > maxBytes) {
          return null;
        }
      }

      return response;
    },
  };
}

cleanupOutdatedCaches();
precacheAndRoute(self.__WB_MANIFEST);

const isSameOrigin = (url) => url.origin === self.location.origin;

// 1. Imágenes e íconos estáticos -> CacheFirst acotado (<= 512 KB/imagen, solo image/*)
registerRoute(
  ({ url }) =>
    isSameOrigin(url) &&
    (url.pathname.startsWith("/icons/") || url.pathname.startsWith("/uploads/barberos/")),
  new CacheFirst({
    cacheName: CACHE_NAMES.IMAGENES,
    plugins: [
      new CacheableResponsePlugin({ statuses: [200] }),
      createBudgetedCachePlugin({ allowedMimePrefixes: ["image/"], maxBytes: 512 * 1024 }),
      new ExpirationPlugin({
        maxEntries: 25,
        maxAgeSeconds: 60 * 60 * 24 * 7,
        purgeOnQuotaError: true,
      }),
    ],
  })
);

// 2. Fuentes de Google: CSS (StaleWhileRevalidate) y archivos .woff2 inmutables (CacheFirst), cero respuestas opacas
registerRoute(
  ({ url }) => url.origin === "https://fonts.googleapis.com",
  new StaleWhileRevalidate({
    cacheName: CACHE_NAMES.FUENTES,
    plugins: [
      new CacheableResponsePlugin({ statuses: [200] }),
      new ExpirationPlugin({
        maxEntries: 4,
        maxAgeSeconds: 60 * 60 * 24 * 7,
        purgeOnQuotaError: true,
      }),
    ],
  })
);

registerRoute(
  ({ url }) => url.origin === "https://fonts.gstatic.com",
  new CacheFirst({
    cacheName: CACHE_NAMES.FUENTES,
    plugins: [
      new CacheableResponsePlugin({ statuses: [200] }),
      new ExpirationPlugin({
        maxEntries: 15,
        maxAgeSeconds: 60 * 60 * 24 * 365,
        purgeOnQuotaError: true,
      }),
    ],
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

// 4. Datos públicos Landing y lecturas GET del Backoffice -> NetworkFirst acotado (<= 256 KB, solo JSON)
registerRoute(
  ({ url, request }) =>
    isSameOrigin(url) &&
    request.method === "GET" &&
    (url.pathname.startsWith("/api/public/landing") ||
      url.pathname.startsWith("/api/public/info") ||
      url.pathname.startsWith("/api/v1/public/") ||
      url.pathname.startsWith("/api/v1/")),
  new NetworkFirst({
    cacheName: CACHE_NAMES.API,
    networkTimeoutSeconds: 4,
    plugins: [
      new CacheableResponsePlugin({ statuses: [200] }),
      createBudgetedCachePlugin({ allowedMimePrefixes: ["application/json"], maxBytes: 256 * 1024 }),
      new ExpirationPlugin({
        maxEntries: 25,
        maxAgeSeconds: 60 * 60 * 6,
        purgeOnQuotaError: true,
      }),
    ],
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
      caches.open(CACHE_NAMES.API).then(async (cache) => {
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
  event.waitUntil(
    (async () => {
      // Purgar cachés runtime legadas (incluidas respuestas opacas previas) y DB obsoleta
      await Promise.all(LEGACY_RUNTIME_CACHES.map((name) => caches.delete(name)));
      if (typeof indexedDB !== "undefined" && typeof indexedDB.deleteDatabase === "function") {
        try {
          indexedDB.deleteDatabase("SmartBarberDB");
        } catch (_) {}
      }
      await self.clients.claim();
    })()
  );
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
