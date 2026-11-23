/**
 * SmartBarber - Módulo de Historial de Cortes y Caja Diaria
 * Fiel a docs/stitch/smartbarber_historial_de_cortes_y_caja_diaria
 * Conexión completa con cortesService, arqueo POS en tiempo real,
 * anulación auditable con motivo (CU-008), exportación CSV (CU-007)
 * y drawer de registro rápido Walk-in.
 */

import { cortesService, barberosService, serviciosService } from '../../services/index.js';
import { formatCOP } from '../../utils/formatters.js';
import { emitDataMutation } from '../../utils/event-bus.js';

// Estado local de filtros
let currentFilters = {
  search: '',
  barberoId: 'all',
  metodoPago: 'all',
  origen: 'all',
  estado: 'all'
};

let cachedCortes = [];
let cachedBarberos = [];
let cachedServicios = [];

export async function loadCortesData() {
  const [cortesRes, barbRes, srvRes] = await Promise.all([
    cortesService.getHistorialCortes(currentFilters),
    barberosService.getBarberos(),
    serviciosService.getServicios()
  ]);

  if (cortesRes.ok) cachedCortes = cortesRes.data;
  if (barbRes.ok) cachedBarberos = barbRes.data;
  if (srvRes.ok) cachedServicios = srvRes.data;
}

export function renderCortesPage() {
  const cortes = cachedCortes;
  const activos = cortes.filter(c => c.estado === 'activo');
  const anulados = cortes.filter(c => c.estado === 'anulado');

  const totalIngresos = activos.reduce((sum, c) => sum + c.precio, 0);

  // Desglose por método de pago normalizado
  const breakdown = {
    efectivo: { total: 0, count: 0, label: 'Efectivo', icon: 'payments', color: 'bg-primary' },
    nequi: { total: 0, count: 0, label: 'Nequi', icon: 'phone_iphone', color: 'bg-[#7BA3D4]' },
    daviplata: { total: 0, count: 0, label: 'Daviplata', icon: 'account_balance_wallet', color: 'bg-[#E07A7A]' },
    datafono: { total: 0, count: 0, label: 'Datáfono', icon: 'credit_card', color: 'bg-[#1F3A5F]' },
    transferencia: { total: 0, count: 0, label: 'Transferencia', icon: 'account_balance', color: 'bg-[#235D3A]' }
  };

  const normalizeMetodoPagoKey = (metodo) => {
    const m = (metodo || 'efectivo').toLowerCase();
    if (m === 'tarjeta_debito_credito' || m === 'datafono' || m === 'tarjeta') return 'datafono';
    if (m === 'transferencia_bancaria' || m === 'transferencia') return 'transferencia';
    if (m === 'nequi') return 'nequi';
    if (m === 'daviplata') return 'daviplata';
    return 'efectivo';
  };

  activos.forEach(c => {
    const key = normalizeMetodoPagoKey(c.metodoPago);
    if (breakdown[key]) {
      breakdown[key].total += c.precio;
      breakdown[key].count += 1;
    }
  });

  return `
    <div class="flex flex-col gap-6 w-full animate-fadeIn">
      <!-- HEADER PRINCIPAL & ACCIONES GLOBALES -->
      <section class="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div class="flex items-center gap-2">
            <span class="font-sans text-[11px] uppercase tracking-widest text-[#6B645A] font-semibold">Módulo Financiero y POS</span>
            <span class="text-[#8C8272] text-xs">•</span>
            <span class="font-sans text-xs text-[#4F4A42]">Arqueo en tiempo real</span>
          </div>
          <h1 class="font-serif text-2xl sm:text-3xl font-bold text-[#1C1C1C] tracking-tight mt-0.5">
            Cortes y Caja Diaria
          </h1>
        </div>

        <!-- Botones de Acción -->
        <div class="flex items-center flex-wrap gap-2.5">
          <div class="flex items-center gap-2 bg-[#FAF7F2] border border-[#D5CBB8] px-3 py-2 rounded-lg text-xs font-mono font-medium text-[#1C1C1C]">
            <span class="material-symbols-outlined text-[16px] text-[#6B645A]">calendar_today</span>
            <span>Hoy: 20 Nov 2026</span>
          </div>
          <button
            type="button"
            id="btn-export-csv"
            class="min-h-[44px] inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#E4ECF5] text-[#1F3A5F] hover:bg-[#d5e3ff] font-sans font-semibold text-xs transition-colors shadow-xs"
          >
            <span class="material-symbols-outlined text-[18px]">download</span>
            <span>Exportar Cierre (CSV)</span>
          </button>
          <button
            type="button"
            id="btn-open-walkin-drawer"
            class="min-h-[44px] inline-flex items-center gap-2 px-5 py-2 rounded-lg bg-[#8B1E1E] text-white hover:bg-[#6E1616] font-sans font-semibold text-xs transition-all shadow-sm active:scale-95"
          >
            <span class="material-symbols-outlined text-[18px]">add</span>
            <span>+ Registrar Corte (Walk-in)</span>
          </button>
        </div>
      </section>

      <!-- FINANCIAL SUMMARY ROW: TARJETA DUAL DE ARQUEO -->
      <section class="bg-[#FAF7F2] border border-[#D5CBB8] rounded-xl shadow-xs p-5 sm:p-6">
        <div class="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          <!-- Bloque Izquierdo: Total Ingresos (40%) -->
          <div class="lg:col-span-5 flex flex-col justify-between pr-0 lg:pr-6 bg-[#FAF3E5] p-4 sm:p-5 rounded-lg border border-[#D5CBB8]/60">
            <div>
              <div class="flex items-center justify-between">
                <span class="font-sans text-[11px] uppercase tracking-wider text-[#6B645A] font-semibold">Total Ingresos Brutos Activos (Hoy)</span>
                <span class="material-symbols-outlined text-[18px] text-[#235D3A]">verified</span>
              </div>
              <div class="flex items-baseline gap-2 mt-1">
                <span class="font-serif text-3xl sm:text-4xl font-bold text-[#1C1C1C] tabular-nums tracking-tight">
                  ${formatCOP(totalIngresos)}
                </span>
                <span class="font-mono text-xs text-[#4F4A42] font-semibold">COP</span>
              </div>
            </div>

            <div class="mt-4 pt-3 border-t border-[#D5CBB8]/80 flex flex-col gap-1.5 text-xs text-[#4F4A42]">
              <div class="flex items-center gap-1.5">
                <span class="material-symbols-outlined text-[16px] text-[#1F3A5F]">info</span>
                <span><strong>${activos.length} atenciones activas</strong> (${activos.filter(c => c.origen === 'cita').length} Cita · ${activos.filter(c => c.origen === 'walk-in').length} Walk-in)</span>
              </div>
              <div class="flex items-center gap-1.5 text-[11px] text-[#6B645A]">
                <span class="inline-block w-1.5 h-1.5 rounded-full bg-[#8A5300]"></span>
                <span>${anulados.length} anulada(s) excluida(s) del arqueo (${formatCOP(anulados.reduce((s, c) => s + c.precio, 0))} COP)</span>
              </div>
              <div class="flex items-center gap-1.5 text-[#235D3A] font-semibold text-[11px] mt-1">
                <span class="material-symbols-outlined text-[15px]">check_circle</span>
                <span>Caja cuadrada con comprobantes digitales y arqueo de efectivo</span>
              </div>
            </div>
          </div>

          <!-- Bloque Derecho: Desglose por Método de Pago (60%) -->
          <div class="lg:col-span-7 flex flex-col justify-between pl-0 lg:pl-2 gap-3">
            <div class="flex items-center justify-between">
              <span class="font-sans text-[11px] uppercase tracking-wider text-[#6B645A] font-semibold">
                Desglose Exacto por Método de Pago (Suma 100% = ${formatCOP(totalIngresos)} COP)
              </span>
              <span class="font-mono text-[11px] text-[#6B645A]">Auditoría DIAN</span>
            </div>

            <!-- Mini Cards Grid de los 5 Métodos -->
            <div class="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-2">
              ${Object.keys(breakdown).map(k => {
                const item = breakdown[k];
                const pct = totalIngresos > 0 ? ((item.total / totalIngresos) * 100).toFixed(1) : 0;
                return `
                  <div class="bg-[#E8DFCE]/40 border border-[#D5CBB8] p-3 rounded-lg flex flex-col justify-between">
                    <div class="flex items-center justify-between text-[#4F4A42] mb-1">
                      <span class="font-sans text-[11px] font-semibold">${item.label}</span>
                      <span class="material-symbols-outlined text-[16px]">${item.icon}</span>
                    </div>
                    <div>
                      <div class="font-mono text-sm font-bold text-[#1C1C1C] tabular-nums">
                        ${formatCOP(item.total)}
                      </div>
                      <div class="font-sans text-[10px] text-[#6B645A] mt-0.5">
                        ${pct}% · ${item.count} tx
                      </div>
                    </div>
                  </div>
                `;
              }).join('')}
            </div>

            <!-- Barra Proporcional de Métodos -->
            <div class="w-full bg-[#E8DFCE] h-2.5 rounded-full overflow-hidden flex mt-2 shadow-inner">
              ${Object.keys(breakdown).map(k => {
                const item = breakdown[k];
                const pct = totalIngresos > 0 ? (item.total / totalIngresos) * 100 : 0;
                return `<div class="${item.color} h-full" style="width: ${pct}%;" title="${item.label}: ${pct.toFixed(1)}%"></div>`;
              }).join('')}
            </div>
          </div>
        </div>
      </section>

      <!-- BARRA DE BÚSQUEDA Y FILTROS -->
      <section class="bg-[#FAF7F2] border border-[#D5CBB8] rounded-xl shadow-xs p-4 flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        <!-- Buscador y Dropdowns -->
        <div class="flex flex-wrap items-center gap-2.5 flex-1">
          <div class="relative min-w-[240px] flex-1 sm:flex-initial">
            <span class="material-symbols-outlined absolute left-3 top-2.5 text-[#6B645A] text-[18px]">search</span>
            <input
              type="text"
              id="filter-cortes-search"
              value="${currentFilters.search}"
              placeholder="Buscar por #ID, cliente o barbero..."
              class="w-full pl-9 pr-3 h-10 bg-white border border-[#8C8272] rounded-lg text-xs text-[#1C1C1C] placeholder-[#6B645A] focus:outline-none focus:ring-2 focus:ring-[#1F3A5F]"
            />
          </div>

          <!-- Selector de Barbero -->
          <div class="relative">
            <select
              id="filter-cortes-barbero"
              class="h-10 pl-3 pr-8 bg-white border border-[#8C8272] rounded-lg text-xs font-medium text-[#1C1C1C] focus:outline-none focus:ring-2 focus:ring-[#1F3A5F] appearance-none cursor-pointer"
            >
              <option value="all" ${currentFilters.barberoId === 'all' ? 'selected' : ''}>Todos los barberos</option>
              ${cachedBarberos.map(b => `
                <option value="${b.id}" ${currentFilters.barberoId === b.id ? 'selected' : ''}>${b.nombre} (${b.sillon || 'Sillón'})</option>
              `).join('')}
            </select>
            <span class="material-symbols-outlined absolute right-2.5 top-2.5 text-[#6B645A] text-[18px] pointer-events-none">expand_more</span>
          </div>

          <!-- Selector de Método de Pago -->
          <div class="relative">
            <select
              id="filter-cortes-pago"
              class="h-10 pl-3 pr-8 bg-white border border-[#8C8272] rounded-lg text-xs font-medium text-[#1C1C1C] focus:outline-none focus:ring-2 focus:ring-[#1F3A5F] appearance-none cursor-pointer"
            >
              <option value="all" ${currentFilters.metodoPago === 'all' ? 'selected' : ''}>Todos los métodos de pago</option>
              <option value="efectivo" ${currentFilters.metodoPago === 'efectivo' ? 'selected' : ''}>Efectivo</option>
              <option value="nequi" ${currentFilters.metodoPago === 'nequi' ? 'selected' : ''}>Nequi</option>
              <option value="daviplata" ${currentFilters.metodoPago === 'daviplata' ? 'selected' : ''}>Daviplata</option>
              <option value="datafono" ${currentFilters.metodoPago === 'datafono' ? 'selected' : ''}>Datáfono (Tarjeta)</option>
              <option value="transferencia" ${currentFilters.metodoPago === 'transferencia' ? 'selected' : ''}>Transferencia</option>
            </select>
            <span class="material-symbols-outlined absolute right-2.5 top-2.5 text-[#6B645A] text-[18px] pointer-events-none">expand_more</span>
          </div>
        </div>

        <!-- Segmented Controls: Origen & Estado -->
        <div class="flex items-center flex-wrap gap-3">
          <!-- Origen Pills -->
          <div class="flex items-center bg-[#E8DFCE] p-1 rounded-lg">
            <button
              type="button"
              data-origen="all"
              class="px-2.5 py-1 rounded text-xs font-semibold ${currentFilters.origen === 'all' ? 'bg-white text-[#1C1C1C] shadow-xs' : 'text-[#6B645A] hover:text-[#1C1C1C]'}"
            >Todos</button>
            <button
              type="button"
              data-origen="cita"
              class="px-2.5 py-1 rounded text-xs font-semibold ${currentFilters.origen === 'cita' ? 'bg-white text-[#1C1C1C] shadow-xs' : 'text-[#6B645A] hover:text-[#1C1C1C]'}"
            >Cita</button>
            <button
              type="button"
              data-origen="walk-in"
              class="px-2.5 py-1 rounded text-xs font-semibold ${currentFilters.origen === 'walk-in' ? 'bg-white text-[#1C1C1C] shadow-xs' : 'text-[#6B645A] hover:text-[#1C1C1C]'}"
            >Walk-in</button>
          </div>

          <!-- Estado Pills -->
          <div class="flex items-center bg-[#E8DFCE] p-1 rounded-lg">
            <button
              type="button"
              data-estado="all"
              class="px-2.5 py-1 rounded text-xs font-semibold ${currentFilters.estado === 'all' ? 'bg-white text-[#1C1C1C] shadow-xs' : 'text-[#6B645A] hover:text-[#1C1C1C]'}"
            >Todos (${cortes.length})</button>
            <button
              type="button"
              data-estado="activo"
              class="px-2.5 py-1 rounded text-xs font-semibold ${currentFilters.estado === 'activo' ? 'bg-white text-[#235D3A] shadow-xs' : 'text-[#6B645A] hover:text-[#1C1C1C]'}"
            >Activos (${activos.length})</button>
            <button
              type="button"
              data-estado="anulado"
              class="px-2.5 py-1 rounded text-xs font-semibold ${currentFilters.estado === 'anulado' ? 'bg-white text-[#B3261E] shadow-xs' : 'text-[#6B645A] hover:text-[#1C1C1C]'}"
            >Anulados (${anulados.length})</button>
          </div>

          <button
            type="button"
            id="btn-clear-cortes-filters"
            class="text-xs font-semibold text-[#6B645A] hover:text-[#8B1E1E] transition-colors flex items-center gap-1"
          >
            <span class="material-symbols-outlined text-[16px]">restart_alt</span>
            <span>Limpiar</span>
          </button>
        </div>
      </section>

      <!-- AUDIT DATA TABLE: TABLA AUDITABLE DE CORTES -->
      <section class="bg-[#FAF7F2] border border-[#D5CBB8] rounded-xl shadow-xs overflow-hidden flex flex-col">
        <div class="overflow-x-auto">
          <table class="w-full text-left border-collapse">
            <thead>
              <tr class="bg-[#E8DFCE] text-[#4F4A42] font-sans text-[11px] uppercase tracking-wider">
                <th class="py-3 px-4 font-semibold">ID / HORA</th>
                <th class="py-3 px-4 font-semibold">BARBERO & SILLÓN</th>
                <th class="py-3 px-4 font-semibold">SERVICIOS REALIZADOS</th>
                <th class="py-3 px-4 font-semibold">ORIGEN</th>
                <th class="py-3 px-4 font-semibold">MÉTODO DE PAGO</th>
                <th class="py-3 px-4 font-semibold text-right">VALOR (COP)</th>
                <th class="py-3 px-4 font-semibold text-center">ESTADO</th>
                <th class="py-3 px-4 font-semibold text-right">ACCIÓN AUDITORÍA</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-[#D5CBB8]/40 text-xs text-[#1C1C1C]">
              ${cortes.length === 0 ? `
                <tr>
                  <td colspan="8" class="py-12 text-center text-[#6B645A]">
                    <div class="flex flex-col items-center gap-2">
                      <span class="material-symbols-outlined text-[32px] text-[#8C8272]">receipt_long</span>
                      <p class="font-medium text-sm">No se encontraron registros de cortes con los filtros seleccionados.</p>
                      <button type="button" id="btn-empty-reset" class="text-xs font-semibold text-[#1F3A5F] hover:underline">Restablecer filtros</button>
                    </div>
                  </td>
                </tr>
              ` : cortes.map(corte => {
                const isAnulado = corte.estado === 'anulado';
                return `
                  <tr class="hover:bg-[#FAF3E5] transition-colors ${isAnulado ? 'bg-[#FAF3E5]/50 opacity-80' : 'bg-white'}">
                    <!-- ID / Hora -->
                    <td class="py-3 px-4">
                      <div class="font-mono text-xs font-bold text-[#1F3A5F]">#${corte.id}</div>
                      <div class="text-[11px] text-[#6B645A] font-mono mt-0.5">${corte.horaFormato || '02:00 PM'}</div>
                    </td>

                    <!-- Barbero & Sillón -->
                    <td class="py-3 px-4">
                      <div class="font-sans font-semibold text-[#1C1C1C]">${corte.barberoNombre}</div>
                      <div class="text-[11px] text-[#6B645A]">${corte.sillon || 'Sillón 01'}</div>
                    </td>

                    <!-- Servicios Realizados & Cliente -->
                    <td class="py-3 px-4">
                      <div class="font-medium text-[#1C1C1C] ${isAnulado ? 'line-through text-[#6B645A]' : ''}">
                        ${corte.servicioNombre}
                      </div>
                      <div class="text-[11px] text-[#6B645A]">
                        Cliente: ${corte.clienteNombre || 'Cliente Mostrador'}
                      </div>
                    </td>

                    <!-- Origen -->
                    <td class="py-3 px-4">
                      ${corte.origen === 'walk-in' ? `
                        <span class="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded bg-[#FDF1DC] text-[#8A5300] font-semibold border border-[#8A5300]/20">
                          <span class="material-symbols-outlined text-[13px]">directions_walk</span>
                          <span>Walk-in</span>
                        </span>
                      ` : `
                        <span class="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded bg-[#E4ECF5] text-[#1F3A5F] font-semibold border border-[#1F3A5F]/20">
                          <span class="material-symbols-outlined text-[13px]">event_available</span>
                          <span>Cita</span>
                        </span>
                      `}
                    </td>

                    <!-- Método de Pago -->
                    <td class="py-3 px-4">
                      <div class="inline-flex items-center gap-1.5 font-sans text-xs text-[#4F4A42] bg-[#E8DFCE]/60 px-2.5 py-1 rounded border border-[#D5CBB8]">
                        <span class="material-symbols-outlined text-[15px] ${
                          corte.metodoPago === 'nequi' ? 'text-[#7BA3D4]' :
                          corte.metodoPago === 'daviplata' ? 'text-[#E07A7A]' :
                          corte.metodoPago === 'efectivo' ? 'text-[#235D3A]' :
                          corte.metodoPago === 'datafono' ? 'text-[#1F3A5F]' : 'text-[#6B645A]'
                        }">
                          ${
                            corte.metodoPago === 'nequi' ? 'phone_iphone' :
                            corte.metodoPago === 'daviplata' ? 'account_balance_wallet' :
                            corte.metodoPago === 'efectivo' ? 'payments' :
                            corte.metodoPago === 'datafono' ? 'credit_card' : 'account_balance'
                          }
                        </span>
                        <span class="capitalize">${corte.metodoPago}</span>
                      </div>
                    </td>

                    <!-- Valor COP -->
                    <td class="py-3 px-4 text-right font-mono font-bold text-[#1C1C1C] tabular-nums ${isAnulado ? 'line-through text-[#8C8272]' : ''}">
                      ${formatCOP(corte.precio)}
                    </td>

                    <!-- Estado -->
                    <td class="py-3 px-4 text-center">
                      ${isAnulado ? `
                        <span class="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded bg-[#FCE8E6] text-[#B3261E] font-semibold border border-[#B3261E]/30" title="${corte.motivoAnulacion || 'Corte anulado'}">
                          <span class="material-symbols-outlined text-[13px]">cancel</span>
                          <span>Anulado</span>
                        </span>
                      ` : `
                        <span class="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded bg-[#E3EFE7] text-[#235D3A] font-semibold border border-[#235D3A]/20">
                          <span class="material-symbols-outlined text-[13px]">check_circle</span>
                          <span>Activo</span>
                        </span>
                      `}
                    </td>

                    <!-- Acción Auditoría -->
                    <td class="py-3 px-4 text-right">
                      ${isAnulado ? `
                        <button
                          type="button"
                          class="btn-ver-motivo text-xs text-[#1F3A5F] hover:underline font-semibold"
                          data-id="${corte.id}"
                          data-motivo="${corte.motivoAnulacion || 'Sin motivo registrado'}"
                          data-autor="${corte.anuladoPor || 'Administrador'}"
                          data-fecha="${corte.fechaAnulacion || ''}"
                        >
                          Ver Motivo
                        </button>
                      ` : `
                        <button
                          type="button"
                          class="btn-anular-corte text-xs text-[#B3261E] hover:text-[#8B1E1E] hover:underline font-semibold"
                          data-id="${corte.id}"
                          data-cliente="${corte.clienteNombre}"
                          data-precio="${corte.precio}"
                          data-servicio="${corte.servicioNombre}"
                        >
                          Ver / Anular
                        </button>
                      `}
                    </td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>

        <!-- Table Footer / Auditoría info -->
        <div class="bg-[#E8DFCE] px-4 py-3 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-[#4F4A42]">
          <span>Mostrando <strong>${cortes.length}</strong> registros (${activos.length} activos, ${anulados.length} auditados anulados)</span>
          <span class="font-mono text-[11px] text-[#6B645A]">SmartBarber POS v2.0 · Arqueo Inmutable</span>
        </div>
      </section>
    </div>

    <!-- ========================================== -->
    <!-- SLIDE-OVER DRAWER: REGISTRAR CORTE WALK-IN -->
    <!-- ========================================== -->
    <div id="walkin-drawer-container" class="hidden">
      <!-- Backdrop -->
      <div id="walkin-drawer-backdrop" class="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 transition-opacity"></div>

      <!-- Drawer Panel -->
      <aside
        id="walkin-drawer-panel"
        class="fixed top-0 right-0 h-full w-[440px] max-w-[90vw] bg-[#FAF7F2] shadow-2xl z-50 flex flex-col justify-between border-l border-[#D5CBB8] transform transition-transform duration-300"
      >
        <!-- Drawer Header -->
        <div class="bg-[#1C1C1C] p-4 text-[#F2EBDD] flex items-center justify-between border-b-2 border-[#8B1E1E]">
          <div class="flex items-center gap-2.5">
            <div class="w-8 h-8 rounded bg-[#8B1E1E] flex items-center justify-center text-white">
              <span class="material-symbols-outlined text-[18px]">content_cut</span>
            </div>
            <div>
              <h2 class="font-serif text-lg font-bold text-white tracking-tight leading-tight">Registrar Corte (Walk-in)</h2>
            </div>
          </div>
          <button
            type="button"
            id="btn-close-walkin-drawer"
            class="w-8 h-8 rounded-full flex items-center justify-center text-[#BDB4A5] hover:text-white hover:bg-white/10 transition-colors"
          >
            <span class="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        <!-- Drawer Body -->
        <div class="flex-1 overflow-y-auto p-5 flex flex-col gap-5">
          <!-- 1. Barbero -->
          <div class="flex flex-col gap-1.5">
            <label class="font-sans font-semibold text-xs text-[#1C1C1C]">
              Barbero que atiende <span class="text-[#8B1E1E]">*</span>
            </label>
            <div class="relative">
              <select
                id="walkin-barber-select"
                class="w-full h-11 pl-3 pr-8 bg-white border border-[#8C8272] rounded-lg text-xs font-medium text-[#1C1C1C] focus:outline-none focus:ring-2 focus:ring-[#1F3A5F] appearance-none"
              >
                ${cachedBarberos.filter(b => b.activo !== false).map((b, idx) => `
                  <option value="${b.id}" data-name="${b.nombre}" data-sillon="${b.sillon || `Sillón 0${idx+1}`}">
                    ${b.nombre} (${b.sillon || `Sillón 0${idx+1}`})
                  </option>
                `).join('')}
              </select>
              <span class="material-symbols-outlined absolute right-3 top-3 text-[#6B645A] pointer-events-none text-[18px]">expand_more</span>
            </div>
          </div>

          <!-- 2. Selección de Servicios (Cards Táctiles) -->
          <div class="flex flex-col gap-2">
            <div class="flex items-center justify-between">
              <label class="font-sans font-semibold text-xs text-[#1C1C1C]">
                Servicio prestado <span class="text-[#8B1E1E]">*</span>
              </label>
              <span class="text-[11px] text-[#6B645A]">Seleccione el servicio</span>
            </div>

            <div class="flex flex-col gap-2" id="walkin-services-container">
              ${cachedServicios.filter(s => s.activo !== false).map((s, idx) => `
                <label class="flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-all ${
                  idx === 0 ? 'bg-[#E4ECF5] border-[#1F3A5F] shadow-xs' : 'bg-white border-[#D5CBB8] hover:bg-[#FAF3E5]'
                } walkin-service-card" data-id="${s.id}" data-price="${s.precio}" data-name="${s.nombre}">
                  <div class="flex items-center gap-3">
                    <input
                      type="radio"
                      name="walkin_service"
                      value="${s.id}"
                      ${idx === 0 ? 'checked' : ''}
                      class="w-4 h-4 text-[#1F3A5F] focus:ring-[#1F3A5F]"
                    />
                    <div>
                      <span class="font-sans font-semibold text-xs text-[#1C1C1C] block">${s.nombre}</span>
                      <span class="text-[11px] text-[#6B645A]">${s.duracionMinutos} min · ${s.duracionBloques || 1} bloque</span>
                    </div>
                  </div>
                  <span class="font-mono text-xs font-bold text-[#1C1C1C] tabular-nums">${formatCOP(s.precio)}</span>
                </label>
              `).join('')}
            </div>
          </div>

          <!-- 3. Método de Pago (5 Tarjetas Táctiles) -->
          <div class="flex flex-col gap-2">
            <label class="font-sans font-semibold text-xs text-[#1C1C1C]">
              Método de pago recibido <span class="text-[#8B1E1E]">*</span>
            </label>
            <div class="grid grid-cols-2 gap-2" id="walkin-payment-methods">
              <button
                type="button"
                data-method="efectivo"
                class="walkin-pay-btn flex items-center gap-2 p-2.5 rounded-lg border text-left bg-[#1F3A5F] text-white border-[#1F3A5F] shadow-xs"
              >
                <span class="material-symbols-outlined text-[18px]">payments</span>
                <div>
                  <div class="font-sans font-bold text-xs leading-tight">Efectivo</div>
                  <div class="text-[10px] opacity-80">Arqueo caja</div>
                </div>
              </button>

              <button
                type="button"
                data-method="nequi"
                class="walkin-pay-btn flex items-center gap-2 p-2.5 rounded-lg border text-left bg-white text-[#1C1C1C] border-[#D5CBB8] hover:bg-[#FAF3E5]"
              >
                <span class="material-symbols-outlined text-[18px] text-[#7BA3D4]">phone_iphone</span>
                <div>
                  <div class="font-sans font-semibold text-xs leading-tight">Nequi</div>
                  <div class="text-[10px] text-[#6B645A]">QR / Llave</div>
                </div>
              </button>

              <button
                type="button"
                data-method="daviplata"
                class="walkin-pay-btn flex items-center gap-2 p-2.5 rounded-lg border text-left bg-white text-[#1C1C1C] border-[#D5CBB8] hover:bg-[#FAF3E5]"
              >
                <span class="material-symbols-outlined text-[18px] text-[#E07A7A]">account_balance_wallet</span>
                <div>
                  <div class="font-sans font-semibold text-xs leading-tight">Daviplata</div>
                  <div class="text-[10px] text-[#6B645A]">Billetera</div>
                </div>
              </button>

              <button
                type="button"
                data-method="tarjeta_debito_credito"
                class="walkin-pay-btn flex items-center gap-2 p-2.5 rounded-lg border text-left bg-white text-[#1C1C1C] border-[#D5CBB8] hover:bg-[#FAF3E5]"
              >
                <span class="material-symbols-outlined text-[18px] text-[#1F3A5F]">credit_card</span>
                <div>
                  <div class="font-sans font-semibold text-xs leading-tight">Datáfono</div>
                  <div class="text-[10px] text-[#6B645A]">Voucher POS</div>
                </div>
              </button>

              <button
                type="button"
                data-method="transferencia_bancaria"
                class="walkin-pay-btn col-span-2 flex items-center gap-2 p-2.5 rounded-lg border text-left bg-white text-[#1C1C1C] border-[#D5CBB8] hover:bg-[#FAF3E5]"
              >
                <span class="material-symbols-outlined text-[18px] text-[#235D3A]">account_balance</span>
                <div>
                  <div class="font-sans font-semibold text-xs leading-tight">Transferencia Bancaria</div>
                  <div class="text-[10px] text-[#6B645A]">Bancolombia / Bre-B</div>
                </div>
              </button>
            </div>
          </div>

          <!-- 4. Cliente y Comprobante (Opcionales) -->
          <div class="flex flex-col gap-3 pt-1">
            <div class="flex flex-col gap-1">
              <label for="walkin-client-name" class="font-sans text-xs text-[#4F4A42]">Nombre del cliente (opcional)</label>
              <input
                type="text"
                id="walkin-client-name"
                placeholder="Ej. Juan Pérez o cliente mostrador"
                class="h-10 px-3 bg-white border border-[#8C8272] rounded-lg text-xs text-[#1C1C1C] placeholder-[#6B645A] focus:outline-none focus:ring-2 focus:ring-[#1F3A5F]"
              />
            </div>
            <div class="flex flex-col gap-1">
              <label for="walkin-comprobante" class="font-sans text-xs text-[#4F4A42]">Referencia o comprobante (opcional)</label>
              <input
                type="text"
                id="walkin-comprobante"
                placeholder="Ej. Nequi M1892 o Aprobación Datáfono #9910"
                class="h-10 px-3 bg-white border border-[#8C8272] rounded-lg text-xs text-[#1C1C1C] placeholder-[#6B645A] focus:outline-none focus:ring-2 focus:ring-[#1F3A5F]"
              />
            </div>
          </div>
        </div>

        <!-- Drawer Footer -->
        <div class="p-4 bg-[#E8DFCE] border-t border-[#D5CBB8] flex flex-col gap-3">
          <div class="flex items-baseline justify-between">
            <span class="font-sans text-xs uppercase tracking-wider text-[#6B645A] font-semibold">Total a Cobrar:</span>
            <div class="text-right">
              <span id="walkin-total-display" class="font-mono text-2xl font-bold text-[#1C1C1C] tabular-nums">
                ${cachedServicios[0] ? formatCOP(cachedServicios[0].precio) : '$ 25.000'}
              </span>
              <span class="font-mono text-xs text-[#4F4A42] font-semibold ml-1">COP</span>
            </div>
          </div>

          <button
            type="button"
            id="btn-confirm-walkin-cut"
            class="min-h-[44px] w-full bg-[#1F3A5F] hover:bg-[#162B47] text-white rounded-lg font-sans font-semibold text-xs shadow-sm transition-all active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer"
          >
            <span class="material-symbols-outlined text-[18px]">point_of_sale</span>
            <span>Registrar Corte y Cobrar</span>
          </button>
        </div>
      </aside>
    </div>

    <!-- ========================================== -->
    <!-- MODAL DE ANULACIÓN AUDITABLE (CU-008)       -->
    <!-- ========================================== -->
    <dialog
      id="dialog-anular-corte"
      class="p-0 rounded-2xl bg-[#FAF7F2] border border-[#D5CBB8] shadow-2xl backdrop:bg-black/50 max-w-md w-full mx-auto my-auto"
    >
      <div class="p-6 flex flex-col gap-4">
        <!-- Header -->
        <div class="flex items-start gap-3">
          <div class="w-10 h-10 rounded-full bg-[#FCE8E6] text-[#B3261E] flex items-center justify-center shrink-0">
            <span class="material-symbols-outlined text-[22px]">warning</span>
          </div>
          <div>
            <h3 class="font-serif text-lg font-bold text-[#1C1C1C]">Anular Registro de Corte</h3>
            <span class="inline-block text-[11px] font-semibold text-[#B3261E] bg-[#FCE8E6] px-2 py-0.5 rounded mt-0.5">
              Excluye del arqueo y liquidación de comisiones
            </span>
          </div>
        </div>

        <!-- Detalle del Corte a Anular -->
        <div class="p-3 rounded-lg bg-[#FAF3E5] border border-[#D5CBB8] flex flex-col gap-1 text-xs">
          <div class="flex justify-between">
            <span class="text-[#6B645A]">Corte ID:</span>
            <span class="font-mono font-bold text-[#1F3A5F]" id="anular-corte-id">#RC-1042</span>
          </div>
          <div class="flex justify-between">
            <span class="text-[#6B645A]">Servicio:</span>
            <span class="font-semibold text-[#1C1C1C]" id="anular-corte-servicio">Corte Clásico</span>
          </div>
          <div class="flex justify-between">
            <span class="text-[#6B645A]">Cliente:</span>
            <span class="text-[#1C1C1C]" id="anular-corte-cliente">Carlos Walk-in</span>
          </div>
          <div class="flex justify-between border-t border-[#D5CBB8] pt-1 mt-1">
            <span class="text-[#6B645A]">Valor:</span>
            <span class="font-mono font-bold text-[#1C1C1C]" id="anular-corte-valor">$ 25.000 COP</span>
          </div>
        </div>

        <!-- Textarea de Motivo Obligatorio (>= 10 chars) -->
        <div class="flex flex-col gap-1.5">
          <label for="anular-motivo-input" class="font-sans font-semibold text-xs text-[#1C1C1C]">
            Justificación Operativa de la Anulación <span class="text-[#B3261E]">*</span>
          </label>
          <textarea
            id="anular-motivo-input"
            rows="3"
            required
            minlength="10"
            placeholder="Describa el motivo detallado (mínimo 10 caracteres, ej: Cliente canceló antes del corte por urgencia personal)..."
            class="w-full p-3 bg-white border border-[#8C8272] rounded-lg text-xs text-[#1C1C1C] placeholder-[#6B645A] focus:outline-none focus:ring-2 focus:ring-[#B3261E]"
          ></textarea>
          <span class="text-[11px] text-[#6B645A]" id="anular-char-counter">0 / 10 caracteres requeridos</span>
        </div>

        <!-- Botones de Acción -->
        <div class="flex items-center justify-end gap-2.5 pt-2 border-t border-[#D5CBB8]">
          <button
            type="button"
            id="btn-cancelar-anulacion"
            class="min-h-[44px] px-4 py-2 rounded-lg bg-white border border-[#8C8272] text-xs font-semibold text-[#4F4A42] hover:bg-[#FAF3E5] transition-colors"
          >
            Cancelar
          </button>
          <button
            type="button"
            id="btn-confirmar-anulacion"
            disabled
            class="min-h-[44px] px-5 py-2 rounded-lg bg-[#B3261E] hover:bg-[#8B1E1E] text-white text-xs font-semibold shadow-xs transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Confirmar Anulación
          </button>
        </div>
      </div>
    </dialog>

    <!-- ========================================== -->
    <!-- MODAL DE VISUALIZACIÓN DE MOTIVO ANULADO   -->
    <!-- ========================================== -->
    <dialog
      id="dialog-ver-motivo"
      class="p-0 rounded-2xl bg-[#FAF7F2] border border-[#D5CBB8] shadow-2xl backdrop:bg-black/50 max-w-md w-full mx-auto my-auto"
    >
      <div class="p-6 flex flex-col gap-4">
        <div class="flex items-center gap-3">
          <div class="w-9 h-9 rounded-full bg-[#E8DFCE] text-[#4F4A42] flex items-center justify-center">
            <span class="material-symbols-outlined text-[20px]">info</span>
          </div>
          <div>
            <h3 class="font-serif text-base font-bold text-[#1C1C1C]">Motivo de Anulación</h3>
            <span class="text-xs text-[#6B645A] font-mono" id="ver-motivo-id">#RC-1037</span>
          </div>
        </div>

        <div class="p-3.5 rounded-lg bg-white border border-[#D5CBB8] text-xs text-[#1C1C1C] leading-relaxed" id="ver-motivo-texto">
        </div>

        <div class="text-[11px] text-[#6B645A] flex justify-between border-t border-[#D5CBB8] pt-2">
          <span id="ver-motivo-autor">Autor: Carlos Mendoza</span>
          <span id="ver-motivo-fecha">Fecha: 20 Nov 2026</span>
        </div>

        <div class="flex justify-end pt-2">
          <button
            type="button"
            id="btn-cerrar-ver-motivo"
            class="min-h-[44px] px-4 py-2 rounded-lg bg-[#1F3A5F] text-white text-xs font-semibold"
          >
            Cerrar
          </button>
        </div>
      </div>
    </dialog>
  `;
}

export function attachCortesListeners(onDataChange) {
  // 1. Buscador con debounce
  const searchInput = document.getElementById('filter-cortes-search');
  if (searchInput) {
    let timeout;
    searchInput.addEventListener('input', (e) => {
      clearTimeout(timeout);
      timeout = setTimeout(async () => {
        currentFilters.search = e.target.value.trim();
        await loadCortesData();
        if (typeof onDataChange === 'function') onDataChange();
      }, 250);
    });
  }

  // 2. Filtro Barbero
  const barberSelect = document.getElementById('filter-cortes-barbero');
  if (barberSelect) {
    barberSelect.addEventListener('change', async (e) => {
      currentFilters.barberoId = e.target.value;
      await loadCortesData();
      if (typeof onDataChange === 'function') onDataChange();
    });
  }

  // 3. Filtro Método de Pago
  const pagoSelect = document.getElementById('filter-cortes-pago');
  if (pagoSelect) {
    pagoSelect.addEventListener('change', async (e) => {
      currentFilters.metodoPago = e.target.value;
      await loadCortesData();
      if (typeof onDataChange === 'function') onDataChange();
    });
  }

  // 4. Pills de Origen
  const origenButtons = document.querySelectorAll('button[data-origen]');
  origenButtons.forEach(btn => {
    btn.addEventListener('click', async () => {
      currentFilters.origen = btn.getAttribute('data-origen');
      await loadCortesData();
      if (typeof onDataChange === 'function') onDataChange();
    });
  });

  // 5. Pills de Estado
  const estadoButtons = document.querySelectorAll('button[data-estado]');
  estadoButtons.forEach(btn => {
    btn.addEventListener('click', async () => {
      currentFilters.estado = btn.getAttribute('data-estado');
      await loadCortesData();
      if (typeof onDataChange === 'function') onDataChange();
    });
  });

  // 6. Limpiar filtros
  const clearBtn = document.getElementById('btn-clear-cortes-filters');
  const emptyResetBtn = document.getElementById('btn-empty-reset');
  const resetHandler = async () => {
    currentFilters = { search: '', barberoId: 'all', metodoPago: 'all', origen: 'all', estado: 'all' };
    await loadCortesData();
    if (typeof onDataChange === 'function') onDataChange();
  };
  if (clearBtn) clearBtn.addEventListener('click', resetHandler);
  if (emptyResetBtn) emptyResetBtn.addEventListener('click', resetHandler);

  // 7. Exportar CSV (CU-007)
  const exportBtn = document.getElementById('btn-export-csv');
  if (exportBtn) {
    exportBtn.addEventListener('click', () => {
      exportarCierreCSV(cachedCortes);
    });
  }

  // 8. Drawer Walk-in: Abrir / Cerrar
  const drawerContainer = document.getElementById('walkin-drawer-container');
  const openDrawerBtn = document.getElementById('btn-open-walkin-drawer');
  const closeDrawerBtn = document.getElementById('btn-close-walkin-drawer');
  const backdrop = document.getElementById('walkin-drawer-backdrop');

  let selectedPaymentMethod = 'efectivo';

  if (openDrawerBtn && drawerContainer) {
    openDrawerBtn.addEventListener('click', () => {
      drawerContainer.classList.remove('hidden');
    });
  }

  const closeDrawer = () => {
    if (drawerContainer) drawerContainer.classList.add('hidden');
  };

  if (closeDrawerBtn) closeDrawerBtn.addEventListener('click', closeDrawer);
  if (backdrop) backdrop.addEventListener('click', closeDrawer);

  // Selección de servicios en Drawer
  const serviceCards = document.querySelectorAll('.walkin-service-card');
  const totalDisplay = document.getElementById('walkin-total-display');

  serviceCards.forEach(card => {
    card.addEventListener('click', () => {
      serviceCards.forEach(c => {
        c.classList.remove('bg-[#E4ECF5]', 'border-[#1F3A5F]');
        c.classList.add('bg-white', 'border-[#D5CBB8]');
      });
      card.classList.add('bg-[#E4ECF5]', 'border-[#1F3A5F]');
      card.classList.remove('bg-white', 'border-[#D5CBB8]');

      const radio = card.querySelector('input[type="radio"]');
      if (radio) radio.checked = true;

      const price = Number(card.getAttribute('data-price')) || 25000;
      if (totalDisplay) totalDisplay.textContent = formatCOP(price);
    });
  });

  // Selección de método de pago en Drawer
  const payButtons = document.querySelectorAll('.walkin-pay-btn');
  payButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      selectedPaymentMethod = btn.getAttribute('data-method') || 'efectivo';
      payButtons.forEach(b => {
        b.classList.remove('bg-[#1F3A5F]', 'text-white', 'border-[#1F3A5F]');
        b.classList.add('bg-white', 'text-[#1C1C1C]', 'border-[#D5CBB8]');
      });
      btn.classList.add('bg-[#1F3A5F]', 'text-white', 'border-[#1F3A5F]');
      btn.classList.remove('bg-white', 'text-[#1C1C1C]', 'border-[#D5CBB8]');
    });
  });

  // Confirmar corte walk-in
  const confirmCutBtn = document.getElementById('btn-confirm-walkin-cut');
  if (confirmCutBtn) {
    confirmCutBtn.addEventListener('click', async () => {
      const barberSelectEl = document.getElementById('walkin-barber-select');
      const selectedOption = barberSelectEl.options[barberSelectEl.selectedIndex];
      const barberoId = barberSelectEl.value;
      const barberoNombre = selectedOption.getAttribute('data-name');
      const sillon = selectedOption.getAttribute('data-sillon');

      const selectedCard = document.querySelector('.walkin-service-card input[type="radio"]:checked')?.closest('.walkin-service-card');
      const servicioId = selectedCard ? selectedCard.getAttribute('data-id') : cachedServicios[0]?.id;
      const servicioNombre = selectedCard ? selectedCard.getAttribute('data-name') : 'Corte Clásico Tradicional';
      const precio = selectedCard ? Number(selectedCard.getAttribute('data-price')) : 25000;

      const clienteNombre = document.getElementById('walkin-client-name')?.value.trim() || 'Cliente Mostrador';
      const comprobante = document.getElementById('walkin-comprobante')?.value.trim() || '';

      try {
        confirmCutBtn.disabled = true;
        confirmCutBtn.textContent = 'Registrando...';

        await cortesService.registrarCorte({
          barberoId,
          barberoNombre,
          sillon,
          servicioId,
          servicioIds: servicioId ? [servicioId] : [],
          servicioNombre,
          precio,
          metodoPago: selectedPaymentMethod,
          clienteNombre,
          comprobante,
          origen: 'walk_in'
        });

        emitDataMutation('cortes', 'create');
        closeDrawer();
        await loadCortesData();
        if (typeof onDataChange === 'function') onDataChange();
      } catch (err) {
        alert('Error al registrar corte: ' + err.message);
      } finally {
        confirmCutBtn.disabled = false;
        confirmCutBtn.innerHTML = `
          <span class="material-symbols-outlined text-[18px]">point_of_sale</span>
          <span>Registrar Corte y Cobrar</span>
        `;
      }
    });
  }

  // 9. Anular Corte Modal (CU-008)
  const dialogAnular = document.getElementById('dialog-anular-corte');
  const anularBtns = document.querySelectorAll('.btn-anular-corte');
  const cancelAnularBtn = document.getElementById('btn-cancelar-anulacion');
  const confirmAnularBtn = document.getElementById('btn-confirmar-anulacion');
  const motivoTextarea = document.getElementById('anular-motivo-input');
  const charCounter = document.getElementById('anular-char-counter');

  let activeCorteToAnular = null;

  anularBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      activeCorteToAnular = btn.getAttribute('data-id');
      const cliente = btn.getAttribute('data-cliente');
      const precio = Number(btn.getAttribute('data-precio')) || 0;
      const servicio = btn.getAttribute('data-servicio');

      document.getElementById('anular-corte-id').textContent = `#${activeCorteToAnular}`;
      document.getElementById('anular-corte-servicio').textContent = servicio;
      document.getElementById('anular-corte-cliente').textContent = cliente;
      document.getElementById('anular-corte-valor').textContent = formatCOP(precio);

      motivoTextarea.value = '';
      charCounter.textContent = '0 / 10 caracteres requeridos';
      confirmAnularBtn.disabled = true;

      if (dialogAnular) dialogAnular.showModal();
    });
  });

  if (motivoTextarea && charCounter && confirmAnularBtn) {
    motivoTextarea.addEventListener('input', (e) => {
      const len = e.target.value.trim().length;
      charCounter.textContent = `${len} / 10 caracteres requeridos`;
      confirmAnularBtn.disabled = len < 10;
    });
  }

  if (cancelAnularBtn && dialogAnular) {
    cancelAnularBtn.addEventListener('click', () => dialogAnular.close());
  }

  if (confirmAnularBtn) {
    confirmAnularBtn.addEventListener('click', async () => {
      if (!activeCorteToAnular) return;
      const motivo = motivoTextarea.value.trim();

      try {
        confirmAnularBtn.disabled = true;
        confirmAnularBtn.textContent = 'Anulando...';

        await cortesService.anularCorte(activeCorteToAnular, {
          motivo,
          adminNombre: 'Carlos Mendoza'
        });

        emitDataMutation('cortes', 'delete');
        dialogAnular.close();
        await loadCortesData();
        if (typeof onDataChange === 'function') onDataChange();
      } catch (err) {
        alert('Error al anular: ' + err.message);
        confirmAnularBtn.disabled = false;
        confirmAnularBtn.textContent = 'Confirmar Anulación';
      }
    });
  }

  // 10. Ver Motivo de Corte Anulado
  const dialogVerMotivo = document.getElementById('dialog-ver-motivo');
  const verMotivoBtns = document.querySelectorAll('.btn-ver-motivo');
  const cerrarVerMotivoBtn = document.getElementById('btn-cerrar-ver-motivo');

  verMotivoBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-id');
      const motivo = btn.getAttribute('data-motivo');
      const autor = btn.getAttribute('data-autor');
      const fecha = btn.getAttribute('data-fecha');

      document.getElementById('ver-motivo-id').textContent = `#${id}`;
      document.getElementById('ver-motivo-texto').textContent = motivo;
      document.getElementById('ver-motivo-autor').textContent = `Auditor: ${autor}`;
      document.getElementById('ver-motivo-fecha').textContent = fecha ? `Fecha: ${fecha.substring(0, 10)}` : 'Fecha: 20 Nov 2026';

      if (dialogVerMotivo) dialogVerMotivo.showModal();
    });
  });

  if (cerrarVerMotivoBtn && dialogVerMotivo) {
    cerrarVerMotivoBtn.addEventListener('click', () => dialogVerMotivo.close());
  }
}

// Utilidad de exportación CSV (CU-007)
function exportarCierreCSV(cortes = []) {
  const headers = ['ID_Corte', 'Codigo_Cita', 'Fecha_Hora', 'Barbero', 'Sillon', 'Cliente', 'Servicio', 'Origen', 'Metodo_Pago', 'Valor_COP', 'Estado', 'Comision_Estimada_COP', 'Motivo_Anulacion'];
  
  const rows = cortes.map(c => [
    `"${c.id}"`,
    `"${c.codigoCita || ''}"`,
    `"${c.fechaHora}"`,
    `"${c.barberoNombre}"`,
    `"${c.sillon || 'Sillón 01'}"`,
    `"${c.clienteNombre}"`,
    `"${c.servicioNombre}"`,
    `"${c.origen}"`,
    `"${c.metodoPago}"`,
    c.precio,
    `"${c.estado}"`,
    c.comisionEstimada || 0,
    `"${c.motivoAnulacion ? c.motivoAnulacion.replace(/"/g, '""') : ''}"`
  ]);

  const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `cierre_caja_smartbarber_${new Date().toISOString().substring(0,10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
