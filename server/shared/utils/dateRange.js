/**
 * @file dateRange.js
 * @description Normalización compartida de rangos de fechas en zona horaria America/Bogota (UTC-5).
 */

/**
 * Obtiene la fecha calendario actual (YYYY-MM-DD) en zona America/Bogota.
 * @returns {string}
 */
export function getTodayBogotaServer() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Bogota' }).format(new Date());
}

/**
 * Normaliza parámetros fechaInicio / fechaFin a timestamps explícitos con offset -05:00
 * para evitar truncamiento a medianoche (00:00:00) en consultas <= timestamptz.
 * @param {string|null|undefined} rawInicio
 * @param {string|null|undefined} rawFin
 * @returns {{ fechaInicio: string, fechaFin: string, today: string }}
 */
export function normalizeBogotaDateRange(rawInicio, rawFin) {
  const today = getTodayBogotaServer();
  const startTrim = typeof rawInicio === 'string' ? rawInicio.trim() : '';
  const endTrim = typeof rawFin === 'string' ? rawFin.trim() : '';

  const fechaInicio = !startTrim
    ? `${today}T00:00:00.000-05:00`
    : /^\d{4}-\d{2}-\d{2}$/.test(startTrim)
      ? `${startTrim}T00:00:00.000-05:00`
      : startTrim;

  const fechaFin = !endTrim
    ? `${today}T23:59:59.999-05:00`
    : /^\d{4}-\d{2}-\d{2}$/.test(endTrim)
      ? `${endTrim}T23:59:59.999-05:00`
      : endTrim;

  return { fechaInicio, fechaFin, today };
}
