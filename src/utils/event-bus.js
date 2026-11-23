/**
 * @file event-bus.js
 * @description Bus de eventos desacoplado en memoria (CustomEvents) para sincronización reactiva
 * de estado entre componentes, servicios, Outbox y Service Worker en SmartBarber.
 */

export const AppEvent = Object.freeze({
  DATA_MUTATED: 'smartbarber:data-mutated',
  OUTBOX_SYNCED: 'smartbarber:outbox-updated',
  CONNECTIVITY_CHANGED: 'smartbarber:connectivity-changed'
});

/**
 * Emite una mutación de datos para que los módulos interesados refresquen su vista o caché.
 * @param {'citas' | 'cortes' | 'inventario' | 'barberos' | 'servicios' | 'general'} entity 
 * @param {'create' | 'update' | 'delete' | 'sync'} action 
 * @param {any} [payload] 
 */
export function emitDataMutation(entity, action, payload = null) {
  if (typeof window === 'undefined') return;
  const detail = {
    entity,
    action,
    payload,
    timestamp: Date.now()
  };
  window.dispatchEvent(new CustomEvent(AppEvent.DATA_MUTATED, { detail }));
}

/**
 * Suscribe un manejador a eventos de mutación de datos.
 * @param {Function} callback - Función que recibe { entity, action, payload, timestamp }
 * @returns {Function} Función para cancelar la suscripción (unsubscribe)
 */
export function onDataMutation(callback) {
  if (typeof window === 'undefined') return () => {};
  const handler = (event) => {
    if (event?.detail) {
      callback(event.detail);
    }
  };
  window.addEventListener(AppEvent.DATA_MUTATED, handler);
  return () => window.removeEventListener(AppEvent.DATA_MUTATED, handler);
}

/**
 * Emite cualquier evento de la aplicación.
 * @param {string} eventName 
 * @param {any} [detail] 
 */
export function emitAppEvent(eventName, detail = {}) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(eventName, { detail }));
}

/**
 * Suscribe a cualquier evento de la aplicación.
 * @param {string} eventName 
 * @param {Function} callback 
 * @returns {Function} Unsubscribe
 */
export function onAppEvent(eventName, callback) {
  if (typeof window === 'undefined') return () => {};
  const handler = (event) => callback(event.detail);
  window.addEventListener(eventName, handler);
  return () => window.removeEventListener(eventName, handler);
}
