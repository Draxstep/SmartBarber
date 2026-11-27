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
precacheAndRoute([{"revision":"d1f3f52824b16bafcbf7e66c81c59da9","url":"index.html"},{"revision":"2bb946ecf1b8b751b7c9b7ece2dcb165","url":"backoffice.html"},{"revision":"6be0d148b3bea9cdca132df1687a456f","url":"offline.html"},{"revision":"533693f93ee02c9aab40385831d3966f","url":"manifest.json"},{"revision":"cd382457e0c4a3283717da24984ae420","url":"assets/ui-dialog-ChIcAMXR.css"},{"revision":"04ea4084487b75d6a25b457f808667ec","url":"assets/ui-dialog-BR_I7jxM.js"},{"revision":"21a8dfac5d88228dcb2dcb0dfede6689","url":"assets/status-badge-DqcH-nbp.js"},{"revision":"e021341c5f8764ad02fbfdd6ce0eb5af","url":"assets/servicios.page-BjGypto5.js"},{"revision":"02ae1370cb6a642e5b1d8e48372daba9","url":"assets/perfil.page-CKbOVYL7.js"},{"revision":"12aa60bb9a724638cea34d8b5aa43c0e","url":"assets/payment-method-selector-BD8_gHwi.js"},{"revision":"bb007826c4c38a8f1499bbd5ab54a503","url":"assets/kpi-card-DiXgIja3.js"},{"revision":"d14e8c8fb9de93ab8c9310c1c76001c1","url":"assets/inventory.page-C356Ck4t.js"},{"revision":"76f0a2a87ba02cd39679328d1ed2eaa2","url":"assets/install-prompt-Cevaa9_p.js"},{"revision":"48264fe64041ab919d378393aaafc812","url":"assets/info-note-DKTEGNOH.js"},{"revision":"c5807deed5c6d8f4db2035ff29cfa84c","url":"assets/index-DHqZON7n.js"},{"revision":"fc6a01e2d5c6c9f03be67845e14c0852","url":"assets/dashboard.page-DRwhRr1i.js"},{"revision":"89cc0024696e2f31748738107c4f9de5","url":"assets/cortes.page-DtcjerxJ.js"},{"revision":"0945e5395b47ba21c47fa9f01eb1026e","url":"assets/configuracion.page-B1z7Q8B3.js"},{"revision":"f70743124c9fe974be61ab1e73b7148d","url":"assets/comisiones.page-B3zWo-yX.js"},{"revision":"71ed85311cd107a7e6f18f310d1e6b08","url":"assets/booking-stepper-dRo4WZ9S.js"},{"revision":"fa532fa8b0f5d3b96be2379e7acd3a8d","url":"assets/barberos.page-BOLKrLaD.js"},{"revision":"c823e766bf4ab440cf410b1e5bf76add","url":"assets/backoffice-CvaUklFO.js"},{"revision":"782b1a0d1ecfeec69e5fde624bfaf22f","url":"assets/agenda.page-rte7B4FU.js"},{"revision":"d8cc7117d11a897cd248b8f0e377cf64","url":"assets/action-button-BItS5dMg.js"},{"revision":"4836ea148892c29f1730baa234c62fa9","url":"icons/launchericon-96x96.png"},{"revision":"63c48d1c5d163f4011b8b19f12589241","url":"icons/launchericon-48x48.png"},{"revision":"50d689b81a1a1a22442665adda270877","url":"icons/launchericon-144x144.png"},{"revision":"42959a3e0244843d1adc7550888e7366","url":"icons/icon-512-maskable.png"},{"revision":"6981daf1e4a024a8ddf56f9a58fff3ed","url":"icons/icon-192.png"}]);

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
