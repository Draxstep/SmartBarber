// src/pwa/notificaciones.js
// Gestión de Push API VAPID (RFC 8292) y avisos locales según SMARTBARBER_TECH_SPEC.md

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
  return (
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
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
  const respKey = await fetch("/api/v1/push/clave-publica");
  if (!respKey.ok) {
    throw new Error("No se pudo obtener la clave pública VAPID del servidor.");
  }
  const { data } = await respKey.json();
  const applicationServerKey = urlBase64ABytes(data.publicKey);

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
  const token = localStorage.getItem("smartbarber_token");
  const respSub = await fetch("/api/v1/push/suscribir", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    credentials: "include",
    body: JSON.stringify({ subscription: suscripcion }),
  });

  if (!respSub.ok) {
    throw new Error("Fallo al registrar suscripción en el servidor.");
  }

  return { ok: true, estado: "granted", mensaje: "Notificaciones activadas exitosamente." };
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
