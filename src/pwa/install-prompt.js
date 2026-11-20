// src/pwa/install-prompt.js
// Captura de beforeinstallprompt y guía para Safari/iOS según SMARTBARBER_TECH_SPEC.md

let diferirInstalacion = null;

export function inicializarInstaladorPWA(btnId = "btn-instalar-app") {
  // 1. Captura de evento nativo en Chromium
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    diferirInstalacion = e;
    console.log("📲 Evento beforeinstallprompt capturado.");

    const btn = document.getElementById(btnId);
    if (btn) {
      btn.style.display = "inline-flex";
      btn.onclick = async () => {
        if (!diferirInstalacion) return;
        diferirInstalacion.prompt();
        const { outcome } = await diferirInstalacion.userChoice;
        console.log(`📲 Resultado de instalación: ${outcome}`);
        diferirInstalacion = null;
        btn.style.display = "none";
      };
    }
  });

  window.addEventListener("appinstalled", () => {
    console.log("🎉 SmartBarber instalada exitosamente como PWA.");
    const btn = document.getElementById(btnId);
    if (btn) btn.style.display = "none";
  });

  // 2. Detección de Safari / iOS
  const esIos = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
  const esStandalone = window.navigator.standalone || window.matchMedia("(display-mode: standalone)").matches;

  if (esIos && !esStandalone) {
    const btn = document.getElementById(btnId);
    if (btn) {
      btn.style.display = "inline-flex";
      btn.onclick = () => {
        alert("Para instalar SmartBarber en tu iPhone o iPad:\n1. Pulsa el botón Compartir (icono con flecha hacia arriba).\n2. Elige 'Añadir a la pantalla de inicio'.");
      };
    }
  }
}
