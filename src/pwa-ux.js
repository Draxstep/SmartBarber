// src/pwa-ux.js
import { registerSW } from 'virtual:pwa-register';
import { SyncQueueRepository } from './db/syncQueueRepository.js';

export function initPwaUX() {
  crearElementosUI();

  const syncRepo = new SyncQueueRepository();

  // 1. Indicador de Conexión (RF-PWA-07) y Sincronización Automática (RF-PWA-05)
  const offlineBadge = document.getElementById('pwa-offline-badge');
  
  const updateNetworkStatus = async () => {
    if (!navigator.onLine) {
      if (offlineBadge) offlineBadge.style.display = 'block';
      console.warn('Estás navegando sin conexión. Los cambios se guardarán localmente en la cola IndexedDB.');
    } else {
      if (offlineBadge) offlineBadge.style.display = 'none';
      await syncRepo.sincronizarColaConServidor();
    }
  };

  window.addEventListener('online', updateNetworkStatus);
  window.addEventListener('offline', updateNetworkStatus);
  updateNetworkStatus(); // Estado inicial

  // 2. Prompt de Instalación Personalizado (RF-PWA-01 / UX Sesión 23)
  let deferredPrompt = null;
  const installBtn = document.getElementById('pwa-install-btn');

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    if (installBtn) installBtn.style.display = 'block'; // Mostrar botón personalizado
  });

  installBtn?.addEventListener('click', async () => {
    if (!deferredPrompt) return;
    installBtn.style.display = 'none';
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`El usuario ${outcome === 'accepted' ? 'aceptó' : 'rechazó'} la instalación`);
    deferredPrompt = null;
  });

  // 3. Feedback de Carga y Actualización del Service Worker con Workbox (RF-PWA-08 / Sesión 23)
  const updatePrompt = document.getElementById('pwa-update-prompt');
  const updateBtn = document.getElementById('pwa-update-btn');

  const updateSW = registerSW({
    onNeedRefresh() {
      // Se detectó una nueva versión en el servidor
      console.log('[Workbox] Nueva versión detectada.');
      if (updatePrompt) updatePrompt.style.display = 'block';
    },
    onOfflineReady() {
      console.log('[Workbox] Aplicación lista para usarse sin conexión.');
    }
  });

  updateBtn?.addEventListener('click', () => {
    updateSW(true); // Forzar recarga con la nueva versión
  });
}

// Utilidad para inyectar los contenedores HTML sin saturar el index.html
function crearElementosUI() {
  const container = document.createElement('div');
  container.innerHTML = `
    <!-- Badge Offline (RF-PWA-07) -->
    <div id="pwa-offline-badge" style="display: none; position: fixed; bottom: 20px; left: 20px; background: #dc2626; color: white; padding: 8px 16px; border-radius: 20px; font-size: 0.9em; z-index: 9999; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
      📡 Sin conexión a internet
    </div>

    <!-- Botón de Instalación Personalizado (RF-PWA-01) -->
    <button id="pwa-install-btn" style="display: none; position: fixed; top: 15px; right: 15px; background: #3b82f6; color: white; border: none; padding: 8px 16px; border-radius: 6px; cursor: pointer; font-weight: bold; z-index: 9999;">
      📱 Instalar App
    </button>

    <!-- Prompt de Actualización de Workbox (RF-PWA-08) -->
    <div id="pwa-update-prompt" style="display: none; position: fixed; bottom: 20px; right: 20px; background: #111827; color: white; padding: 15px; border-radius: 8px; z-index: 9999; box-shadow: 0 4px 6px rgba(0,0,0,0.2);">
      <p style="margin: 0 0 10px 0; font-size: 0.9em;">¡Nueva versión disponible!</p>
      <button id="pwa-update-btn" style="background: #10b981; color: white; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer; width: 100%;">
        Actualizar ahora
      </button>
    </div>
  `;
  document.body.appendChild(container);
}
