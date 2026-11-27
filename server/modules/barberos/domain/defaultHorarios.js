/**
 * @file defaultHorarios.js
 * @description Plantilla semanal por defecto para nuevos barberos y scripts seed (L-S 09:00-13:00 / 14:00-19:00, D descanso).
 */

/**
 * Construye las franjas semanales estándar compatibles con `horarios_barberos` y `BarberoPgRepository.saveHorarios`.
 * @param {Object} [options]
 * @param {string} [options.t1Start='09:00:00']
 * @param {string} [options.t1End='13:00:00']
 * @param {string} [options.t2Start='14:00:00']
 * @param {string} [options.t2End='19:00:00']
 * @returns {Array<{diaSemana: number, numeroFranja: number, esDescanso: boolean, horaInicio: string|null, horaFin: string|null}>}
 */
export function buildDefaultWeeklyHorarios({
  t1Start = '09:00:00',
  t1End = '13:00:00',
  t2Start = '14:00:00',
  t2End = '19:00:00'
} = {}) {
  const rows = [];
  for (let diaSemana = 1; diaSemana <= 6; diaSemana += 1) {
    rows.push({
      diaSemana,
      numeroFranja: 1,
      esDescanso: false,
      horaInicio: t1Start,
      horaFin: t1End
    });
    rows.push({
      diaSemana,
      numeroFranja: 2,
      esDescanso: false,
      horaInicio: t2Start,
      horaFin: t2End
    });
  }
  rows.push({
    diaSemana: 7,
    numeroFranja: 1,
    esDescanso: true,
    horaInicio: null,
    horaFin: null
  });
  return rows;
}
