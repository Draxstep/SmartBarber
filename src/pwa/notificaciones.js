// src/pwa/notificaciones.js
// Gestión de Push API VAPID (RFC 8292) y avisos locales según SMARTBARBER_TECH_SPEC.md

import { httpClient } from "../services/http-client.js";

/**
 * Convierte una clave pública VAPID en Base64 URL-safe a Uint8Array
 */
export function urlBase64ABytes(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

/**
 * Comprueba si el navegador soporta Notificaciones y Push API
 */
export function soportaNotificacionesPush() {
  return Boolean(
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

/**
 * Consulta el estado detallado de compatibilidad y permisos de Notificaciones Push
 * @returns {Promise<{ soportado: boolean, permiso: string, activa: boolean }>}
 */
export async function obtenerEstadoNotificaciones() {
  if (!soportaNotificacionesPush()) {
    return { soportado: false, permiso: "unsupported", activa: false };
  }

  const permiso = Notification.permission; // 'default' | 'granted' | 'denied'
  let activa = false;

  if (permiso === "granted") {
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      activa = Boolean(sub);
    } catch {
      activa = false;
    }
  }

  return { soportado: true, permiso, activa };
}

/**
 * Suscribe el dispositivo autenticado a las alertas Push en contexto de clic del usuario
 */
export async function suscribirAPush() {
  if (!soportaNotificacionesPush()) {
    throw new Error("Tu navegador no soporta Notificaciones Push.");
  }

  // 1. Solicitar permiso exclusivamente bajo interacción del usuario
  const permiso = await Notification.requestPermission();
  if (permiso !== "granted") {
    return { ok: false, estado: permiso, mensaje: "Permiso de notificaciones no concedido." };
  }

  // 2. Obtener clave pública VAPID desde el servidor
  let keyResponse;
  try {
    keyResponse = await httpClient.get("/push/vapid-public-key");
  } catch {
    keyResponse = await httpClient.get("/push/clave-publica");
  }
  const publicKey = keyResponse?.data?.publicKey;
  if (!publicKey) {
    throw new Error("No se pudo obtener la clave pública VAPID del servidor.");
  }
  const applicationServerKey = urlBase64ABytes(publicKey);

  // 3. Suscribir en el PushManager del Service Worker
  const reg = await navigator.serviceWorker.ready;
  let suscripcion = await reg.pushManager.getSubscription();

  if (!suscripcion) {
    suscripcion = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey,
    });
  }

  // 4. Enviar la suscripción al backend vinculada a la sesión activa
  try {
    await httpClient.request("/push/subscribe", {
      method: "POST",
      credentials: "include",
      body: JSON.stringify({ subscription: suscripcion }),
    });
  } catch {
    await httpClient.request("/push/suscribir", {
      method: "POST",
      credentials: "include",
      body: JSON.stringify({ subscription: suscripcion }),
    });
  }

  return { ok: true, estado: "granted", mensaje: "Notificaciones activadas exitosamente." };
}

/**
 * Desuscribe el dispositivo de las alertas Push en el PushManager y en la base de datos
 */
export async function desuscribirDePush() {
  if (!soportaNotificacionesPush()) return { ok: true };

  try {
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    if (sub) {
      const endpoint = sub.endpoint;
      await sub.unsubscribe().catch(() => {});

      await httpClient
        .request("/push/unsubscribe", {
          method: "DELETE",
          credentials: "include",
          body: JSON.stringify({ endpoint }),
        })
        .catch(() =>
          httpClient
            .request("/push/desuscribir", {
              method: "DELETE",
              credentials: "include",
              body: JSON.stringify({ endpoint }),
            })
            .catch(() => {})
        );
    }
    return { ok: true, mensaje: "Notificaciones desactivadas correctamente." };
  } catch (err) {
    throw new Error("Error al desactivar notificaciones: " + err.message);
  }
}

/**
 * Envía una notificación Push de prueba al usuario en sesión
 */
export async function enviarNotificacionPrueba() {
  try {
    return await httpClient.request("/push/test", {
      method: "POST",
      credentials: "include",
    });
  } catch {
    return await httpClient.request("/push/probar", {
      method: "POST",
      credentials: "include",
    });
  }
}

/**
 * Comprueba si el dispositivo ya cuenta con suscripción Push activa
 */
export async function tieneSuscripcionActiva() {
  if (!soportaNotificacionesPush()) return false;
  try {
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    return sub !== null && Notification.permission === "granted";
  } catch {
    return false;
  }
}

/**
 * Muestra una notificación local accesible mediante registration.showNotification (PROHIBIDO new Notification)
 */
export async function mostrarAvisoLocal(titulo, opciones = {}) {
  if (!("Notification" in window) || Notification.permission !== "granted") return;
  try {
    const reg = await navigator.serviceWorker.ready;
    await reg.showNotification(titulo, {
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
      ...opciones,
    });
  } catch (err) {
    console.warn("No se pudo emitir notificación local:", err);
  }
}
