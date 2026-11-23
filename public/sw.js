// public/sw-propio.js
importScripts("/lib/workbox-v7.4.1/workbox-sw.js");
workbox.setConfig({ modulePathPrefix: "/lib/workbox-v7.4.1/", debug: false });

// Lectura de módulos en nivel superior
const { precacheAndRoute, cleanupOutdatedCaches } = workbox.precaching;
const { registerRoute, setCatchHandler } = workbox.routing;
const { CacheFirst, NetworkFirst, NetworkOnly, StaleWhileRevalidate } = workbox.strategies;
const { ExpirationPlugin } = workbox.expiration;

cleanupOutdatedCaches();
precacheAndRoute([{"revision":"5249b568bd347374f88ab61b6d16822a","url":"index.html"},{"revision":"5b4621b54b9e9701c830970df3aafcf6","url":"backoffice.html"},{"revision":"6e43bfbd39f9750ae399a584ed64f031","url":"offline.html"},{"revision":"5a19c3effa0b8fd4a6cc5a653fe86f70","url":"styleguide.html"},{"revision":"e0dac51d12ae063d226253bc7f89b789","url":"manifest.json"},{"revision":"388e370f76f9687174442189f9066ed1","url":"assets/ui-dialog-C_b0Adve.js"},{"revision":"149bece62749b844265792238fd6dc72","url":"assets/ui-dialog-CF2KDzUb.css"},{"revision":"e498616a8be704d3371d4fd31d36ca3d","url":"assets/styleguide-CwFhJcim.js"},{"revision":"ae966d99ccc5443084c19f8ed3c7aaf3","url":"assets/kpi-card-CqCgxZpq.js"},{"revision":"bd7c7ec9916b0b013c01b75e51e0cfd0","url":"assets/install-prompt-jfsL8hff.js"},{"revision":"0e120d39e83c09f883f1eeeb91d54460","url":"assets/index-DczMiOWo.js"},{"revision":"1915030ad30383f3dadd9be1a1998de5","url":"assets/booking-stepper-CsH14qkv.js"},{"revision":"0c91e2fa7c80652879adaf9a796e51bf","url":"assets/backoffice-CydSYGOu.js"},{"revision":"4836ea148892c29f1730baa234c62fa9","url":"icons/launchericon-96x96.png"},{"revision":"e0e18106be09696cfc5480335f7de5a4","url":"icons/launchericon-72x72.png"},{"revision":"42959a3e0244843d1adc7550888e7366","url":"icons/launchericon-512x512.png"},{"revision":"63c48d1c5d163f4011b8b19f12589241","url":"icons/launchericon-48x48.png"},{"revision":"6981daf1e4a024a8ddf56f9a58fff3ed","url":"icons/launchericon-192x192.png"},{"revision":"50d689b81a1a1a22442665adda270877","url":"icons/launchericon-144x144.png"},{"revision":"42959a3e0244843d1adc7550888e7366","url":"icons/icon-512-maskable.png"},{"revision":"6981daf1e4a024a8ddf56f9a58fff3ed","url":"icons/icon-192.png"}]);

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
self.addEventListener("install", () => {
  self.skipWaiting();
});

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
