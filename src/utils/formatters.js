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
 * Retorna la fecha operativa actual en formato YYYY-MM-DD para zona horaria America/Bogota (UTC-5).
 * @param {Date} [date=new Date()]
 * @returns {string}
 */
export function getTodayBogota(date = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Bogota' }).format(date);
}

export const DAYS_OF_WEEK = Object.freeze([
  'Lunes',
  'Martes',
  'Miércoles',
  'Jueves',
  'Viernes',
  'Sábado',
  'Domingo'
]);

/**
 * Formatea una fecha o string ISO a formato legible en zona horaria America/Bogota (UTC-5),
 * capitalizando únicamente la primera letra para cumplir con la ortografía del español.
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
  const formatted = new Intl.DateTimeFormat('es-CO', defaultOptions).format(date);
  return formatted ? formatted.charAt(0).toUpperCase() + formatted.slice(1) : '';
}

/**
 * Formatea un rango de fechas YYYY-MM-DD en español sin capitalizar preposiciones ('de').
 * @param {string} startStr
 * @param {string} endStr
 * @returns {string}
 */
export function formatDateRangeEsCO(startStr, endStr) {
  if (!startStr) return '';
  const start = new Date(`${startStr}T12:00:00`);
  if (!endStr || startStr === endStr) {
    return `Hoy, ${new Intl.DateTimeFormat('es-CO', {
      timeZone: 'America/Bogota',
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    }).format(start)}`;
  }
  const end = new Date(`${endStr}T12:00:00`);
  const s = new Intl.DateTimeFormat('es-CO', { timeZone: 'America/Bogota', day: 'numeric', month: 'short' }).format(start);
  const e = new Intl.DateTimeFormat('es-CO', { timeZone: 'America/Bogota', day: 'numeric', month: 'short', year: 'numeric' }).format(end);
  return `${s} – ${e}`;
}

/**
 * Pluralización gramatical en español sin uso de "(s)".
 * @param {number} count
 * @param {string} singular
 * @param {string} plural
 * @returns {string}
 */
export function formatPlural(count, singular, plural) {
  const n = Number(count) || 0;
  return `${n} ${n === 1 ? singular : plural}`;
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
