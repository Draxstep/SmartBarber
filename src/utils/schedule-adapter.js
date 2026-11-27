/**
 * @file schedule-adapter.js
 * @description Adaptador puro bidireccional entre entidades HorarioBarbero de API/BD
 * ({ diaSemana, numeroFranja, esDescanso, horaInicio, horaFin }) y el ViewModel de la UI semanal.
 */

import { DAYS_OF_WEEK } from './formatters.js';

const DEFAULT_T1_START = '09:00';
const DEFAULT_T1_END = '13:00';
const DEFAULT_T2_START = '14:00';
const DEFAULT_T2_END = '19:00';

function toHHMM(timeStr) {
  if (!timeStr || typeof timeStr !== 'string') return '';
  const trimmed = timeStr.trim();
  const match12 = trimmed.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (match12) {
    let h = parseInt(match12[1], 10);
    const m = match12[2];
    const period = match12[3].toUpperCase();
    if (period === 'PM' && h < 12) h += 12;
    if (period === 'AM' && h === 12) h = 0;
    return `${String(h).padStart(2, '0')}:${m}`;
  }
  return trimmed.slice(0, 5);
}

function minutesDiff(startHHMM, endHHMM) {
  if (!startHHMM || !endHHMM) return 0;
  const [sh, sm] = startHHMM.split(':').map(Number);
  const [eh, em] = endHHMM.split(':').map(Number);
  if (Number.isNaN(sh) || Number.isNaN(eh)) return 0;
  return Math.max(0, (eh * 60 + (em || 0)) - (sh * 60 + (sm || 0)));
}

export function computeDayMetrics(dayItem) {
  if (!dayItem?.activo) {
    return { horas: 0, bloques: 0 };
  }
  const mins1 = minutesDiff(dayItem.t1Inicio, dayItem.t1Fin);
  const mins2 = dayItem.hasT2 ? minutesDiff(dayItem.t2Inicio, dayItem.t2Fin) : 0;
  const totalMins = mins1 + mins2;
  return {
    horas: Number((totalMins / 60).toFixed(1).replace(/\.0$/, '')),
    bloques: Math.floor(totalMins / 30)
  };
}

/**
 * Normaliza un arreglo de horarios de la API (o datos UI parciales) en exactamente 7 días ordenados.
 * Garantiza que nunca exista `dia === undefined`.
 * @param {Array} rows
 * @returns {Array}
 */
export function normalizeWeeklySchedule(rows = []) {
  const safeRows = Array.isArray(rows) ? rows : [];

  // Detectar si ya viene en formato ViewModel UI
  if (safeRows.length === 7 && safeRows.every((r) => typeof r.dia === 'string' && typeof r.diaSemana === 'number')) {
    return safeRows.map((r, idx) => {
      const normalized = {
        ...r,
        diaSemana: r.diaSemana || idx + 1,
        dia: r.dia || DAYS_OF_WEEK[idx]
      };
      return { ...normalized, ...computeDayMetrics(normalized) };
    });
  }

  return DAYS_OF_WEEK.map((dayName, idx) => {
    const diaSemana = idx + 1;
    const dayRows = safeRows.filter((r) => Number(r.diaSemana ?? r.dia_semana) === diaSemana);

    if (dayRows.length === 0) {
      const isSunday = diaSemana === 7;
      const base = {
        diaSemana,
        dia: dayName,
        activo: !isSunday,
        hasT2: !isSunday,
        t1Inicio: isSunday ? '' : DEFAULT_T1_START,
        t1Fin: isSunday ? '' : DEFAULT_T1_END,
        t2Inicio: isSunday ? '' : DEFAULT_T2_START,
        t2Fin: isSunday ? '' : DEFAULT_T2_END
      };
      return { ...base, ...computeDayMetrics(base) };
    }

    const franja1 = dayRows.find((r) => Number(r.numeroFranja ?? r.numero_franja ?? 1) === 1) || dayRows[0];
    const franja2 = dayRows.find((r) => Number(r.numeroFranja ?? r.numero_franja) === 2) || null;
    const allRest = dayRows.every((r) => Boolean(r.esDescanso ?? r.es_descanso));

    const base = {
      diaSemana,
      dia: dayName,
      activo: !allRest,
      hasT2: Boolean(franja2 && !(franja2.esDescanso ?? franja2.es_descanso)),
      t1Inicio: !allRest ? (toHHMM(franja1?.horaInicio ?? franja1?.hora_inicio) || DEFAULT_T1_START) : '',
      t1Fin: !allRest ? (toHHMM(franja1?.horaFin ?? franja1?.hora_fin) || DEFAULT_T1_END) : '',
      t2Inicio: franja2 && !allRest ? (toHHMM(franja2.horaInicio ?? franja2.hora_inicio) || DEFAULT_T2_START) : DEFAULT_T2_START,
      t2Fin: franja2 && !allRest ? (toHHMM(franja2.horaFin ?? franja2.hora_fin) || DEFAULT_T2_END) : DEFAULT_T2_END
    };
    return { ...base, ...computeDayMetrics(base) };
  });
}

/**
 * Serializa los 7 días del ViewModel UI al formato esperado por POST /api/v1/barberos/:id/horarios.
 * @param {Array} uiSchedule
 * @returns {Array}
 */
export function serializeWeeklySchedule(uiSchedule = []) {
  const days = normalizeWeeklySchedule(uiSchedule);
  const payload = [];

  for (const day of days) {
    if (!day.activo) {
      payload.push({
        diaSemana: day.diaSemana,
        numeroFranja: 1,
        esDescanso: true,
        horaInicio: null,
        horaFin: null
      });
      continue;
    }

    payload.push({
      diaSemana: day.diaSemana,
      numeroFranja: 1,
      esDescanso: false,
      horaInicio: `${toHHMM(day.t1Inicio) || DEFAULT_T1_START}:00`,
      horaFin: `${toHHMM(day.t1Fin) || DEFAULT_T1_END}:00`
    });

    if (day.hasT2 && day.t2Inicio && day.t2Fin) {
      payload.push({
        diaSemana: day.diaSemana,
        numeroFranja: 2,
        esDescanso: false,
        horaInicio: `${toHHMM(day.t2Inicio)}:00`,
        horaFin: `${toHHMM(day.t2Fin)}:00`
      });
    }
  }

  return payload;
}

/**
 * Genera opciones de tiempo en bloques exactos de 30 minutos (:00 y :30) de 06:00 a 22:00.
 * @returns {Array<{ value: string, label: string }>}
 */
export function getHalfHourTimeOptions() {
  const options = [];
  for (let h = 6; h <= 22; h++) {
    for (const m of ['00', '30']) {
      if (h === 22 && m === '30') break;
      const value = `${String(h).padStart(2, '0')}:${m}`;
      const period = h >= 12 ? 'PM' : 'AM';
      const h12 = h % 12 || 12;
      options.push({ value, label: `${String(h12).padStart(2, '0')}:${m} ${period}` });
    }
  }
  return options;
}
