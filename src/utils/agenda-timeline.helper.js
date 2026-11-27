/**
 * SmartBarber - Helpers puros de ViewModel para Línea de Tiempo Operativa (#agenda)
 * Desacopla matemática de grilla CSS (bloques 30m), detección de hora actual UTC-5
 * y proyecciones filtradas para escritorio y PWA móvil.
 */

export const AGENDA_HEADER_HEIGHT_PX = 48;
export const AGENDA_SLOT_HEIGHT_PX = 56;
export const AGENDA_START_HOUR = 8;
export const AGENDA_END_HOUR = 20;

/**
 * Convierte 'HH:mm' (24h) a minutos desde medianoche.
 */
export function timeToMinutes(timeStr) {
  if (!timeStr || typeof timeStr !== 'string') return AGENDA_START_HOUR * 60;
  const [hStr, mStr] = timeStr.split(':');
  const h = Number(hStr);
  const m = Number(mStr);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return AGENDA_START_HOUR * 60;
  return h * 60 + m;
}

/**
 * Genera las 24 franjas de 30 minutos de la jornada operativa (08:00 AM - 07:30 PM).
 */
export function generateAgendaTimeSlots() {
  const slots = [];
  const totalSlots = (AGENDA_END_HOUR - AGENDA_START_HOUR) * 2;
  for (let idx = 0; idx < totalSlots; idx += 1) {
    const totalMin = AGENDA_START_HOUR * 60 + idx * 30;
    const h24 = Math.floor(totalMin / 60);
    const min = totalMin % 60;
    const period = h24 >= 12 ? 'PM' : 'AM';
    const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
    const start = `${String(h24).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
    const label = `${String(h12).padStart(2, '0')}:${String(min).padStart(2, '0')} ${period}`;
    slots.push({
      index: idx,
      gridRow: idx + 2,
      start,
      label,
      minutes: totalMin
    });
  }
  return slots;
}

/**
 * Calcula posición exacta en CSS Grid (gridRowStart y span multi-bloque).
 */
export function computeAppointmentPlacement(apt, slotsCount = 24) {
  const originMin = AGENDA_START_HOUR * 60;
  const startMin = timeToMinutes(apt.timeStart);
  const rawIndex = Math.floor((startMin - originMin) / 30);
  const slotIndex = Math.max(0, Math.min(slotsCount - 1, rawIndex));

  const endMin = apt.timeEnd ? timeToMinutes(apt.timeEnd) : startMin + (Number(apt.durationMinutes) || 30);
  const computedBlocks = Math.max(1, Math.ceil((endMin - startMin) / 30));
  const rawSpan = Math.max(1, Number(apt.durationBlocks) || computedBlocks);
  const span = Math.min(rawSpan, slotsCount - slotIndex);

  const coveredIndices = [];
  for (let i = 0; i < span; i += 1) {
    coveredIndices.push(slotIndex + i);
  }

  return {
    slotIndex,
    gridRowStart: slotIndex + 2,
    span,
    coveredIndices
  };
}

/**
 * Minutos actuales desde medianoche en zona horaria America/Bogota (UTC-5).
 */
export function getCurrentBogotaMinutes(now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'America/Bogota',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }).format(now).split(':');
  const h = Number(parts[0]) || 0;
  const m = Number(parts[1]) || 0;
  return { minutes: h * 60 + m, label: `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}` };
}

/**
 * Determina si una franja horaria ya transcurrió según la fecha seleccionada.
 */
export function isSlotInPast(slotStart, selectedDateStr, todayStr, currentBogotaMinutes) {
  if (!selectedDateStr || !todayStr) return false;
  if (selectedDateStr < todayStr) return true;
  if (selectedDateStr > todayStr) return false;
  return timeToMinutes(slotStart) + 30 <= currentBogotaMinutes;
}

/**
 * Calcula coordenada vertical de la línea de hora actual dentro del grid (row 1 = header 48px).
 */
export function computeCurrentTimeLine(selectedDateStr, todayStr, now = new Date()) {
  if (!selectedDateStr || selectedDateStr !== todayStr) {
    return { visible: false, topPx: 0, label: '' };
  }
  const { minutes, label } = getCurrentBogotaMinutes(now);
  const startMin = AGENDA_START_HOUR * 60;
  const endMin = AGENDA_END_HOUR * 60;
  if (minutes < startMin || minutes > endMin) {
    return { visible: false, topPx: 0, label };
  }
  const topPx = Math.round(
    AGENDA_HEADER_HEIGHT_PX + ((minutes - startMin) / 30) * AGENDA_SLOT_HEIGHT_PX
  );
  return { visible: true, topPx, label };
}

/**
 * Filtra barberos visibles en agenda por chip seleccionado.
 */
export function filterAgendaBarbers(barbers = [], selectedBarberId = 'all') {
  if (!selectedBarberId || selectedBarberId === 'all') return barbers;
  const match = barbers.filter(b => b.id === selectedBarberId);
  return match.length > 0 ? match : barbers;
}

/**
 * Filtra citas visibles por búsqueda libre (cliente, servicio o código).
 */
export function filterAgendaAppointments(appointments = [], query = '') {
  const q = String(query || '').trim().toLowerCase();
  if (!q) return appointments;
  return appointments.filter(apt =>
    String(apt.clientName || '').toLowerCase().includes(q) ||
    String(apt.serviceName || '').toLowerCase().includes(q) ||
    String(apt.codigo || '').toLowerCase().includes(q) ||
    String(apt.barberName || '').toLowerCase().includes(q)
  );
}
