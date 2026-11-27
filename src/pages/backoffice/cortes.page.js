/**
 * SmartBarber - Módulo de Historial de Cortes y Caja Diaria
 * Fiel a docs/stitch/smartbarber_historial_de_cortes_y_caja_diaria
 * Conexión completa con cortesService, arqueo POS en tiempo real,
 * anulación auditable con motivo (CU-008), exportación CSV (CU-007)
 * y drawer de registro rápido Walk-in.
 */

import { cajaFinancialService } from '../../services/caja-financial.service.js';
import { cortesService, authService } from '../../services/index.js';
import { formatCOP, formatDateBogota, formatPlural } from '../../utils/formatters.js';
import { renderActionButton } from '../../components/action-button.js';
import { emitDataMutation } from '../../utils/event-bus.js';
import { Capabilities, can, whenCan } from '../../utils/access-control.js';

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
let financialState = null;

export async function loadCortesData() {
  financialState = await cajaFinancialService.loadFinancialData(currentFilters);
  cachedCortes = financialState.cortes;
  cachedBarberos = financialState.barberos;
  cachedServicios = financialState.servicios;
}

export function renderCortesPage() {
  const user = authService.getCurrentUser() || {};
  const canViewAllCash = can(Capabilities.CASHREGISTER_VIEW_ALL, user);
  const canExportCash = can(Capabilities.CASHREGISTER_EXPORT, user);
  const canFilterBarbers = can(Capabilities.BARBERS_FILTER, user);
  const canViewPosSales = can(Capabilities.POS_SALES_VIEW_ALL, user);
  const canAnnulCut = can(Capabilities.CUTS_ANNUL, user);
  const canViewAuditAuthor = can(Capabilities.CUTS_AUDIT_VIEW, user);
  const canAssignAnyBarber = can(Capabilities.CUTS_ASSIGN_ANY_BARBER, user);
  const isBarbero = !canViewAllCash;

  const fs = financialState || {
    totales: {
      totalIngresosBrutosCop: 0,
      ingresosServiciosCop: 0,
      ingresosProductosCop: 0,
      totalComisionesCop: 0,
      margenSedeCop: 0,
      totalAnuladosExcluidosCop: 0,
      totalAtencionesActivas: 0,
      totalAtencionesAnuladas: 0,
      totalCitas: 0,
      totalWalkIns: 0,
      totalVentasProductos: 0,
      totalOperaciones: 0
    },
    desgloseMetodosPago: {
      efectivo: { total: 0, count: 0, label: 'Efectivo', icon: 'payments', color: 'bg-[#235D3A]', hex: '#235D3A' },
      nequi: { total: 0, count: 0, label: 'Nequi', icon: 'phone_iphone', color: 'bg-[#7BA3D4]', hex: '#7BA3D4' },
      daviplata: { total: 0, count: 0, label: 'Daviplata', icon: 'account_balance_wallet', color: 'bg-[#E07A7A]', hex: '#E07A7A' },
      datafono: { total: 0, count: 0, label: 'Datáfono', icon: 'credit_card', color: 'bg-[#1F3A5F]', hex: '#1F3A5F' },
      transferencia: { total: 0, count: 0, label: 'Transferencia', icon: 'account_balance', color: 'bg-[#8A5300]', hex: '#8A5300' }
    },
    transacciones: [],
    cortes: [],
    activos: [],
    anulados: []
  };

  const totalIngresos = fs.totales.totalIngresosBrutosCop;
  const breakdown = fs.desgloseMetodosPago;
  const transacciones = fs.transacciones;
  const activos = fs.activos;
  const anulados = fs.anulados;
  const fechaHoyLabel = formatDateBogota(new Date(), { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });

  return `
    <div class="flex flex-col gap-6 w-full animate-fadeIn">
      <!-- HEADER PRINCIPAL & ACCIONES GLOBALES -->
      <section class="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div class="flex items-center gap-2">
            <span class="font-sans text-[11px] uppercase tracking-widest text-[#6B645A] font-semibold">${isBarbero ? 'Mis Servicios' : 'Módulo Financiero y POS'}</span>
            <span class="text-[#8C8272] text-xs">•</span>
            <span class="font-sans text-xs text-[#4F4A42]">${isBarbero ? 'Mis cobros registrados' : 'Arqueo en tiempo real'}</span>
          </div>
          <h1 class="font-serif text-2xl sm:text-3xl font-bold text-[#1C1C1C] tracking-tight mt-0.5">
            ${isBarbero ? 'Mis Cortes y Cobros' : 'Cortes y Caja Diaria'}
          </h1>
        </div>

        <!-- Botones de Acción -->
        <div class="flex items-center flex-wrap gap-2.5">
          <div class="flex items-center gap-2 bg-[#FAF7F2] border border-[#D5CBB8] px-3 py-2 rounded-lg text-xs font-mono font-medium text-[#1C1C1C]">
            <span class="material-symbols-outlined text-[16px] text-[#6B645A]">calendar_today</span>
            <span>Hoy: ${fechaHoyLabel}</span>
          </div>
          ${whenCan(Capabilities.CASHREGISTER_EXPORT, () => `
            <button
              type="button"
              id="btn-export-csv"
              class="min-h-[44px] inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#E4ECF5] text-[#1F3A5F] hover:bg-[#d5e3ff] font-sans font-semibold text-xs transition-colors shadow-xs"
            >
              <span class="material-symbols-outlined text-[18px]">download</span>
              <span>Exportar Cierre (CSV)</span>
            </button>
          `, '', user)}
          ${renderActionButton({
            id: 'btn-open-walkin-drawer',
            variant: 'primary',
            icon: 'add',
            label: 'Registrar Corte (Walk-in)'
          })}
        </div>
      </section>

      <!-- FINANCIAL SUMMARY ROW: TARJETA DUAL DE ARQUEO -->
      <section class="bg-[#FAF7F2] border border-[#D5CBB8] rounded-xl shadow-xs p-5 sm:p-6">
        <div class="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          <!-- Bloque Izquierdo: Total Ingresos (40%) -->
          <div class="lg:col-span-5 flex flex-col justify-between pr-0 lg:pr-6 bg-[#FAF3E5] p-4 sm:p-5 rounded-lg border border-[#D5CBB8]/60">
            <div>
              <div class="flex items-center justify-between">
                <span class="font-sans text-xs uppercase tracking-wider text-[#57534E] font-semibold">${isBarbero ? 'Mis Ingresos Cobrados (Hoy)' : 'Total Ingresos Brutos Caja (Hoy)'}</span>
                <span class="material-symbols-outlined text-[18px] text-[#235D3A]" aria-hidden="true">verified</span>
              </div>
              <div class="flex items-baseline gap-2 mt-1">
                <span class="font-serif text-3xl sm:text-4xl font-bold text-[#1C1C1C] tabular-nums tracking-tight">
                  ${formatCOP(totalIngresos)}
                </span>
              </div>
            </div>

            <div class="mt-4 pt-3 border-t border-[#D5CBB8]/80 flex flex-col gap-1.5 text-xs text-[#4F4A42]">
              <div class="flex items-center gap-1.5">
                <span class="material-symbols-outlined text-[16px] text-[#1F3A5F]" aria-hidden="true">info</span>
                <span><strong>${formatPlural(fs.totales.totalOperaciones, 'operación', 'operaciones')}</strong> (${fs.totales.totalCitas} Citas · ${fs.totales.totalWalkIns} Walk-in${canViewPosSales ? ` · ${fs.totales.totalVentasProductos} Productos` : ''})</span>
              </div>
              <div class="flex items-center justify-between text-xs text-[#57534E]">
                <span>${isBarbero ? `Mi Comisión Ganada: <strong class="font-mono text-[#1F3A5F]">${formatCOP(fs.totales.totalComisionesCop)}</strong>` : `Comisiones: <strong class="font-mono text-[#1F3A5F]">${formatCOP(fs.totales.totalComisionesCop)}</strong> · Margen Sede: <strong class="font-mono text-[#235D3A]">${formatCOP(fs.totales.margenSedeCop)}</strong>`}</span>
              </div>
              <div class="flex items-center gap-1.5 text-xs text-[#57534E]">
                <span class="inline-block w-1.5 h-1.5 rounded-full bg-[#8A5300]" aria-hidden="true"></span>
                <span>${formatPlural(anulados.length, 'anulada excluida', 'anuladas excluidas')} del arqueo (${formatCOP(fs.totales.totalAnuladosExcluidosCop)})</span>
              </div>
              <div class="flex items-center gap-1.5 text-[#235D3A] font-semibold text-xs mt-1">
                <span class="material-symbols-outlined text-[15px]" aria-hidden="true">check_circle</span>
                <span>${canViewAllCash ? 'Caja cuadrada con comprobantes digitales y arqueo de efectivo' : 'Resumen calculado sobre tus servicios cobrados hoy'}</span>
              </div>
            </div>
          </div>

          <!-- Bloque Derecho: Desglose por Método de Pago (60%) -->
          <div class="lg:col-span-7 flex flex-col justify-between pl-0 lg:pl-2 gap-3">
            <div class="flex items-center justify-between flex-wrap gap-2">
              <span class="font-sans text-xs uppercase tracking-wider text-[#57534E] font-semibold">
                Desglose por Método de Pago (100% = ${formatCOP(totalIngresos)})
              </span>
              <span class="font-mono text-xs text-[#57534E]">${canViewAllCash ? 'Arqueo Consolidado Sede' : 'Mis Métodos de Cobro'}</span>
            </div>

            <!-- Mini Cards Grid de los 5 Métodos -->
            <div class="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-2">
              ${Object.keys(breakdown).map(k => {
                const item = breakdown[k];
                const pct = totalIngresos > 0 ? ((item.total / totalIngresos) * 100).toFixed(1) : 0;
                const dotHex = item.hex || '#1F3A5F';
                return `
                  <div class="bg-[#E8DFCE]/40 border border-[#D5CBB8] p-3 rounded-lg flex flex-col justify-between">
                    <div class="flex items-center justify-between text-[#4F4A42] mb-1 gap-1.5">
                      <span class="inline-flex items-center gap-1.5 font-sans text-xs font-semibold truncate">
                        <span class="w-2.5 h-2.5 rounded-full shrink-0" style="background-color: ${dotHex};" aria-hidden="true"></span>
                        <span class="truncate">${item.label}</span>
                      </span>
                      <span class="material-symbols-outlined text-[16px] shrink-0" aria-hidden="true">${item.icon}</span>
                    </div>
                    <div>
                      <div class="font-mono text-sm font-bold text-[#1C1C1C] tabular-nums">
                        ${formatCOP(item.total)}
                      </div>
                      <div class="font-sans text-xs text-[#57534E] mt-0.5">
                        ${pct}% · ${item.count} tx
                      </div>
                    </div>
                  </div>
                `;
              }).join('')}
            </div>

            <!-- Barra Proporcional de Métodos -->
            <div class="w-full bg-[#E8DFCE] h-2.5 rounded-full overflow-hidden flex mt-2 shadow-inner" role="img" aria-label="Distribución proporcional de ingresos por método de pago">
              ${Object.keys(breakdown).map(k => {
                const item = breakdown[k];
                const pct = totalIngresos > 0 ? (item.total / totalIngresos) * 100 : 0;
                const barHex = item.hex || '#1F3A5F';
                return `<div class="h-full transition-all" style="width: ${pct}%; background-color: ${barHex};" title="${item.label}: ${pct.toFixed(1)}%"></div>`;
              }).join('')}
            </div>
          </div>
        </div>
      </section>

      <!-- BARRA DE BÚSQUEDA Y FILTROS -->
      <section class="bg-[#FAF7F2] border border-[#D5CBB8] rounded-xl shadow-xs p-4 flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        <!-- Buscador y Dropdowns -->
        <div class="flex flex-wrap items-center gap-2.5 flex-1">
          <div class="relative min-w-[260px] flex-1 xl:max-w-xs">
            <span class="material-symbols-outlined absolute left-3 top-2.5 text-[#57534E] text-[18px]" aria-hidden="true">search</span>
            <input
              type="text"
              id="filter-cortes-search"
              value="${currentFilters.search}"
              placeholder="${canFilterBarbers ? 'Buscar código, cliente o barbero' : 'Buscar código, cliente o servicio'}"
              aria-label="Buscar movimientos en caja"
              class="w-full pl-9 pr-3 h-10 bg-white border border-[#8C8272] rounded-lg text-xs text-[#1C1C1C] placeholder-[#57534E] focus:outline-none focus:ring-2 focus:ring-[#1F3A5F]"
            />
          </div>

          ${canFilterBarbers ? `
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
          ` : ''}

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
              data-origen="walk_in"
              class="px-2.5 py-1 rounded text-xs font-semibold ${(currentFilters.origen === 'walk_in' || currentFilters.origen === 'walk-in') ? 'bg-white text-[#1C1C1C] shadow-xs' : 'text-[#6B645A] hover:text-[#1C1C1C]'}"
            >Walk-in</button>
            ${canViewPosSales ? `
            <button
              type="button"
              data-origen="producto"
              class="px-2.5 py-1 rounded text-xs font-semibold ${currentFilters.origen === 'producto' ? 'bg-white text-[#1C1C1C] shadow-xs' : 'text-[#6B645A] hover:text-[#1C1C1C]'}"
            >Productos</button>
            ` : ''}
          </div>

          <!-- Estado Pills -->
          <div class="flex items-center bg-[#E8DFCE] p-1 rounded-lg">
            <button
              type="button"
              data-estado="all"
              class="px-2.5 py-1 rounded text-xs font-semibold ${currentFilters.estado === 'all' ? 'bg-white text-[#1C1C1C] shadow-xs' : 'text-[#6B645A] hover:text-[#1C1C1C]'}"
            >Todos (${transacciones.length})</button>
            <button
              type="button"
              data-estado="activo"
              class="px-2.5 py-1 rounded text-xs font-semibold ${currentFilters.estado === 'activo' ? 'bg-white text-[#235D3A] shadow-xs' : 'text-[#6B645A] hover:text-[#1C1C1C]'}"
            >Activos (${transacciones.filter(t => !t.esAnulado).length})</button>
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
          <table class="responsive-table w-full text-left border-collapse">
            <thead>
              <tr class="bg-[#E8DFCE] text-[#4F4A42] font-sans text-xs uppercase tracking-wider">
                <th class="py-3 px-4 font-semibold">ID / Hora</th>
                ${canViewAllCash ? `<th class="py-3 px-4 font-semibold">Barbero y Sillón</th>` : ''}
                <th class="py-3 px-4 font-semibold">Servicio / Producto</th>
                <th class="py-3 px-4 font-semibold">Origen</th>
                <th class="py-3 px-4 font-semibold">Método de Pago</th>
                <th class="py-3 px-4 font-semibold text-right">Valor</th>
                <th class="py-3 px-4 font-semibold text-center">Estado</th>
                <th class="py-3 px-4 font-semibold text-right">Detalle</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-[#D5CBB8]/40 text-xs text-[#1C1C1C]">
              ${transacciones.length === 0 ? `
                <tr>
                  <td colspan="${canViewAllCash ? 8 : 7}" class="py-12 text-center text-[#57534E]">
                    <div class="flex flex-col items-center gap-2">
                      <span class="material-symbols-outlined text-[32px] text-[#8C8272]" aria-hidden="true">receipt_long</span>
                      <p class="font-medium text-sm">No se encontraron movimientos con los filtros seleccionados.</p>
                      <button type="button" id="btn-empty-reset" class="min-h-[36px] touch-action text-xs font-semibold text-[#1F3A5F] hover:underline">Restablecer filtros</button>
                    </div>
                  </td>
                </tr>
              ` : transacciones.map(tx => {
                const isAnulado = tx.esAnulado;
                const isProducto = tx.tipoTransaccion === 'producto';
                return `
                  <tr class="hover:bg-[#FAF3E5] transition-colors ${isAnulado ? 'bg-[#FAF3E5]/50 opacity-85' : 'bg-white'}">
                    <!-- Referencia / Hora -->
                    <td class="py-3 px-4" data-label="ID / Hora">
                      <div class="font-mono text-xs font-bold ${isProducto ? 'text-[#235D3A]' : 'text-[#1F3A5F]'}">${tx.codigoCita || (isProducto ? 'POS' : 'CORTE')}</div>
                      <div class="text-xs text-[#57534E] font-mono mt-0.5">${tx.horaFormato || '02:00 PM'}</div>
                    </td>

                    ${canViewAllCash ? `
                      <!-- Barbero & Sillón -->
                      <td class="py-3 px-4" data-label="Barbero">
                        <div class="font-sans font-semibold text-[#1C1C1C]">${tx.barberoNombre}</div>
                        <div class="text-xs text-[#57534E]">${tx.sillon || 'Sillón 01'}</div>
                      </td>
                    ` : ''}

                    <!-- Servicios / Producto & Cliente -->
                    <td class="py-3 px-4" data-label="Servicio / Producto">
                      <div class="font-medium text-[#1C1C1C] ${isAnulado ? 'line-through text-[#57534E]' : ''}">
                        ${tx.descripcionPrincipal}
                      </div>
                      <div class="text-xs text-[#57534E]">
                        ${tx.descripcionSecundaria}
                      </div>
                    </td>

                    <!-- Origen -->
                    <td class="py-3 px-4" data-label="Origen">
                      ${isProducto ? `
                        <span class="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded bg-[#E3EFE7] text-[#235D3A] font-semibold border border-[#235D3A]/20">
                          <span class="material-symbols-outlined text-[13px]" aria-hidden="true">shopping_bag</span>
                          <span>Producto</span>
                        </span>
                      ` : (tx.origen === 'walk_in' || tx.origen === 'walk-in') ? `
                        <span class="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded bg-[#FDF1DC] text-[#8A5300] font-semibold border border-[#8A5300]/20">
                          <span class="material-symbols-outlined text-[13px]" aria-hidden="true">directions_walk</span>
                          <span>Walk-in</span>
                        </span>
                      ` : `
                        <span class="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded bg-[#E4ECF5] text-[#1F3A5F] font-semibold border border-[#1F3A5F]/20">
                          <span class="material-symbols-outlined text-[13px]" aria-hidden="true">event_available</span>
                          <span>Cita</span>
                        </span>
                      `}
                    </td>

                    <!-- Método de Pago -->
                    <td class="py-3 px-4" data-label="Método de Pago">
                      <div class="inline-flex items-center gap-1.5 font-sans text-xs text-[#4F4A42] bg-[#E8DFCE]/60 px-2.5 py-1 rounded border border-[#D5CBB8]">
                        <span class="material-symbols-outlined text-[15px] ${
                          tx.metodoPago === 'nequi' ? 'text-[#7BA3D4]' :
                          tx.metodoPago === 'daviplata' ? 'text-[#E07A7A]' :
                          tx.metodoPago === 'efectivo' ? 'text-[#235D3A]' :
                          (tx.metodoPago === 'datafono' || tx.metodoPago === 'tarjeta_debito_credito') ? 'text-[#1F3A5F]' : 'text-[#57534E]'
                        }" aria-hidden="true">
                          ${
                            tx.metodoPago === 'nequi' ? 'phone_iphone' :
                            tx.metodoPago === 'daviplata' ? 'account_balance_wallet' :
                            tx.metodoPago === 'efectivo' ? 'payments' :
                            (tx.metodoPago === 'datafono' || tx.metodoPago === 'tarjeta_debito_credito') ? 'credit_card' : 'account_balance'
                          }
                        </span>
                        <span class="capitalize">${String(tx.metodoPago || 'efectivo').replace('_', ' ')}</span>
                      </div>
                    </td>

                    <!-- Valor COP -->
                    <td class="py-3 px-4 text-right font-mono font-bold text-[#1C1C1C] tabular-nums ${isAnulado ? 'line-through text-[#57534E]' : ''}" data-label="Valor">
                      ${formatCOP(tx.monto)}
                    </td>

                    <!-- Estado -->
                    <td class="py-3 px-4 text-center" data-label="Estado">
                      ${isAnulado ? `
                        <span class="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded bg-[#FCE8E6] text-[#B3261E] font-semibold border border-[#B3261E]/30" title="${tx.motivoAnulacion || 'Corte anulado'}">
                          <span class="material-symbols-outlined text-[13px]" aria-hidden="true">cancel</span>
                          <span>Anulado</span>
                        </span>
                      ` : `
                        <span class="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded bg-[#E3EFE7] text-[#235D3A] font-semibold border border-[#235D3A]/20">
                          <span class="material-symbols-outlined text-[13px]" aria-hidden="true">check_circle</span>
                          <span>Activo</span>
                        </span>
                      `}
                    </td>

                    <!-- Acción Auditoría / Detalle -->
                    <td class="py-3 px-4 text-right" data-label="Detalle">
                      <button
                        type="button"
                        class="btn-ver-detalle-tx touch-action min-h-[36px] inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-[#D5CBB8] bg-white hover:bg-[#FAF3E5] text-xs font-semibold text-[#1F3A5F] transition-colors cursor-pointer"
                        data-id="${tx.id}"
                        data-tipo="${tx.tipoTransaccion || 'servicio'}"
                        data-codigo="${tx.codigoCita || (isProducto ? 'POS' : 'CORTE')}"
                        data-hora="${tx.horaFormato || ''}"
                        data-barbero="${tx.barberoNombre || 'Caja'}"
                        data-sillon="${tx.sillon || 'Mostrador'}"
                        data-cliente="${tx.clienteNombre || 'Cliente Mostrador'}"
                        data-servicio="${tx.descripcionPrincipal || tx.servicioNombre || ''}"
                        data-metodo="${tx.metodoPago || 'efectivo'}"
                        data-monto="${tx.monto ?? tx.precio ?? 0}"
                        data-anulado="${isAnulado ? '1' : '0'}"
                        data-motivo="${tx.motivoAnulacion || ''}"
                        ${canViewAuditAuthor ? `data-autor="${tx.anuladoPor || 'Administrador'}"` : ''}
                        data-fecha-anulacion="${tx.fechaAnulacion || ''}"
                      >
                        <span class="material-symbols-outlined text-[15px]" aria-hidden="true">visibility</span>
                        <span>${isAnulado ? 'Ver detalle' : 'Ver detalle'}</span>
                      </button>
                    </td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>

        <!-- Table Footer / Auditoría info -->
        <div class="bg-[#E8DFCE] px-4 py-3 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-[#4F4A42]">
          <span>Mostrando <strong>${formatPlural(transacciones.length, 'movimiento', 'movimientos')}</strong> (${transacciones.filter(t => !t.esAnulado).length} activos, ${anulados.length} auditados anulados)</span>
          <span class="font-mono text-xs text-[#57534E]">SmartBarber POS · Arqueo de Caja</span>
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
            aria-label="Cerrar panel de registro walk-in"
            class="touch-action w-11 h-11 rounded-full flex items-center justify-center text-[#BDB4A5] hover:text-white hover:bg-white/10 transition-colors"
          >
            <span class="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        <!-- Drawer Body -->
        <div class="flex-1 overflow-y-auto p-5 flex flex-col gap-5">
          <!-- 1. Barbero (preseleccionado y bloqueado para Barbero - RF-COR-01) -->
          <div class="flex flex-col gap-1.5">
            <label for="walkin-barber-select" class="font-sans font-semibold text-xs text-[#1C1C1C]">
              Barbero que atiende <span class="text-[#8B1E1E]">*</span>
            </label>
            <div class="relative">
              ${canAssignAnyBarber ? `
                <select
                  id="walkin-barber-select"
                  class="w-full h-11 pl-3 pr-8 bg-white border border-[#8C8272] rounded-lg text-xs font-medium text-[#1C1C1C] focus:outline-none focus:ring-2 focus:ring-[#1F3A5F] appearance-none"
                >
                  ${cachedBarberos.filter(b => b.activo !== false).map((b, idx) => `
                    <option value="${b.id}" data-name="${b.nombre}" data-sillon="${b.sillon || `Sillón 0${idx+1}`}" ${user.barberoId && b.id === user.barberoId ? 'selected' : ''}>
                      ${b.nombre} (${b.sillon || `Sillón 0${idx+1}`})
                    </option>
                  `).join('')}
                </select>
                <span class="material-symbols-outlined absolute right-3 top-3 text-[#6B645A] pointer-events-none text-[18px]">expand_more</span>
              ` : `
                <select
                  id="walkin-barber-select"
                  disabled
                  class="w-full h-11 pl-3 pr-8 bg-[#E8DFCE]/70 border border-[#8C8272] rounded-lg text-xs font-semibold text-[#4F4A42] cursor-not-allowed appearance-none"
                >
                  <option value="${user.barberoId || ''}" data-name="${user.nombreCompleto || 'Barbero'}" data-sillon="Mi Sillón" selected>
                    ${user.nombreCompleto || 'Barbero'} (Perfil bloqueado)
                  </option>
                </select>
                <span class="material-symbols-outlined absolute right-3 top-3 text-[#6B645A] pointer-events-none text-[18px]">lock</span>
              `}
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
                ${cachedServicios[0] ? formatCOP(cachedServicios[0].precio) : '$ 25.000 COP'}
              </span>
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

    ${canAnnulCut ? `
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
    ` : ''}

    <!-- ========================================== -->
    <!-- MODAL DE DETALLE DE MOVIMIENTO Y AUDITORÍA -->
    <!-- ========================================== -->
    <dialog
      id="dialog-detalle-tx"
      class="p-0 rounded-2xl bg-[#FAF7F2] border border-[#D5CBB8] shadow-2xl backdrop:bg-black/50 max-w-md w-full mx-auto my-auto"
    >
      <div class="p-6 flex flex-col gap-4">
        <div class="flex items-start justify-between gap-3">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-full bg-[#E4ECF5] text-[#1F3A5F] flex items-center justify-center shrink-0">
              <span class="material-symbols-outlined text-[20px]" aria-hidden="true">receipt_long</span>
            </div>
            <div>
              <h3 class="font-serif text-base font-bold text-[#1C1C1C]">Detalle del Movimiento</h3>
              <span class="text-xs text-[#57534E] font-mono" id="detalle-tx-codigo">#RC-1042</span>
            </div>
          </div>
          <button
            type="button"
            id="btn-cerrar-detalle-x"
            aria-label="Cerrar detalle"
            class="touch-action w-9 h-9 rounded-full flex items-center justify-center text-[#57534E] hover:bg-[#E8DFCE] transition-colors"
          >
            <span class="material-symbols-outlined text-[18px]" aria-hidden="true">close</span>
          </button>
        </div>

        <div class="p-3.5 rounded-lg bg-[#FAF3E5] border border-[#D5CBB8] flex flex-col gap-2 text-xs">
          <div class="flex justify-between gap-2">
            <span class="text-[#57534E]">Concepto:</span>
            <span class="font-semibold text-[#1C1C1C] text-right" id="detalle-tx-servicio">—</span>
          </div>
          <div class="flex justify-between gap-2">
            <span class="text-[#57534E]">Cliente:</span>
            <span class="text-[#1C1C1C] text-right" id="detalle-tx-cliente">—</span>
          </div>
          <div class="flex justify-between gap-2">
            <span class="text-[#57534E]">Barbero / Responsable:</span>
            <span class="text-[#1C1C1C] text-right" id="detalle-tx-barbero">—</span>
          </div>
          <div class="flex justify-between gap-2">
            <span class="text-[#57534E]">Método de pago:</span>
            <span class="capitalize font-medium text-[#1C1C1C]" id="detalle-tx-metodo">—</span>
          </div>
          <div class="flex justify-between gap-2 border-t border-[#D5CBB8] pt-2 mt-0.5">
            <span class="text-[#57534E]">Total cobrado:</span>
            <span class="font-mono font-bold text-[#1C1C1C]" id="detalle-tx-monto">$ 0 COP</span>
          </div>
        </div>

        <!-- Bloque auditoría (solo si está anulado) -->
        <div id="detalle-tx-anulacion-box" class="hidden flex-col gap-2">
          <span class="text-xs font-semibold text-[#B3261E]">Motivo de anulación:</span>
          <div class="p-3 rounded-lg bg-white border border-[#B3261E]/30 text-xs text-[#1C1C1C] leading-relaxed" id="ver-motivo-texto"></div>
          <div class="text-xs text-[#57534E] flex justify-between">
            ${canViewAuditAuthor ? `<span id="ver-motivo-autor">Auditor: Administración</span>` : `<span>Anulado por administración</span>`}
            <span id="ver-motivo-fecha"></span>
          </div>
        </div>

        <div class="flex items-center justify-between gap-2 pt-2 border-t border-[#D5CBB8]">
          ${canAnnulCut ? `
            <button
              type="button"
              id="btn-detalle-ir-anular"
              class="hidden min-h-[44px] px-4 py-2 rounded-lg bg-[#FCE8E6] hover:bg-[#B3261E] text-[#B3261E] hover:text-white border border-[#B3261E]/30 text-xs font-semibold transition-colors cursor-pointer"
            >
              Anular movimiento
            </button>
          ` : '<span></span>'}
          <button
            type="button"
            id="btn-cerrar-detalle-tx"
            class="min-h-[44px] px-4 py-2 rounded-lg bg-[#1F3A5F] hover:bg-[#162B47] text-white text-xs font-semibold ml-auto cursor-pointer"
          >
            Cerrar
          </button>
        </div>
      </div>
    </dialog>
  `;
}

export function attachCortesListeners(onDataChange) {
  const user = authService.getCurrentUser() || {};
  const canAnnulCut = can(Capabilities.CUTS_ANNUL, user);
  const canViewAuditAuthor = can(Capabilities.CUTS_AUDIT_VIEW, user);
  const canExportCash = can(Capabilities.CASHREGISTER_EXPORT, user);
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

  // 7. Exportar CSV (CU-007, solo autorizado)
  const exportBtn = document.getElementById('btn-export-csv');
  if (exportBtn && canExportCash) {
    exportBtn.addEventListener('click', () => {
      exportarCierreCSV(financialState?.transacciones || cachedCortes);
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

  // 9. Modal de Detalle de Movimiento & Anulación Auditable (CU-008)
  const dialogDetalle = document.getElementById('dialog-detalle-tx');
  const detalleBtns = document.querySelectorAll('.btn-ver-detalle-tx');
  const cerrarDetalleBtn = document.getElementById('btn-cerrar-detalle-tx');
  const cerrarDetalleX = document.getElementById('btn-cerrar-detalle-x');
  const btnDetalleIrAnular = document.getElementById('btn-detalle-ir-anular');

  const dialogAnular = document.getElementById('dialog-anular-corte');
  const cancelAnularBtn = document.getElementById('btn-cancelar-anulacion');
  const confirmAnularBtn = document.getElementById('btn-confirmar-anulacion');
  const motivoTextarea = document.getElementById('anular-motivo-input');
  const charCounter = document.getElementById('anular-char-counter');

  let activeCorteToAnular = null;
  let activeDetallePayload = null;

  detalleBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-id');
      const tipo = btn.getAttribute('data-tipo');
      const codigo = btn.getAttribute('data-codigo');
      const hora = btn.getAttribute('data-hora');
      const barbero = btn.getAttribute('data-barbero');
      const sillon = btn.getAttribute('data-sillon');
      const cliente = btn.getAttribute('data-cliente');
      const servicio = btn.getAttribute('data-servicio');
      const metodo = String(btn.getAttribute('data-metodo') || 'efectivo').replace('_', ' ');
      const monto = Number(btn.getAttribute('data-monto')) || 0;
      const isAnulado = btn.getAttribute('data-anulado') === '1';
      const motivo = btn.getAttribute('data-motivo');
      const autor = btn.getAttribute('data-autor');
      const fechaAnulacion = btn.getAttribute('data-fecha-anulacion');

      activeDetallePayload = { id, tipo, cliente, monto, servicio };

      const codigoEl = document.getElementById('detalle-tx-codigo');
      if (codigoEl) codigoEl.textContent = `${codigo}${hora ? ` · ${hora}` : ''}`;
      const servEl = document.getElementById('detalle-tx-servicio');
      if (servEl) servEl.textContent = servicio || '—';
      const cliEl = document.getElementById('detalle-tx-cliente');
      if (cliEl) cliEl.textContent = cliente || 'Cliente Mostrador';
      const barbEl = document.getElementById('detalle-tx-barbero');
      if (barbEl) barbEl.textContent = sillon ? `${barbero} (${sillon})` : barbero;
      const metEl = document.getElementById('detalle-tx-metodo');
      if (metEl) metEl.textContent = metodo;
      const monEl = document.getElementById('detalle-tx-monto');
      if (monEl) monEl.textContent = formatCOP(monto);

      const anulacionBox = document.getElementById('detalle-tx-anulacion-box');
      if (anulacionBox) {
        if (isAnulado) {
          anulacionBox.classList.remove('hidden');
          anulacionBox.classList.add('flex');
          const textoEl = document.getElementById('ver-motivo-texto');
          if (textoEl) textoEl.textContent = motivo || 'Sin motivo registrado';
          const autorEl = document.getElementById('ver-motivo-autor');
          if (autorEl && canViewAuditAuthor) autorEl.textContent = `Auditor: ${autor || 'Administrador'}`;
          const fechaEl = document.getElementById('ver-motivo-fecha');
          if (fechaEl) fechaEl.textContent = fechaAnulacion ? `Fecha: ${fechaAnulacion.substring(0, 10)}` : '';
        } else {
          anulacionBox.classList.add('hidden');
          anulacionBox.classList.remove('flex');
        }
      }

      if (btnDetalleIrAnular) {
        const allowAnnul = canAnnulCut && tipo !== 'producto' && !isAnulado;
        btnDetalleIrAnular.classList.toggle('hidden', !allowAnnul);
      }

      if (dialogDetalle) dialogDetalle.showModal();
    });
  });

  if (cerrarDetalleBtn && dialogDetalle) {
    cerrarDetalleBtn.addEventListener('click', () => dialogDetalle.close());
  }
  if (cerrarDetalleX && dialogDetalle) {
    cerrarDetalleX.addEventListener('click', () => dialogDetalle.close());
  }

  if (canAnnulCut) {
    if (btnDetalleIrAnular && dialogAnular) {
      btnDetalleIrAnular.addEventListener('click', () => {
        if (!activeDetallePayload) return;
        if (dialogDetalle) dialogDetalle.close();
        activeCorteToAnular = activeDetallePayload.id;
        document.getElementById('anular-corte-id').textContent = `#${activeDetallePayload.id}`;
        document.getElementById('anular-corte-servicio').textContent = activeDetallePayload.servicio;
        document.getElementById('anular-corte-cliente').textContent = activeDetallePayload.cliente;
        document.getElementById('anular-corte-valor').textContent = formatCOP(activeDetallePayload.monto);

        if (motivoTextarea) motivoTextarea.value = '';
        if (charCounter) charCounter.textContent = '0 / 10 caracteres requeridos';
        if (confirmAnularBtn) confirmAnularBtn.disabled = true;

        dialogAnular.showModal();
      });
    }

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
            adminNombre: user.nombreCompleto || 'Administrador'
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
  }
}

// Utilidad de exportación CSV (CU-007)
function exportarCierreCSV(transacciones = []) {
  const headers = ['ID_Transaccion', 'Codigo_Referencia', 'Fecha_Hora', 'Barbero_O_Responsable', 'Sillon', 'Cliente', 'Detalle_Servicio_O_Producto', 'Tipo_Origen', 'Metodo_Pago', 'Valor_COP', 'Estado', 'Comision_Estimada_COP', 'Motivo_Anulacion'];
  
  const rows = transacciones.map(t => [
    `"${t.id}"`,
    `"${t.codigoCita || ''}"`,
    `"${t.fechaHora}"`,
    `"${t.barberoNombre || 'Caja'}"`,
    `"${t.sillon || 'Mostrador / Sillón'}"`,
    `"${t.clienteNombre || 'Cliente Mostrador'}"`,
    `"${t.descripcionPrincipal || t.servicioNombre}"`,
    `"${t.origen}"`,
    `"${t.metodoPago}"`,
    t.monto ?? t.precio ?? 0,
    `"${t.estado}"`,
    t.comisionCalculadaCop ?? t.comisionEstimada ?? 0,
    `"${t.motivoAnulacion ? t.motivoAnulacion.replace(/"/g, '""') : ''}"`
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
