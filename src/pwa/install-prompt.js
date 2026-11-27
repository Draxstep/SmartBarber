// src/pwa/install-prompt.js
// Captura de beforeinstallprompt y guía para Safari/iOS según SMARTBARBER_TECH_SPEC.md

let diferirInstalacion = null;
let listenersInicializados = false;
let activeBtnId = "btn-instalar-app";

const esIosSafari = () =>
  /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;

const esStandalone = () =>
  Boolean(window.navigator.standalone || window.matchMedia("(display-mode: standalone)").matches);

/**
 * Sincroniza la visibilidad del botón de instalación tras renderizados dinámicos del DOM.
 */
export function sincronizarBotonInstalacion(btnId = activeBtnId) {
  const btn = document.getElementById(btnId);
  if (!btn) return;

  if (diferirInstalacion || (esIosSafari() && !esStandalone())) {
    btn.style.display = "inline-flex";
  } else {
    btn.style.display = "none";
  }
}

export function inicializarInstaladorPWA(btnId = "btn-instalar-app") {
  activeBtnId = btnId;

  if (!listenersInicializados) {
    listenersInicializados = true;

    // 1. Captura de evento nativo en Chromium solo cuando existe disparador UI en el DOM
    window.addEventListener("beforeinstallprompt", (e) => {
      const btn = document.getElementById(activeBtnId);
      if (!btn) {
        // Sin botón en esta vista (ej. pantalla de Login): permitir comportamiento nativo del navegador
        return;
      }

      e.preventDefault();
      diferirInstalacion = e;
      console.log("📲 Evento beforeinstallprompt capturado.");
      sincronizarBotonInstalacion(activeBtnId);
    });

    window.addEventListener("appinstalled", () => {
      console.log("🎉 SmartBarber instalada exitosamente como PWA.");
      diferirInstalacion = null;
      sincronizarBotonInstalacion(activeBtnId);
    });

    // 2. Delegación global de clic para soportar re-renderizados dinámicos de header/layout
    document.addEventListener("click", async (event) => {
      const btn = event.target.closest?.(`#${activeBtnId}`);
      if (!btn) return;

      if (diferirInstalacion) {
        diferirInstalacion.prompt();
        const { outcome } = await diferirInstalacion.userChoice;
        console.log(`📲 Resultado de instalación: ${outcome}`);
        diferirInstalacion = null;
        sincronizarBotonInstalacion(activeBtnId);
        return;
      }

      if (esIosSafari() && !esStandalone()) {
        alert(
          "Para instalar SmartBarber en tu iPhone o iPad:\n1. Pulsa el botón Compartir (icono con flecha hacia arriba).\n2. Elige 'Añadir a la pantalla de inicio'."
        );
      }
    });
  }

  sincronizarBotonInstalacion(btnId);
}
