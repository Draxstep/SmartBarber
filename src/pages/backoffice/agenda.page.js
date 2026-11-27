/**
 * Backoffice Agenda & Operación Diaria Page
 * CSS Grid escalable (76px eje horario + columnas minmax(240px, 1fr)), bloques de 56px,
 * span proporcional multi-bloque, ejes sticky, selector móvil 1-barbero y vista Lista.
 */

import { backofficeStore } from './backoffice-state.js';
import { formatCOP, formatDateBogota, formatDurationBlocks, formatPlural, getTodayBogota } from '../../utils/formatters.js';
import {
  AGENDA_HEADER_HEIGHT_PX,
  AGENDA_SLOT_HEIGHT_PX,
  generateAgendaTimeSlots,
  computeAppointmentPlacement,
  getCurrentBogotaMinutes,
  isSlotInPast,
  computeCurrentTimeLine,
  filterAgendaBarbers,
  filterAgendaAppointments
} from '../../utils/agenda-timeline.helper.js';
import { openDialog } from '../../components/ui-dialog.js';
import { openDrawer } from '../../components/ui-drawer.js';
import { renderPaymentMethodSelector, attachPaymentMethodSelectorListeners } from '../../components/payment-method-selector.js';
import { renderStatusBadge } from '../../components/status-badge.js';
import { renderKpiCard } from '../../components/kpi-card.js';
import { renderActionButton } from '../../components/action-button.js';
import { renderUserAvatar } from '../../components/user-avatar.js';
import { Capabilities, can, getCurrentUserSafe, whenCan } from '../../utils/access-control.js';

let agendaViewMode = 'grid'; // 'grid' | 'list'
let agendaBarberFilter = 'all'; // 'all' | barberId
let mobileSelectedBarberId = null;
let agendaSearchQuery = '';

function getStatusAccentClasses(status) {
  switch (status) {
    case 'completada':
      return 'border-l-[#235D3A] bg-[#E3EFE7]/65';
    case 'confirmada':
      return 'border-l-[#1F3A5F] bg-[#E4ECF5]/65';
    case 'cancelada':
      return 'border-l-[#B3261E] bg-[#FCE8E6]/60 opacity-65';
    case 'no_asistio':
      return 'border-l-[#57534E] bg-[#E8DFCE]/75';
    default:
      return 'border-l-[#8A5300] bg-[#FDF1DC]/70';
  }
}

function getBarberLabel(barber, idx = 0) {
  const sillon = barber.chair || `Sillón ${String(idx + 1).padStart(2, '0')}`;
  return { name: barber.name || 'Barbero', sillon };
}

function findBarberAppointments(barber, appointments) {
  return appointments.filter(
    a => a.barberId === barber.id || a.barberoId === barber.id || (a.chairIndex === barber.chairIndex && !a.barberId)
  );
}

function renderAppointmentCard(match, placement, colStyle = '') {
  const statusClasses = getStatusAccentClasses(match.status);
  return `
    <div
      data-appointment-id="${match.id}"
      class="appointment-card cursor-pointer rounded-md border-l-4 ${statusClasses} border border-[#D5CBB8] px-2.5 py-1.5 flex flex-col justify-center gap-1 shadow-2xs hover:shadow-sm hover:border-[#1F3A5F] transition-all select-none overflow-hidden z-10 m-0.5"
      style="${colStyle} grid-row: ${placement.gridRowStart} / span ${placement.span};"
      title="${match.clientName} · ${match.serviceName} (${match.timeStart} - ${match.timeEnd})"
      tabindex="0"
      role="button"
      aria-label="Cita con ${match.clientName}, ${match.serviceName}, ${match.timeStart}"
    >
      <div class="flex items-center justify-between gap-1.5 min-w-0 leading-tight">
        <span class="font-sans font-bold text-xs text-[#1C1C1C] capitalize truncate">${match.clientName}</span>
        <span class="font-mono font-bold text-xs text-[#1C1C1C] tabular-nums shrink-0">${formatCOP(match.price)}</span>
      </div>
      <div class="flex items-center justify-between gap-1.5 min-w-0 leading-tight">
        <span class="text-xs text-[#4F4A42] truncate">${match.serviceName}</span>
        <span class="shrink-0">${renderStatusBadge(match.status, { size: 'sm' })}</span>
      </div>
    </div>
  `;
}

function renderSingleGrid({ barbers, appointments, slots, selectedDateStr, todayStr, nowMinutes, timeLine, viewportId }) {
  const gridCols = `76px repeat(${barbers.length}, minmax(240px, 1fr))`;

  const columnsHtml = barbers.map((barber, colIdx) => {
    const { sillon } = getBarberLabel(barber, colIdx);
    const colNum = colIdx + 2;
    const barberApts = findBarberAppointments(barber, appointments);

    const occupiedSlots = new Set();
    const placedApts = barberApts.map(apt => {
      const placement = computeAppointmentPlacement(apt, slots.length);
      placement.coveredIndices.forEach(i => occupiedSlots.add(i));
      return { apt, placement };
    });

    const headerCell = `
      <div
        class="agenda-sticky-header border-b border-l border-[#D5CBB8] px-3 flex items-center justify-center gap-2"
        style="grid-column: ${colNum}; grid-row: 1;"
      >
        ${renderUserAvatar({ name: barber.name, sizeClass: 'w-6 h-6', textClass: 'text-[10px]' })}
        <span class="font-sans font-bold text-xs text-[#1C1C1C] truncate">${barber.name}</span>
        <span class="font-mono text-xs text-[#57534E] shrink-0">(${sillon})</span>
      </div>
    `;

    const slotCells = slots.map(slot => {
      if (occupiedSlots.has(slot.index)) {
        return `
          <div
            class="border-t border-l border-[#D5CBB8]/40 bg-transparent pointer-events-none"
            style="grid-column: ${colNum}; grid-row: ${slot.gridRow};"
          ></div>
        `;
      }

      const past = isSlotInPast(slot.start, selectedDateStr, todayStr, nowMinutes);
      return `
        <button
          type="button"
          data-free-chair="${barber.chairIndex ?? colIdx}"
          data-free-time="${slot.start}"
          class="free-slot-block group border-t border-l border-[#D5CBB8]/40 flex items-center justify-center transition-colors cursor-pointer ${
            past ? 'bg-[#F4F1EC] opacity-75 hover:opacity-100 hover:bg-white' : 'bg-white/80 hover:bg-[#E4ECF5]/45'
          }"
          style="grid-column: ${colNum}; grid-row: ${slot.gridRow};"
          aria-label="Agendar walk-in a las ${slot.label} con ${barber.name}"
        >
          <span class="opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 transition-opacity duration-150 inline-flex items-center gap-1 text-xs font-semibold text-[#1F3A5F]">
            <span class="material-symbols-outlined text-[15px]" aria-hidden="true">add</span>
            <span>Agendar</span>
          </span>
        </button>
      `;
    }).join('');

    const aptCards = placedApts
      .map(({ apt, placement }) => renderAppointmentCard(apt, placement, `grid-column: ${colNum};`))
      .join('');

    return headerCell + slotCells + aptCards;
  }).join('');

  const timeColumnCells = slots.map(slot => `
    <div
      class="agenda-sticky-time border-t border-[#D5CBB8]/50 px-2 flex items-center justify-end font-mono text-xs text-[#57534E] font-semibold tabular-nums"
      style="grid-column: 1; grid-row: ${slot.gridRow};"
    >
      ${slot.label}
    </div>
  `).join('');

  const timeLineHtml = timeLine.visible ? `
    <div
      data-current-time-line="true"
      class="pointer-events-none absolute left-0 right-0 z-25 flex items-center"
      style="top: ${timeLine.topPx}px;"
      aria-hidden="true"
    >
      <span class="w-[76px] shrink-0 flex justify-end pr-1">
        <span class="bg-[#DC2626] text-white font-mono text-[10px] font-bold px-1.5 py-0.5 rounded shadow-xs">${timeLine.label}</span>
      </span>
      <div class="flex-1 h-[2px] bg-[#DC2626] relative">
        <span class="w-2.5 h-2.5 rounded-full bg-[#DC2626] absolute -left-1 -top-[4px]"></span>
      </div>
    </div>
  ` : '';

  return `
    <div id="${viewportId}" class="agenda-grid-viewport border border-[#D5CBB8] bg-white">
      <div
        class="relative min-w-full"
        style="display: grid; grid-template-columns: ${gridCols}; grid-template-rows: ${AGENDA_HEADER_HEIGHT_PX}px repeat(${slots.length}, ${AGENDA_SLOT_HEIGHT_PX}px);"
      >
        <div
          class="agenda-sticky-corner border-b border-[#D5CBB8] px-2 flex items-center justify-end font-sans text-xs font-semibold uppercase tracking-wider text-[#57534E]"
          style="grid-column: 1; grid-row: 1;"
        >
          Horario
        </div>
        ${timeColumnCells}
        ${columnsHtml}
        ${timeLineHtml}
      </div>
    </div>
  `;
}

function renderListTimeline(appointments, canViewAll) {
  if (appointments.length === 0) {
    return `
      <div class="py-12 text-center bg-white rounded-xl border border-[#D5CBB8] text-[#57534E]">
        <span class="material-symbols-outlined text-[32px] text-[#8C8272]" aria-hidden="true">event_busy</span>
        <p class="font-medium text-sm mt-1">No hay citas programadas con los filtros actuales.</p>
      </div>
    `;
  }

  const sorted = [...appointments].sort((a, b) => String(a.timeStart).localeCompare(String(b.timeStart)));

  return `
    <div class="overflow-x-auto bg-white border border-[#D5CBB8] rounded-xl">
      <table class="responsive-table w-full text-left border-collapse">
        <thead>
          <tr class="bg-[#E8DFCE] text-[#4F4A42] font-sans text-xs uppercase tracking-wider">
            <th class="py-3 px-4 font-semibold">Horario</th>
            <th class="py-3 px-4 font-semibold">Cliente</th>
            <th class="py-3 px-4 font-semibold">Servicio</th>
            ${canViewAll ? '<th class="py-3 px-4 font-semibold">Barbero</th>' : ''}
            <th class="py-3 px-4 font-semibold text-right">Valor</th>
            <th class="py-3 px-4 font-semibold text-center">Estado</th>
            <th class="py-3 px-4 font-semibold text-right">Acción</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-[#D5CBB8]/40 text-xs text-[#1C1C1C]">
          ${sorted.map(apt => `
            <tr class="hover:bg-[#FAF3E5] transition-colors">
              <td class="py-3 px-4 font-mono font-bold text-[#1F3A5F]" data-label="Horario">${apt.timeStart} - ${apt.timeEnd}</td>
              <td class="py-3 px-4 font-semibold capitalize" data-label="Cliente">${apt.clientName}</td>
              <td class="py-3 px-4 text-[#4F4A42]" data-label="Servicio">${apt.serviceName}</td>
              ${canViewAll ? `<td class="py-3 px-4 text-[#4F4A42]" data-label="Barbero">${apt.barberName || 'Asignado'}</td>` : ''}
              <td class="py-3 px-4 text-right font-mono font-bold" data-label="Valor">${formatCOP(apt.price)}</td>
              <td class="py-3 px-4 text-center" data-label="Estado">${renderStatusBadge(apt.status, { size: 'sm' })}</td>
              <td class="py-3 px-4 text-right" data-label="Acción">
                <button
                  type="button"
                  data-appointment-id="${apt.id}"
                  class="appointment-card touch-action min-h-[36px] px-3 py-1 rounded-lg border border-[#D5CBB8] bg-white hover:bg-[#FAF3E5] text-xs font-semibold text-[#1F3A5F] cursor-pointer"
                >
                  Gestionar
                </button>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
}

function renderAgendaTimelineBody() {
  const user = getCurrentUserSafe();
  const canViewAll = can(Capabilities.APPOINTMENTS_VIEW_ALL, user);
  const allBarbers = backofficeStore.getVisibleBarbers();
  const allAppointments = backofficeStore.getVisibleAppointments();

  const displayedBarbers = canViewAll ? filterAgendaBarbers(allBarbers, agendaBarberFilter) : allBarbers;
  const filteredAppointments = filterAgendaAppointments(allAppointments, agendaSearchQuery);

  if (agendaViewMode === 'list') {
    const scopeIds = new Set(displayedBarbers.map(b => b.id));
    const listApts = canViewAll
      ? filteredAppointments.filter(a => scopeIds.has(a.barberId || a.barberoId) || !a.barberId)
      : filteredAppointments;
    return renderListTimeline(listApts, canViewAll);
  }

  const slots = generateAgendaTimeSlots();
  const selectedDateStr = backofficeStore.selectedDate || getTodayBogota();
  const todayStr = getTodayBogota();
  const { minutes: nowMinutes } = getCurrentBogotaMinutes();
  const timeLine = computeCurrentTimeLine(selectedDateStr, todayStr);

  // En móvil (<= 768px): 1 barbero a la vez con switcher arriba
  const activeMobileBarber =
    displayedBarbers.find(b => b.id === mobileSelectedBarberId) || displayedBarbers[0];

  const desktopGridHtml = renderSingleGrid({
    barbers: displayedBarbers,
    appointments: filteredAppointments,
    slots,
    selectedDateStr,
    todayStr,
    nowMinutes,
    timeLine,
    viewportId: 'agenda-grid-viewport-desktop'
  });

  const mobileChips = allBarbers.length > 1 ? `
    <div class="flex items-center gap-2 overflow-x-auto pb-2 mb-2">
      ${allBarbers.map((b, idx) => {
        const count = findBarberAppointments(b, filteredAppointments).length;
        const isSelected = activeMobileBarber && b.id === activeMobileBarber.id;
        return `
          <button
            type="button"
            data-mobile-barber="${b.id}"
            class="btn-mobile-barber touch-action min-h-[36px] shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors cursor-pointer ${
              isSelected ? 'bg-[#1F3A5F] text-white border-[#1F3A5F]' : 'bg-white text-[#4F4A42] border-[#D5CBB8]'
            }"
          >
            ${getBarberLabel(b, idx).name} · ${count}
          </button>
        `;
      }).join('')}
    </div>
  ` : '';

  const mobileGridHtml = activeMobileBarber ? renderSingleGrid({
    barbers: [activeMobileBarber],
    appointments: filteredAppointments,
    slots,
    selectedDateStr,
    todayStr,
    nowMinutes,
    timeLine,
    viewportId: 'agenda-grid-viewport-mobile'
  }) : '';

  return `
    <div class="hidden md:block">${desktopGridHtml}</div>
    <div class="md:hidden">${mobileChips}${mobileGridHtml}</div>
  `;
}

export function renderAgendaPage() {
  const user = getCurrentUserSafe();
  const canViewAll = can(Capabilities.APPOINTMENTS_VIEW_ALL, user);
  const canViewAlerts = can(Capabilities.INVENTORY_ALERTS_VIEW, user);
  const kpis = backofficeStore.getKpis();
  const visibleBarbers = backofficeStore.getVisibleBarbers();
  const visibleAppointments = backofficeStore.getVisibleAppointments();

  const selectedDateStr = backofficeStore.selectedDate || getTodayBogota();
  const todayStr = getTodayBogota();
  const dateFormatted = formatDateBogota(`${selectedDateStr}T12:00:00`, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });

  const agendaGridTitle = canViewAll
    ? `Línea de Tiempo Operativa (${formatPlural(visibleBarbers.length, 'sillón', 'sillones')})`
    : `Mi Sillón de Trabajo · ${visibleBarbers[0]?.chair || 'Sillón 01'}`;

  return `
    <div class="flex flex-col gap-6">
      <!-- HEADER OPERACIONAL -->
      <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div class="flex items-center gap-2 flex-wrap">
            <h1 class="font-serif text-2xl sm:text-3xl font-bold text-[#1C1C1C] tracking-tight">
              Agenda & Operación Diaria
            </h1>
            <span class="px-2.5 py-0.5 rounded-full text-xs font-sans font-bold ${canViewAll ? 'bg-[#1F3A5F] text-white' : 'bg-[#8A5300] text-white'}">
              ${canViewAll ? 'Vista Global · Sede' : 'Mi Turno'}
            </span>
          </div>
        </div>

        <div class="flex flex-wrap items-center gap-3">
          <!-- Selector de Fecha -->
          <div class="inline-flex items-center bg-[#FAF7F2] border border-[#D5CBB8] rounded-lg p-1 shadow-2xs">
            <button id="btn-agenda-prev-day" aria-label="Día anterior" class="touch-action w-10 h-10 flex items-center justify-center rounded text-[#57534E] hover:text-[#1C1C1C] hover:bg-[#E8DFCE] transition-colors cursor-pointer" type="button">
              <span class="material-symbols-outlined text-[18px]" aria-hidden="true">chevron_left</span>
            </button>
            <div class="flex items-center gap-1.5 px-2.5 py-1 text-[#1C1C1C] font-semibold text-xs font-sans">
              <span class="material-symbols-outlined text-[16px] text-[#57534E]" aria-hidden="true">calendar_today</span>
              <span id="agenda-current-date-text">${dateFormatted}</span>
            </div>
            <button id="btn-agenda-next-day" aria-label="Día siguiente" class="touch-action w-10 h-10 flex items-center justify-center rounded text-[#57534E] hover:text-[#1C1C1C] hover:bg-[#E8DFCE] transition-colors cursor-pointer" type="button">
              <span class="material-symbols-outlined text-[18px]" aria-hidden="true">chevron_right</span>
            </button>
            ${selectedDateStr !== todayStr ? `
              <button id="btn-agenda-today" type="button" class="touch-action px-2.5 py-1.5 rounded text-xs font-semibold text-[#1F3A5F] hover:bg-[#E4ECF5] ml-1 cursor-pointer">
                Hoy
              </button>
            ` : ''}
          </div>

          <!-- CTA Constructivo Primario -->
          ${renderActionButton({
            id: 'btn-agenda-walkin',
            variant: 'primary',
            icon: 'flash_on',
            label: 'Registrar Corte (Walk-in)'
          })}
        </div>
      </div>

      <!-- 4 TARJETAS KPI ADAPTABLES POR CAPACIDADES (PBAC) -->
      <section aria-label="Indicadores del día" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        ${renderKpiCard({
          label: canViewAll ? 'Facturación Agenda Hoy' : 'Mis Ingresos de Hoy',
          value: formatCOP(kpis.ingresosHoy),
          caption: formatPlural(kpis.cortesRealizados, 'cobro registrado hoy', 'cobros registrados hoy'),
          icon: 'payments',
          iconBg: 'bg-[#E3EFE7]',
          iconColor: 'text-[#235D3A]'
        })}

        ${renderKpiCard({
          label: canViewAll ? 'Turnos en Agenda' : 'Mis Turnos Programados',
          value: kpis.turnosHoy,
          caption: `${kpis.pendientesHoy} por atender el día de hoy`,
          icon: 'calendar_month',
          iconBg: 'bg-[#E4ECF5]',
          iconColor: 'text-[#1F3A5F]'
        })}

        ${canViewAll ? renderKpiCard({
          label: 'Turnos Pendientes',
          value: kpis.pendientesHoy,
          caption: 'Por atender en sillones de la sede',
          icon: 'pending_actions',
          iconBg: 'bg-[#FAF7F2]',
          iconColor: 'text-[#1C1C1C]'
        }) : renderKpiCard({
          label: 'Mis Cortes Completados',
          value: kpis.cortesRealizados,
          caption: 'Con registro de cobro exitoso',
          icon: 'content_cut',
          iconBg: 'bg-[#FAF7F2]',
          iconColor: 'text-[#1C1C1C]'
        })}

        ${whenCan(Capabilities.INVENTORY_ALERTS_VIEW, () => renderKpiCard({
          label: 'Alertas Inventario',
          value: kpis.alertasInventario,
          caption: `${kpis.lowStockCount} stock bajo · ${formatPlural(kpis.outOfStockCount, 'agotado', 'agotados')}`,
          icon: 'warning',
          iconBg: kpis.alertasInventario > 0 ? 'bg-[#FDF1DC]' : 'bg-[#FAF7F2]',
          iconColor: kpis.alertasInventario > 0 ? 'text-[#8A5300]' : 'text-[#57534E]',
          href: canViewAlerts ? '#inventario' : '',
          actionLabel: canViewAlerts ? 'Ver inventario →' : ''
        }), () => renderKpiCard({
          label: 'Mi Comisión Estimada',
          value: formatCOP(kpis.comisionBarbero),
          caption: `${kpis.barberCommissionPct}% referencial sobre mis cortes`,
          icon: 'savings',
          iconBg: 'bg-[#E3EFE7]',
          iconColor: 'text-[#235D3A]'
        }), user)}
      </section>

      <!-- GRILLA OPERATIVA ESCALABLE -->
      <section aria-label="Línea de tiempo de la agenda" class="bg-[#FAF7F2] border border-[#D5CBB8] rounded-xl p-4 sm:p-5 shadow-xs flex flex-col gap-4">
        <div class="flex flex-col xl:flex-row xl:items-center justify-between gap-3 pb-3 border-b border-[#D5CBB8]">
          <div class="flex items-center gap-2">
            <span class="material-symbols-outlined text-[20px] text-[#1F3A5F]" aria-hidden="true">schedule</span>
            <h2 class="font-serif text-lg font-bold text-[#1C1C1C]">
              ${agendaGridTitle}
            </h2>
          </div>

          <div class="flex flex-wrap items-center gap-2.5">
            <!-- Búsqueda rápida en agenda -->
            <div class="relative min-w-[220px] flex-1 sm:flex-initial">
              <span class="material-symbols-outlined absolute left-3 top-2.5 text-[#57534E] text-[18px]" aria-hidden="true">search</span>
              <input
                type="text"
                id="agenda-search-input"
                value="${agendaSearchQuery}"
                placeholder="Buscar cliente o servicio"
                aria-label="Buscar citas en agenda"
                class="w-full h-10 pl-9 pr-3 bg-white border border-[#8C8272] rounded-lg text-xs text-[#1C1C1C] placeholder-[#57534E] focus:outline-none focus:ring-2 focus:ring-[#1F3A5F]"
              />
            </div>

            <!-- Toggle Grilla / Lista del día -->
            <div class="inline-flex items-center bg-[#E8DFCE] p-1 rounded-lg" role="group" aria-label="Modo de visualización de agenda">
              <button
                type="button"
                id="btn-view-grid"
                class="touch-action px-3 py-1.5 rounded text-xs font-semibold inline-flex items-center gap-1 cursor-pointer ${
                  agendaViewMode === 'grid' ? 'bg-white text-[#1F3A5F] shadow-xs' : 'text-[#57534E] hover:text-[#1C1C1C]'
                }"
              >
                <span class="material-symbols-outlined text-[15px]" aria-hidden="true">view_week</span>
                <span>Grilla</span>
              </button>
              <button
                type="button"
                id="btn-view-list"
                class="touch-action px-3 py-1.5 rounded text-xs font-semibold inline-flex items-center gap-1 cursor-pointer ${
                  agendaViewMode === 'list' ? 'bg-white text-[#1F3A5F] shadow-xs' : 'text-[#57534E] hover:text-[#1C1C1C]'
                }"
              >
                <span class="material-symbols-outlined text-[15px]" aria-hidden="true">view_list</span>
                <span>Lista del día</span>
              </button>
            </div>
          </div>
        </div>

        ${canViewAll && visibleBarbers.length > 1 ? `
          <!-- Chips de filtro por barbero (escritorio/tablet) -->
          <div class="hidden md:flex items-center gap-2 overflow-x-auto pb-1">
            <button
              type="button"
              data-barber-filter="all"
              class="btn-barber-filter touch-action min-h-[36px] shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors cursor-pointer ${
                agendaBarberFilter === 'all' ? 'bg-[#1F3A5F] text-white border-[#1F3A5F]' : 'bg-white text-[#4F4A42] border-[#D5CBB8] hover:border-[#1F3A5F]'
              }"
            >
              Todos (${visibleBarbers.length})
            </button>
            ${visibleBarbers.map((b, idx) => {
              const count = findBarberAppointments(b, visibleAppointments).length;
              const active = agendaBarberFilter === b.id;
              return `
                <button
                  type="button"
                  data-barber-filter="${b.id}"
                  class="btn-barber-filter touch-action min-h-[36px] shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors inline-flex items-center gap-1.5 cursor-pointer ${
                    active ? 'bg-[#1F3A5F] text-white border-[#1F3A5F]' : 'bg-white text-[#4F4A42] border-[#D5CBB8] hover:border-[#1F3A5F]'
                  }"
                >
                  <span>${getBarberLabel(b, idx).name}</span>
                  <span class="px-1.5 py-0.5 rounded-full text-[11px] font-mono ${active ? 'bg-white/20 text-white' : 'bg-[#E8DFCE] text-[#1C1C1C]'}">${count}</span>
                </button>
              `;
            }).join('')}
          </div>
        ` : ''}

        <!-- Contenedor dinámico del timeline -->
        <div id="agenda-timeline-body">
          ${renderAgendaTimelineBody()}
        </div>
      </section>
    </div>
  `;
}

function attachTimelineContentListeners(onUpdate, user, canViewAll) {
  // 1. Tarjetas de citas y botones "Gestionar" en lista
  const aptCards = document.querySelectorAll('.appointment-card');
  aptCards.forEach(card => {
    const openAptDrawer = () => {
      const aptId = card.getAttribute('data-appointment-id');
      const apt = backofficeStore.appointments.find(a => a.id === aptId);
      if (!apt) return;

      const isOwnAppointment = Boolean(user?.barberoId && (apt.barberId === user.barberoId || apt.barberoId === user.barberoId));
      const canOperateApt = canViewAll || isOwnAppointment;
      const canComplete = canOperateApt && can(Capabilities.APPOINTMENTS_COMPLETE, user);
      const canCancel = canOperateApt && can(Capabilities.APPOINTMENTS_CANCEL, user);

      const drawerPanel = openDrawer({
        title: apt.codigo ? `Cita ${apt.codigo} · ${apt.clientName}` : `Cita · ${apt.clientName}`,
        subtitle: `${apt.serviceName} · ${formatDurationBlocks(apt.durationMinutes)}`,
        position: 'right',
        contentHtml: `
          <div class="flex flex-col gap-5">
            <div class="bg-white p-4 rounded-xl border border-[#D5CBB8] space-y-2 text-xs">
              <div class="flex items-center justify-between">
                <span class="text-[#57534E]">Estado Actual:</span>
                ${renderStatusBadge(apt.status)}
              </div>
              ${canViewAll && apt.barberName ? `
                <div class="flex items-center justify-between">
                  <span class="text-[#57534E]">Barbero a Cargo:</span>
                  <span class="font-semibold text-[#1C1C1C]">${apt.barberName}</span>
                </div>
              ` : ''}
              <div class="flex items-center justify-between">
                <span class="text-[#57534E]">Horario:</span>
                <span class="font-mono font-bold text-[#1C1C1C]">${apt.timeStart} - ${apt.timeEnd}</span>
              </div>
              <div class="flex items-center justify-between">
                <span class="text-[#57534E]">Teléfono Cliente:</span>
                <span class="font-mono text-[#1C1C1C]">+57 ${apt.clientPhone}</span>
              </div>
              <div class="flex items-center justify-between pt-2 border-t border-[#D5CBB8]">
                <span class="text-[#57534E] font-bold">Valor a Liquidar:</span>
                <span class="font-mono text-base font-bold text-[#1F3A5F]">${formatCOP(apt.price)}</span>
              </div>
            </div>

            <div class="flex flex-col gap-2">
              <span class="font-sans text-xs uppercase tracking-wider text-[#57534E] font-bold">Acciones Operacionales</span>

              ${canComplete && apt.status !== 'completada' ? `
                <button
                  type="button"
                  id="drawer-btn-complete-pay"
                  class="min-h-[44px] px-4 rounded-lg bg-[#235D3A] hover:bg-[#1a472c] text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer"
                >
                  <span class="material-symbols-outlined text-[18px]" aria-hidden="true">payments</span>
                  <span>Marcar como Completada & Cobrar</span>
                </button>
              ` : apt.status === 'completada' ? `
                <div class="p-3 rounded-lg bg-[#E3EFE7] border border-[#235D3A]/30 text-xs text-[#235D3A] flex items-center gap-2">
                  <span class="material-symbols-outlined text-[18px]" aria-hidden="true">verified</span>
                  <span>Corte completado y cobrado (${apt.paymentMethod ? apt.paymentMethod.toUpperCase() : 'EFECTIVO'}).</span>
                </div>
              ` : ''}

              ${canOperateApt && apt.status !== 'no_asistio' && apt.status !== 'completada' ? `
                <button
                  type="button"
                  id="drawer-btn-mark-noshow"
                  class="min-h-[44px] px-4 rounded-lg bg-white border border-[#D5CBB8] hover:bg-[#E8DFCE] text-[#4F4A42] font-semibold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
                >
                  <span class="material-symbols-outlined text-[18px]" aria-hidden="true">person_off</span>
                  <span>Marcar como No Asistió</span>
                </button>
              ` : ''}

              ${canCancel && apt.status !== 'cancelada' && apt.status !== 'completada' ? `
                <button
                  type="button"
                  id="drawer-btn-cancel-apt"
                  class="min-h-[44px] px-4 rounded-lg bg-[#FCE8E6] border border-[#B3261E] text-[#B3261E] hover:bg-[#B3261E] hover:text-white font-semibold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
                >
                  <span class="material-symbols-outlined text-[18px]" aria-hidden="true">cancel</span>
                  <span>Anular Cita</span>
                </button>
              ` : ''}
            </div>
          </div>
        `
      });

      const btnPay = drawerPanel.querySelector('#drawer-btn-complete-pay');
      if (btnPay) {
        btnPay.addEventListener('click', () => {
          const dialogEl = openDialog({
            title: `Cobro en Caja: ${apt.serviceName}`,
            subtitle: `Cliente: ${apt.clientName} · Total: ${formatCOP(apt.price)}`,
            contentHtml: `
              <div class="flex flex-col gap-4">
                ${renderPaymentMethodSelector({ selectedMethod: 'efectivo', name: 'pago_caja_metodo' })}
              </div>
            `,
            confirmText: 'Registrar Cobro',
            cancelText: 'Volver',
            confirmVariant: 'primary',
            onConfirm: async () => {
              const methodInput = document.getElementById('pago_caja_metodo');
              const selectedMethod = methodInput ? methodInput.value : 'efectivo';
              await backofficeStore.completeAppointment(apt.id, selectedMethod);
              onUpdate();
              return true;
            }
          });
          if (dialogEl) attachPaymentMethodSelectorListeners(dialogEl);
        });
      }

      const btnNoShow = drawerPanel.querySelector('#drawer-btn-mark-noshow');
      if (btnNoShow) {
        btnNoShow.addEventListener('click', async () => {
          await backofficeStore.markNoShow(apt.id);
          onUpdate();
        });
      }

      const btnCancel = drawerPanel.querySelector('#drawer-btn-cancel-apt');
      if (btnCancel) {
        btnCancel.addEventListener('click', () => {
          openDialog({
            title: `¿Anular cita de ${apt.clientName}?`,
            contentHtml: `<p class="text-xs text-[#B3261E]">Esta acción cancela la cita${apt.codigo ? ` <strong>${apt.codigo}</strong>` : ''} de ${apt.clientName}.</p>`,
            confirmText: 'Sí, Anular',
            confirmVariant: 'danger',
            onConfirm: async () => {
              await backofficeStore.cancelAppointment(apt.id);
              onUpdate();
              return true;
            }
          });
        });
      }
    };

    card.addEventListener('click', openAptDrawer);
    card.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        openAptDrawer();
      }
    });
  });

  // 2. Bloques disponibles -> Abrir Walk-in directo
  const freeBlocks = document.querySelectorAll('.free-slot-block');
  freeBlocks.forEach(block => {
    block.addEventListener('click', () => {
      const chairIndex = parseInt(block.getAttribute('data-free-chair'), 10) || 0;
      const freeTime = block.getAttribute('data-free-time') || '10:00';
      openWalkinModal(onUpdate, chairIndex, freeTime);
    });
  });

  // 3. Switcher móvil de barbero único
  const mobileBtns = document.querySelectorAll('.btn-mobile-barber');
  mobileBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      mobileSelectedBarberId = btn.getAttribute('data-mobile-barber');
      const bodyEl = document.getElementById('agenda-timeline-body');
      if (bodyEl) {
        bodyEl.innerHTML = renderAgendaTimelineBody();
        attachTimelineContentListeners(onUpdate, user, canViewAll);
      }
    });
  });
}

export function attachAgendaListeners(onUpdate) {
  const user = getCurrentUserSafe();
  const canViewAll = can(Capabilities.APPOINTMENTS_VIEW_ALL, user);

  attachTimelineContentListeners(onUpdate, user, canViewAll);

  // Auto-scroll hacia la hora actual en viewport visible
  const timeLineInfo = computeCurrentTimeLine(
    backofficeStore.selectedDate || getTodayBogota(),
    getTodayBogota()
  );
  if (timeLineInfo.visible) {
    ['agenda-grid-viewport-desktop', 'agenda-grid-viewport-mobile'].forEach(vpId => {
      const vp = document.getElementById(vpId);
      if (vp && timeLineInfo.topPx > 140) {
        vp.scrollTop = Math.max(0, timeLineInfo.topPx - 140);
      }
    });
  }

  // Selector de fecha
  const btnPrevDay = document.getElementById('btn-agenda-prev-day');
  if (btnPrevDay) {
    btnPrevDay.addEventListener('click', async () => {
      const cur = new Date(`${backofficeStore.selectedDate || getTodayBogota()}T12:00:00`);
      cur.setDate(cur.getDate() - 1);
      const newDate = cur.toISOString().split('T')[0];
      await backofficeStore.loadAgendaData(newDate);
      onUpdate();
    });
  }

  const btnNextDay = document.getElementById('btn-agenda-next-day');
  if (btnNextDay) {
    btnNextDay.addEventListener('click', async () => {
      const cur = new Date(`${backofficeStore.selectedDate || getTodayBogota()}T12:00:00`);
      cur.setDate(cur.getDate() + 1);
      const newDate = cur.toISOString().split('T')[0];
      await backofficeStore.loadAgendaData(newDate);
      onUpdate();
    });
  }

  const btnToday = document.getElementById('btn-agenda-today');
  if (btnToday) {
    btnToday.addEventListener('click', async () => {
      await backofficeStore.loadAgendaData(getTodayBogota());
      onUpdate();
    });
  }

  // Botón Walk-in POS
  const btnWalkin = document.getElementById('btn-agenda-walkin');
  if (btnWalkin) {
    btnWalkin.addEventListener('click', () => openWalkinModal(onUpdate));
  }

  // Filtros de barbero (escritorio)
  const barberFilterBtns = document.querySelectorAll('.btn-barber-filter');
  barberFilterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      agendaBarberFilter = btn.getAttribute('data-barber-filter') || 'all';
      onUpdate();
    });
  });

  // Switch Grilla / Lista del día
  const btnGrid = document.getElementById('btn-view-grid');
  const btnList = document.getElementById('btn-view-list');
  if (btnGrid) {
    btnGrid.addEventListener('click', () => {
      if (agendaViewMode !== 'grid') {
        agendaViewMode = 'grid';
        onUpdate();
      }
    });
  }
  if (btnList) {
    btnList.addEventListener('click', () => {
      if (agendaViewMode !== 'list') {
        agendaViewMode = 'list';
        onUpdate();
      }
    });
  }

  // Búsqueda granular en timeline sin perder foco
  const searchInput = document.getElementById('agenda-search-input');
  if (searchInput) {
    let timeout;
    searchInput.addEventListener('input', (e) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        agendaSearchQuery = e.target.value;
        const bodyEl = document.getElementById('agenda-timeline-body');
        if (bodyEl) {
          bodyEl.innerHTML = renderAgendaTimelineBody();
          attachTimelineContentListeners(onUpdate, user, canViewAll);
        }
      }, 150);
    });
  }
}

function openWalkinModal(onUpdate, defaultChair = 0, defaultTime = '10:00') {
  const user = getCurrentUserSafe();
  const canAssignAnyBarber = can(Capabilities.CUTS_ASSIGN_ANY_BARBER, user);
  const visibleBarbers = backofficeStore.getVisibleBarbers();
  const catalogServices = backofficeStore.services || [];

  const preselectedBarberId = canAssignAnyBarber
    ? (visibleBarbers[defaultChair]?.id || user?.barberoId || visibleBarbers[0]?.id || '')
    : (user?.barberoId || visibleBarbers[0]?.id || '');

  const dialogEl = openDialog({
    title: 'Registrar Corte Walk-in (Mostrador)',
    contentHtml: `
      <form id="form-walkin" class="flex flex-col gap-4">
        <!-- 1. Sillón / Barbero -->
        <div class="flex flex-col gap-1">
          <label for="walkin-chair" class="font-sans font-semibold text-xs text-[#1C1C1C]">Sillón / Barbero</label>
          <select
            id="walkin-chair"
            ${canAssignAnyBarber ? '' : 'disabled'}
            class="h-10 px-3 rounded-md border border-[#8C8272] text-xs font-semibold text-[#1C1C1C] ${canAssignAnyBarber ? 'bg-white' : 'bg-[#E8DFCE]/70 text-[#4F4A42] cursor-not-allowed'}"
          >
            ${visibleBarbers.map((b, idx) => `
              <option value="${b.id}" data-chair-index="${b.chairIndex ?? idx}" ${b.id === preselectedBarberId ? 'selected' : ''}>
                ${b.chair || `Sillón ${String(idx + 1).padStart(2, '0')}`} - ${b.name}
              </option>
            `).join('')}
          </select>
          ${!canAssignAnyBarber ? `<span class="text-xs text-[#57534E]">Perfil asignado automáticamente a tu sesión de barbero.</span>` : ''}
        </div>

        <!-- 2. Servicio -->
        <div class="flex flex-col gap-1">
          <label for="walkin-service" class="font-sans font-semibold text-xs text-[#1C1C1C]">Servicio Realizado</label>
          <select id="walkin-service" class="h-10 px-3 rounded-md bg-white border border-[#8C8272] text-xs font-semibold text-[#1C1C1C]">
            ${catalogServices.length > 0 ? catalogServices.map(s => `
              <option value="${s.id}" data-name="${s.nombre}" data-price="${s.precio}" data-duration="${s.duracionMinutos || 30}">
                ${s.nombre} · ${formatCOP(s.precio)} (${s.duracionMinutos || 30} min)
              </option>
            `).join('') : `
              <option value="" data-name="Corte Clásico" data-price="25000" data-duration="30">Corte Clásico Tradicional · $ 25.000 COP (30 min)</option>
            `}
          </select>
        </div>

        <!-- 3. Nombre Cliente -->
        <div class="flex flex-col gap-1">
          <label for="walkin-client-name" class="font-sans font-semibold text-xs text-[#1C1C1C]">Nombre del Cliente</label>
          <input
            type="text"
            id="walkin-client-name"
            value="Cliente Mostrador"
            class="h-10 px-3 rounded-md bg-white border border-[#8C8272] text-xs text-[#1C1C1C]"
          />
        </div>

        <!-- 4. Método de Pago -->
        ${renderPaymentMethodSelector({ selectedMethod: 'efectivo', name: 'walkin_metodo_pago' })}
      </form>
    `,
    confirmText: 'Registrar y Cobrar',
    cancelText: 'Cancelar',
    confirmVariant: 'primary',
    onConfirm: async () => {
      const chairSelectEl = document.getElementById('walkin-chair');
      const selectedBarberOpt = chairSelectEl?.options[chairSelectEl.selectedIndex];
      const barberId = chairSelectEl?.value || preselectedBarberId;
      const chairIndex = parseInt(selectedBarberOpt?.getAttribute('data-chair-index'), 10) || 0;

      const srvSelectEl = document.getElementById('walkin-service');
      const selectedSrvOpt = srvSelectEl?.options[srvSelectEl.selectedIndex];
      const serviceId = srvSelectEl?.value || null;
      const serviceName = selectedSrvOpt?.getAttribute('data-name') || 'Corte Clásico';
      const price = parseInt(selectedSrvOpt?.getAttribute('data-price'), 10) || 25000;
      const durationMinutes = parseInt(selectedSrvOpt?.getAttribute('data-duration'), 10) || 30;

      const clientName = document.getElementById('walkin-client-name').value.trim() || 'Cliente Mostrador';
      const paymentInput = document.getElementById('walkin_metodo_pago');
      const paymentMethod = paymentInput ? paymentInput.value : 'efectivo';

      await backofficeStore.addWalkinCut({
        barberId,
        chairIndex,
        clientName,
        serviceId,
        serviceName,
        price,
        durationMinutes,
        paymentMethod,
        timeStart: defaultTime
      });

      onUpdate();
      return true;
    }
  });

  if (dialogEl) attachPaymentMethodSelectorListeners(dialogEl);
}
