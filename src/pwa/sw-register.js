// src/pwa/sw-register.js
// Registro del Service Worker, ciclo de vida (RF-PWA-08) y conectividad (RF-PWA-07)

import { vaciarDesdeLaPagina } from "./sync.js";

/**
 * Inicializa el Service Worker y el listener de actualizaciones
 */
export async function registrarServiceWorker() {
  if (!("serviceWorker" in navigator)) {
    console.info("ℹ️ Service Worker no soportado en este navegador.");
    return null;
  }

  const isProd = typeof import.meta !== "undefined" && Boolean(import.meta.env?.PROD);
  const enableInDev = typeof import.meta !== "undefined" && import.meta.env?.VITE_ENABLE_SW_DEV === "true";

  // En desarrollo Vite (HMR), desregistrar cualquier SW residual salvo activación explícita
  if (!isProd && !enableInDev) {
    try {
      const registrations = await navigator.serviceWorker.getRegistrations();
      if (registrations.length > 0) {
        await Promise.all(registrations.map((reg) => reg.unregister()));
        console.info("🧹 Service Worker previo desregistrado en modo desarrollo.");
      }
      if (typeof indexedDB !== "undefined" && typeof indexedDB.deleteDatabase === "function") {
        indexedDB.deleteDatabase("SmartBarberDB");
      }
    } catch (_) {}
    return null;
  }

  try {
    const reg = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
    console.log("💈 Service Worker registrado exitosamente con scope: /");

    // Detección de nueva versión instalada esperando activación (RF-PWA-08)
    reg.addEventListener("updatefound", () => {
      const nuevoWorker = reg.installing;
      if (!nuevoWorker) return;

      nuevoWorker.addEventListener("statechange", () => {
        if (nuevoWorker.state === "installed" && navigator.serviceWorker.controller) {
          mostrarBannerActualizacion(nuevoWorker);
        }
      });
    });

    // Recargar la aplicación una vez que el nuevo Service Worker toma el control
    let recargando = false;
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (!recargando) {
        recargando = true;
        window.location.reload();
      }
    });

    // Escuchar mensajes provenientes del Service Worker (p. ej. sincronización de outbox completada)
    navigator.serviceWorker.addEventListener("message", (event) => {
      if (event.data?.type === "OUTBOX_SINCRONIZADO") {
        console.log(`📡 Sincronización en segundo plano completada: ${event.data.enviados} ítems.`);
        window.dispatchEvent(new CustomEvent("smartbarber:outbox-updated", { detail: event.data }));
      }
    });

    return reg;
  } catch (error) {
    console.error("❌ Error al registrar el Service Worker:", error);
    return null;
  }
}

/**
 * Muestra el banner no intrusivo de actualización disponible (#FAF7F2, 1px solid #1F3A5F)
 */
function mostrarBannerActualizacion(workerEsperando) {
  if (document.getElementById("pwa-update-banner")) return;

  const banner = document.createElement("aside");
  banner.id = "pwa-update-banner";
  banner.setAttribute("role", "alert");
  banner.setAttribute("aria-live", "polite");
  banner.style.cssText = `
    position: fixed;
    bottom: 24px;
    right: 24px;
    z-index: 99999;
    background-color: #FAF7F2;
    color: #1C1C1C;
    border: 1px solid #1F3A5F;
    border-radius: 8px;
    padding: 16px 20px;
    box-shadow: 0 4px 20px rgba(28, 28, 28, 0.15);
    display: flex;
    align-items: center;
    gap: 16px;
    max-width: 400px;
    font-family: 'Inter', system-ui, sans-serif;
  `;

  banner.innerHTML = `
    <div style="display: flex; align-items: center; gap: 10px;">
      <span class="material-symbols-outlined" style="color: #1F3A5F; font-size: 24px;">system_update</span>
      <div style="font-size: 14px; line-height: 1.4;">
        <strong>Nueva versión disponible</strong><br>
        Actualiza para disfrutar de las últimas mejoras operativas.
      </div>
    </div>
    <div style="display: flex; gap: 8px;">
      <button id="btn-pwa-update" style="
        background-color: #1F3A5F;
        color: #FFFFFF;
        border: none;
        border-radius: 6px;
        padding: 8px 14px;
        font-weight: 600;
        font-size: 13px;
        cursor: pointer;
        min-height: 44px;
        min-width: 44px;
      ">
        Actualizar
      </button>
      <button id="btn-pwa-dismiss" style="
        background: transparent;
        color: #6B645A;
        border: none;
        font-size: 18px;
        cursor: pointer;
        min-height: 44px;
        min-width: 44px;
      " aria-label="Cerrar aviso">
        ✕
      </button>
    </div>
  `;

  document.body.appendChild(banner);

  document.getElementById("btn-pwa-update")?.addEventListener("click", () => {
    workerEsperando.postMessage({ type: "SKIP_WAITING" });
  });

  document.getElementById("btn-pwa-dismiss")?.addEventListener("click", () => {
    banner.remove();
  });
}

/**
 * Inicializa los escuchadores globales de conectividad (RF-PWA-07)
 */
export function inicializarEventosConectividad() {
  window.addEventListener("online", () => {
    console.log("🌐 Conexión a internet restablecida. Iniciando sincronización de cola...");
    vaciarDesdeLaPagina().catch(() => {});
    window.dispatchEvent(new CustomEvent("smartbarber:connectivity-changed", { detail: { online: true } }));
  });

  window.addEventListener("offline", () => {
    console.warn("⚠️ Dispositivo sin conexión a internet (Modo Offline activo).");
    window.dispatchEvent(new CustomEvent("smartbarber:connectivity-changed", { detail: { online: false } }));
  });
}
