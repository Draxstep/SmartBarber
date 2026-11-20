/**
 * SmartBarber - Utilidades de Formateo
 * Cumplimiento estricto con reglas de negocio Colombia y DESIGN.md
 */

/**
 * Formatea un valor numérico a Pesos Colombianos enteros sin decimales.
 * Formato obligatorio: "$ 25.000 COP"
 * @param {number|string} amount
 * @returns {string}
 */
export function formatCOP(amount) {
  const numeric = typeof amount === 'number' ? amount : parseFloat(amount) || 0;
  const formatted = Math.round(numeric)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `$ ${formatted} COP`;
}

/**
 * Formatea duración en minutos a su representación de tiempo y bloques de 30 minutos.
 * @param {number} minutes
 * @returns {string} Ej: "30 min (1 bloque)", "60 min (2 bloques)"
 */
export function formatDurationBlocks(minutes) {
  const min = parseInt(minutes, 10) || 0;
  const blocks = Math.ceil(min / 30);
  const blockLabel = blocks === 1 ? '1 bloque' : `${blocks} bloques`;
  return `${min} min (${blockLabel})`;
}

/**
 * Formatea una fecha o string ISO a formato legible en zona horaria America/Bogota (UTC-5).
 * @param {string|Date} dateInput
 * @param {Intl.DateTimeFormatOptions} options
 * @returns {string}
 */
export function formatDateBogota(dateInput, options = {}) {
  if (!dateInput) return '';
  const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  const defaultOptions = {
    timeZone: 'America/Bogota',
    weekday: 'long',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    ...options
  };
  return new Intl.DateTimeFormat('es-CO', defaultOptions).format(date);
}

/**
 * Formatea una hora en formato 12h (AM/PM) en UTC-5.
 * @param {string} timeString Ej: "09:00:00" o "14:30"
 * @returns {string} Ej: "09:00 AM", "02:30 PM"
 */
export function formatTime12h(timeString) {
  if (!timeString) return '';
  const [hoursStr, minutesStr] = timeString.split(':');
  let hours = parseInt(hoursStr, 10);
  const minutes = minutesStr ? minutesStr.slice(0, 2) : '00';
  const period = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12 || 12;
  const paddedHours = hours.toString().padStart(2, '0');
  return `${paddedHours}:${minutes} ${period}`;
}

/**
 * Genera o normaliza un código de cita al formato 'SB-XXXXXX'
 * @param {string} code
 * @returns {string}
 */
export function formatBookingCode(code) {
  if (!code) return 'SB-000000';
  const upper = code.toUpperCase();
  return upper.startsWith('SB-') ? upper : `SB-${upper}`;
}
