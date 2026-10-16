// src/device/sensores.js
// Guía de Aprendizaje - Sesión 11 (25): Sensores de Movimiento (DeviceOrientation y DeviceMotion)

/**
 * Maneja el permiso especial de sensores en iOS (Safari) o implícito en Android/Chromium
 * @returns {Promise<'granted'|'denied'|'no-soportado'|'no-necesario'>}
 */
export async function pedirPermisoSensores() {
  if (!("DeviceMotionEvent" in window)) return "no-soportado";

  if (typeof DeviceMotionEvent.requestPermission === "function") {
    try {
      return await DeviceMotionEvent.requestPermission(); // "granted" | "denied"
    } catch {
      return "denied"; // p. ej. NotAllowedError por no venir de un gesto del usuario
    }
  }

  return "no-necesario"; // Android/Chromium: el permiso es implícito
}

/**
 * Detecta si el dispositivo tiene sensores reales de acelerómetro/giroscopio (no un PC)
 * @param {number} timeoutMs
 * @returns {Promise<boolean>}
 */
export function hayLecturasReales(timeoutMs = 1000) {
  return new Promise((resolve) => {
    const alRecibir = (e) => {
      const a = e.accelerationIncludingGravity;
      if (a && a.x !== null) {
        limpiar();
        resolve(true);
      }
    };

    const limpiar = () => {
      window.removeEventListener("devicemotion", alRecibir);
      clearTimeout(t);
    };

    const t = setTimeout(() => {
      limpiar();
      resolve(false);
    }, timeoutMs);

    window.addEventListener("devicemotion", alRecibir);
  });
}

/**
 * Escucha la orientación (inclinación) del dispositivo limitando la frecuencia de lecturas
 * @param {Function} callback Recibe { alfa, beta, gamma }
 * @param {number} intervaloMs Tiempo mínimo entre lecturas (por defecto 100ms = 10 fps)
 * @returns {Function} Función para cancelar la escucha
 */
export function escucharOrientacion(callback, intervaloMs = 100) {
  let ultimo = 0;
  const manejador = (e) => {
    const ahora = performance.now();
    if (ahora - ultimo < intervaloMs) return;
    ultimo = ahora;
    if (e.beta === null) return; // Dispositivo sin sensores
    callback({ alfa: e.alpha, beta: e.beta, gamma: e.gamma });
  };

  window.addEventListener("deviceorientation", manejador);
  return () => window.removeEventListener("deviceorientation", manejador);
}

/**
 * Detecta una sacudida (shake) mediante la desviación respecto a la gravedad (9.81 m/s²)
 * @param {Function} onSacudida Callback invocado con la desviación medida
 * @param {{umbral?: number, enfriamientoMs?: number}} options
 * @returns {Function} Función para cancelar la escucha
 */
export function detectarSacudida(onSacudida, { umbral = 12, enfriamientoMs = 1000 } = {}) {
  const GRAVEDAD = 9.81;
  let ultimaSacudida = 0;

  const manejador = (e) => {
    const a = e.accelerationIncludingGravity;
    if (!a || a.x === null) return;

    // Magnitud vectorial en 3D
    const magnitud = Math.hypot(a.x, a.y, a.z);
    const desviacion = Math.abs(magnitud - GRAVEDAD);
    const ahora = performance.now();

    if (desviacion > umbral && ahora - ultimaSacudida > enfriamientoMs) {
      ultimaSacudida = ahora;
      onSacudida(Math.round(desviacion * 10) / 10);
    }
  };

  window.addEventListener("devicemotion", manejador);
  return () => window.removeEventListener("devicemotion", manejador);
}
