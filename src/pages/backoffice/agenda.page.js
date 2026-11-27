/**
 * Backoffice Agenda & Operación Diaria Page
 * Conforme a DESIGN.md: altura de bloque exacta = bloques * 48px.
 * Multi-bloques proporcionales, Role Switcher y Walk-in POS en <= 4 clics.
 */

import { backofficeStore } from './backoffice-state.js';
import { formatCOP, formatDurationBlocks, getTodayBogota } from '../../utils/formatters.js';
import { openDialog } from '../../components/ui-dialog.js';
import { openDrawer } from '../../components/ui-drawer.js';
import { renderPaymentMethodSelector, attachPaymentMethodSelectorListeners } from '../../components/payment-method-selector.js';
import { renderStatusBadge } from '../../components/status-badge.js';
import { renderKpiCard } from '../../components/kpi-card.js';
import { Capabilities, can, getCurrentUserSafe, whenCan } from '../../utils/access-control.js';

export function renderAgendaPage() {
  const user = getCurrentUserSafe();
  const canViewAll = can(Capabilities.APPOINTMENTS_VIEW_ALL, user);
  const canViewAlerts = can(Capabilities.INVENTORY_ALERTS_VIEW, user);
  const kpis = backofficeStore.getKpis();
  const visibleBarbers = backofficeStore.getVisibleBarbers();
  const visibleAppointments = backofficeStore.getVisibleAppointments();

  const timeRows = [
    { start: '08:00', label: '08:00 AM' },
    { start: '08:30', label: '08:30 AM' },
    { start: '09:00', label: '09:00 AM' },
    { start: '09:30', label: '09:30 AM' },
    { start: '10:00', label: '10:00 AM' },
    { start: '10:30', label: '10:30 AM' },
    { start: '11:00', label: '11:00 AM' },
    { start: '11:30', label: '11:30 AM' },
    { start: '12:00', label: '12:00 PM' },
    { start: '12:30', label: '12:30 PM' },
    { start: '13:00', label: '01:00 PM' },
    { start: '13:30', label: '01:30 PM' },
    { start: '14:00', label: '02:00 PM' },
    { start: '14:30', label: '02:30 PM' },
    { start: '15:00', label: '03:00 PM' },
    { start: '15:30', label: '03:30 PM' },
    { start: '16:00', label: '04:00 PM' },
    { start: '16:30', label: '04:30 PM' },
    { start: '17:00', label: '05:00 PM' },
    { start: '17:30', label: '05:30 PM' },
    { start: '18:00', label: '06:00 PM' },
    { start: '18:30', label: '06:30 PM' },
    { start: '19:00', label: '07:00 PM' },
    { start: '19:30', label: '07:30 PM' }
  ];

  // Configuración dinámica de grid según cantidad de sillones visibles
  const barberColumns = Math.max(1, visibleBarbers.length);
  const gridTemplateStyle = `grid-template-columns: 80px repeat(${barberColumns}, minmax(200px, 1fr));`;

  const selectedDateStr = backofficeStore.selectedDate || getTodayBogota();
  const dateFormatted = new Date(`${selectedDateStr}T12:00:00`).toLocaleDateString('es-CO', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });

  const agendaGridTitle = canViewAll
    ? `Línea de Tiempo Operativa (${visibleBarbers.length} Sillones)`
    : `Mi Sillón de Trabajo · ${visibleBarbers[0]?.chair || 'Sillón 1'}`;

  return `
    <div class="flex flex-col gap-6">
      <!-- HEADER OPERACIONAL -->
      <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div class="flex items-center gap-2">
            <h1 class="font-serif text-2xl sm:text-3xl font-bold text-[#1C1C1C] tracking-tight">
              Agenda & Operación Diaria
            </h1>
            <span class="px-2 py-0.5 rounded-full text-[11px] font-sans font-bold ${canViewAll ? 'bg-[#1F3A5F] text-white' : 'bg-[#8B1E1E] text-white'}">
              ${canViewAll ? 'Vista Global · Sede' : 'Mi Turno'}
            </span>
          </div>
        </div>

        <div class="flex flex-wrap items-center gap-3">
          <!-- Selector de Fecha -->
          <div class="inline-flex items-center bg-[#FAF7F2] border border-[#D5CBB8] rounded-lg p-1 shadow-2xs">
            <button id="btn-agenda-prev-day" aria-label="Día anterior" class="w-8 h-8 flex items-center justify-center rounded text-[#6B645A] hover:text-[#1C1C1C] hover:bg-[#E8DFCE] transition-colors" type="button">
              <span class="material-symbols-outlined text-[18px]">chevron_left</span>
            </button>
            <div class="flex items-center gap-1.5 px-2.5 py-1 text-[#1C1C1C] font-semibold text-xs font-sans">
              <span class="material-symbols-outlined text-[16px] text-[#6B645A]">calendar_today</span>
              <span id="agenda-current-date-text" class="capitalize">${dateFormatted}</span>
            </div>
            <button id="btn-agenda-next-day" aria-label="Día siguiente" class="w-8 h-8 flex items-center justify-center rounded text-[#6B645A] hover:text-[#1C1C1C] hover:bg-[#E8DFCE] transition-colors" type="button">
              <span class="material-symbols-outlined text-[18px]">chevron_right</span>
            </button>
          </div>

          <!-- Botones de Acción -->
          <div class="flex items-center gap-2">
            <button
              id="btn-agenda-walkin"
              type="button"
              class="min-h-[40px] px-4 py-1.5 rounded-lg bg-[#8B1E1E] hover:bg-[#6E1616] text-white font-semibold text-xs shadow-sm transition-all flex items-center gap-1.5 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1F3A5F]"
            >
              <span class="material-symbols-outlined text-[18px]">flash_on</span>
              <span>+ Registrar Corte (Walk-in)</span>
            </button>
          </div>
        </div>
      </div>

      <!-- 4 TARJETAS KPI ADAPTABLES POR CAPACIDADES (PBAC) -->
      <section aria-label="Indicadores del día" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        ${renderKpiCard({
          label: canViewAll ? 'Facturación Agenda Hoy' : 'Mis Ingresos de Hoy',
          value: formatCOP(kpis.ingresosHoy),
          caption: `${kpis.cortesRealizados} cobro(s) registrado(s) hoy`,
          icon: 'payments',
          iconBg: 'bg-[#E3EFE7]',
          iconColor: 'text-[#235D3A]'
        })}

        ${renderKpiCard({
          label: canViewAll ? 'Turnos en Agenda (Global)' : 'Mis Turnos Programados',
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
          caption: `${kpis.lowStockCount} stock bajo · ${kpis.outOfStockCount} agotado(s)`,
          icon: 'warning',
          iconBg: kpis.alertasInventario > 0 ? 'bg-[#FDF1DC]' : 'bg-[#FAF7F2]',
          iconColor: kpis.alertasInventario > 0 ? 'text-[#8A5300]' : 'text-[#6B645A]'
        }), () => renderKpiCard({
          label: 'Mi Comisión Estimada',
          value: formatCOP(kpis.comisionBarbero),
          caption: `${kpis.barberCommissionPct}% referencial sobre mis cortes`,
          icon: 'savings',
          iconBg: 'bg-[#E3EFE7]',
          iconColor: 'text-[#235D3A]'
        }), user)}
      </section>

      <!-- GRILLA OPERATIVA (CADA BLOQUE = 48PX) -->
      <section aria-label="Línea de tiempo de la agenda" class="bg-[#FAF7F2] border border-[#D5CBB8] rounded-xl p-4 sm:p-5 shadow-xs flex flex-col">
        <div class="flex items-center justify-between pb-3 border-b border-[#D5CBB8] mb-4">
          <div class="flex items-center gap-2">
            <span class="material-symbols-outlined text-[20px] text-[#1F3A5F]">schedule</span>
            <h2 class="font-serif text-lg font-bold text-[#1C1C1C]">
              ${agendaGridTitle}
            </h2>
          </div>
        </div>

        <div class="overflow-x-auto">
          <div class="min-w-[460px]">
            <!-- SILLONES HEADER -->
            <div class="grid gap-2 border-b border-[#D5CBB8] pb-2 font-sans font-semibold text-xs text-[#1C1C1C] text-center" style="${gridTemplateStyle}">
              <div class="text-left text-[#6B645A]">Horario</div>
              ${visibleBarbers.map(b => `
                <div class="bg-white p-2 rounded-md border border-[#D5CBB8] flex items-center justify-center gap-2 shadow-2xs">
                  <span class="w-2.5 h-2.5 rounded-full bg-[#235D3A]"></span>
                  <span class="font-bold">${b.name}</span>
                  <span class="text-[#6B645A] font-normal">(${b.chair})</span>
                </div>
              `).join('')}
            </div>

            <!-- TIMELINE GRID ROWS -->
            <div class="divide-y divide-[#D5CBB8]/50 mt-1" id="agenda-timeline-grid">
              ${timeRows.map(row => {
                return `
                  <div class="grid gap-2 min-h-[48px] items-stretch py-1 relative" style="${gridTemplateStyle}">
                <!-- Columna Hora -->
                <div class="font-mono text-xs text-[#6B645A] font-semibold flex items-center tabular-nums">
                  ${row.label}
                </div>

                <!-- Columnas por Sillón Visible -->
                ${visibleBarbers.map((barber, colIdx) => {
                  const targetChairIndex = barber.chairIndex;
                  const match = visibleAppointments.find(
                    a => (a.barberId === barber.id || a.barberoId === barber.id || (a.chairIndex === targetChairIndex && !a.barberId)) && a.timeStart === row.start
                  );

                  if (match) {
                    const blockHeightPx = match.durationBlocks * 48;
                    const statusBorderColor = match.status === 'completada' ? 'border-l-[#235D3A] bg-[#E3EFE7]/50' :
                      (match.status === 'confirmada' ? 'border-l-[#1F3A5F] bg-[#E4ECF5]/50' :
                      (match.status === 'cancelada' ? 'border-l-[#B3261E] bg-[#FCE8E6]/50 opacity-60' :
                      (match.status === 'no_asistio' ? 'border-l-[#4F4A42] bg-[#E8DFCE]/60' : 'border-l-[#8A5300] bg-[#FDF1DC]/60')));

                    return `
                      <div
                        data-appointment-id="${match.id}"
                        class="appointment-card cursor-pointer rounded-md border-l-4 ${statusBorderColor} border border-[#D5CBB8] p-2 flex flex-col justify-between shadow-2xs hover:shadow-xs hover:border-[#1F3A5F] transition-all select-none"
                        style="min-height: ${blockHeightPx}px;"
                        title="Clic para ver acciones de ${match.clientName}"
                        tabindex="0"
                        role="button"
                      >
                        <div class="flex items-center justify-between gap-1">
                          <span class="font-sans font-bold text-xs text-[#1C1C1C] truncate">${match.clientName}</span>
                          ${match.codigo ? `<span class="font-mono text-[10px] text-[#6B645A] shrink-0">${match.codigo}</span>` : ''}
                        </div>
                        <div class="flex items-center justify-between mt-1 text-[11px]">
                          <span class="text-[#4F4A42] truncate">${match.serviceName}</span>
                          <span class="font-mono font-bold text-[#1C1C1C] tabular-nums">${formatCOP(match.price)}</span>
                        </div>
                        <div class="flex items-center justify-between mt-1 pt-1 border-t border-[#D5CBB8]/50">
                          <span class="font-mono text-[10px] text-[#6B645A]">${match.timeStart} - ${match.timeEnd}</span>
                          ${renderStatusBadge(match.status, { size: 'sm' })}
                        </div>
                      </div>
                    `;
                  }

                  // Verificar si está cubierto por un turno multi-bloque previo
                  const isCoveredByMultiBlock = visibleAppointments.some(
                    a => (a.barberId === barber.id || a.barberoId === barber.id || (a.chairIndex === targetChairIndex && !a.barberId)) && a.timeEnd > row.start && a.timeStart < row.start
                  );

                  if (isCoveredByMultiBlock) {
                    return `<div class="bg-transparent"></div>`;
                  }

                  return `
                    <div
                      data-free-chair="${targetChairIndex}"
                      data-free-time="${row.start}"
                      class="free-slot-block border border-dashed border-[#D5CBB8]/60 rounded-md bg-[#FAF7F2]/40 hover:bg-white hover:border-[#1F3A5F] transition-colors cursor-pointer flex items-center justify-center text-[#BDB4A5] hover:text-[#1F3A5F] text-xs"
                      title="Turno disponible. Clic para registrar Walk-in"
                    >
                      <span class="material-symbols-outlined text-[16px]">add</span>
                    </div>
                  `;
                }).join('')}
              </div>
            `;
          }).join('')}
            </div>
          </div>
        </div>
      </section>
    </div>
  `;
}

export function attachAgendaListeners(onUpdate) {
  const user = getCurrentUserSafe();
  const canViewAll = can(Capabilities.APPOINTMENTS_VIEW_ALL, user);

  // Clic en tarjeta de cita -> Abre Drawer o Modal de Detalle y Acciones
  const aptCards = document.querySelectorAll('.appointment-card');
  aptCards.forEach(card => {
    card.addEventListener('click', () => {
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
            <!-- Datos Generales -->
            <div class="bg-white p-4 rounded-xl border border-[#D5CBB8] space-y-2 text-xs">
              <div class="flex items-center justify-between">
                <span class="text-[#6B645A]">Estado Actual:</span>
                ${renderStatusBadge(apt.status)}
              </div>
              ${canViewAll && apt.barberName ? `
                <div class="flex items-center justify-between">
                  <span class="text-[#6B645A]">Barbero a Cargo:</span>
                  <span class="font-semibold text-[#1C1C1C]">${apt.barberName}</span>
                </div>
              ` : ''}
              <div class="flex items-center justify-between">
                <span class="text-[#6B645A]">Horario:</span>
                <span class="font-mono font-bold text-[#1C1C1C]">${apt.timeStart} - ${apt.timeEnd}</span>
              </div>
              <div class="flex items-center justify-between">
                <span class="text-[#6B645A]">Teléfono Cliente:</span>
                <span class="font-mono text-[#1C1C1C]">+57 ${apt.clientPhone}</span>
              </div>
              <div class="flex items-center justify-between pt-2 border-t border-[#D5CBB8]">
                <span class="text-[#6B645A] font-bold">Valor a Liquidar:</span>
                <span class="font-mono text-base font-bold text-[#1F3A5F]">${formatCOP(apt.price)}</span>
              </div>
            </div>

            <!-- Botones de Acción Operativa -->
            <div class="flex flex-col gap-2">
              <span class="font-sans text-xs uppercase tracking-wider text-[#6B645A] font-bold">Acciones Operacionales</span>

              ${canComplete && apt.status !== 'completada' ? `
                <button
                  type="button"
                  id="drawer-btn-complete-pay"
                  class="min-h-[44px] px-4 rounded-lg bg-[#235D3A] hover:bg-[#1a472c] text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-sm transition-all"
                >
                  <span class="material-symbols-outlined text-[18px]">payments</span>
                  <span>Marcar como Completada & Cobrar</span>
                </button>
              ` : apt.status === 'completada' ? `
                <div class="p-3 rounded-lg bg-[#E3EFE7] border border-[#235D3A]/30 text-xs text-[#235D3A] flex items-center gap-2">
                  <span class="material-symbols-outlined text-[18px]">verified</span>
                  <span>Corte completado y cobrado (${apt.paymentMethod ? apt.paymentMethod.toUpperCase() : 'EFECTIVO'}).</span>
                </div>
              ` : ''}

              ${canOperateApt && apt.status !== 'no_asistio' && apt.status !== 'completada' ? `
                <button
                  type="button"
                  id="drawer-btn-mark-noshow"
                  class="min-h-[44px] px-4 rounded-lg bg-white border border-[#D5CBB8] hover:bg-[#E8DFCE] text-[#4F4A42] font-semibold text-xs flex items-center justify-center gap-2 transition-colors"
                >
                  <span class="material-symbols-outlined text-[18px]">person_off</span>
                  <span>Marcar como No Asistió</span>
                </button>
              ` : ''}

              ${canCancel && apt.status !== 'cancelada' && apt.status !== 'completada' ? `
                <button
                  type="button"
                  id="drawer-btn-cancel-apt"
                  class="min-h-[44px] px-4 rounded-lg bg-[#FCE8E6] border border-[#B3261E] text-[#B3261E] hover:bg-[#B3261E] hover:text-white font-semibold text-xs flex items-center justify-center gap-2 transition-colors"
                >
                  <span class="material-symbols-outlined text-[18px]">cancel</span>
                  <span>Anular Cita</span>
                </button>
              ` : ''}
            </div>
          </div>
        `
      });

      // Listeners síncronos sobre el nodo retornado por openDrawer
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
    });
  });

  // Selector de fecha: Día anterior y siguiente
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

  // Botón Walk-in POS (<= 4 clics)
  const btnWalkin = document.getElementById('btn-agenda-walkin');
  if (btnWalkin) {
    btnWalkin.addEventListener('click', () => openWalkinModal(onUpdate));
  }

  // Clic en bloque libre abre Walk-in directo
  const freeBlocks = document.querySelectorAll('.free-slot-block');
  freeBlocks.forEach(block => {
    block.addEventListener('click', () => {
      const chairIndex = parseInt(block.getAttribute('data-free-chair'), 10) || 0;
      const freeTime = block.getAttribute('data-free-time') || '10:00';
      openWalkinModal(onUpdate, chairIndex, freeTime);
    });
  });
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
    title: '+ Registrar Corte Walk-in (Mostrador)',
    contentHtml: `
      <form id="form-walkin" class="flex flex-col gap-4">
        <!-- 1. Sillón / Barbero (bloqueado a perfil propio para Barbero - RF-COR-01) -->
        <div class="flex flex-col gap-1">
          <label for="walkin-chair" class="font-sans font-semibold text-xs text-[#1C1C1C]">Sillón / Barbero</label>
          <select
            id="walkin-chair"
            ${canAssignAnyBarber ? '' : 'disabled'}
            class="h-10 px-3 rounded-md border border-[#8C8272] text-xs font-semibold text-[#1C1C1C] ${canAssignAnyBarber ? 'bg-white' : 'bg-[#E8DFCE]/70 text-[#4F4A42] cursor-not-allowed'}"
          >
            ${visibleBarbers.map((b, idx) => `
              <option value="${b.id}" data-chair-index="${b.chairIndex ?? idx}" ${b.id === preselectedBarberId ? 'selected' : ''}>
                ${b.chair || `Sillón ${idx + 1}`} - ${b.name}
              </option>
            `).join('')}
          </select>
          ${!canAssignAnyBarber ? `<span class="text-[10px] text-[#6B645A]">Perfil preseleccionado y bloqueado según usuario autenticado (RF-COR-01).</span>` : ''}
        </div>

        <!-- 2. Servicio (catálogo real activo) -->
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

        <!-- 4. Método de Pago Colombia -->
        ${renderPaymentMethodSelector({ selectedMethod: 'efectivo', name: 'walkin_metodo_pago' })}
      </form>
    `,
    confirmText: 'Registrar y Cobrar',
    cancelText: 'Cancelar',
    confirmVariant: 'accent',
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
