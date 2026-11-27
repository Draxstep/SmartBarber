/**
 * SmartBarber - Módulo de Liquidación Referencial de Comisiones
 * Fiel a docs/stitch/smartbarber_liquidaci_n_referencial_de_comisiones
 * Conexión completa con cortesService y barberosService, cálculo sobre cortes activos,
 * exclusión estricta de anulados, KPIs consolidados y exportación CSV descargable (CU-013).
 */

import { cortesService, barberosService, authService } from '../../services/index.js';
import { formatCOP, getTodayBogota } from '../../utils/formatters.js';
import { Capabilities, can, whenCan } from '../../utils/access-control.js';

let cachedLiquidacion = null;
let cachedBarberos = [];
let selectedBarberoFilter = 'all';
let selectedPeriodo = 'semana'; // 'hoy' | '7dias' | 'semana' | 'quincena' | 'mes'

function computePeriodoRange(periodo = 'semana') {
  const todayStr = getTodayBogota();
  const baseDate = new Date(`${todayStr}T12:00:00`);
  const startDate = new Date(baseDate);

  if (periodo === 'hoy') {
    // mismo día
  } else if (periodo === '7dias') {
    startDate.setDate(baseDate.getDate() - 6);
  } else if (periodo === 'quincena') {
    startDate.setDate(baseDate.getDate() - 14);
  } else if (periodo === 'mes') {
    startDate.setDate(1);
  } else {
    // 'semana': lunes de la semana calendario actual
    const day = baseDate.getDay();
    const diffToMonday = day === 0 ? 6 : day - 1;
    startDate.setDate(baseDate.getDate() - diffToMonday);
  }

  const fechaInicio = startDate.toISOString().split('T')[0];
  const fechaFin = todayStr;

  const fmtOpts = { day: 'numeric', month: 'short' };
  const label = fechaInicio === fechaFin
    ? `Hoy · ${baseDate.toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' })}`
    : `${startDate.toLocaleDateString('es-CO', fmtOpts)} – ${baseDate.toLocaleDateString('es-CO', { ...fmtOpts, year: 'numeric' })}`;

  return { fechaInicio, fechaFin, label };
}

export async function loadComisionesData() {
  const user = authService.getCurrentUser() || {};
  const canFilterBarbers = can(Capabilities.BARBERS_FILTER, user);
  const { fechaInicio, fechaFin } = computePeriodoRange(selectedPeriodo);
  const barberoParam = canFilterBarbers ? selectedBarberoFilter : (user.barberoId || 'all');

  const [liqRes, barbRes, histRes] = await Promise.all([
    cortesService.getLiquidacionComisiones({
      barberoId: barberoParam,
      fechaInicio,
      fechaFin
    }),
    canFilterBarbers ? barberosService.getBarberos() : Promise.resolve({ ok: true, data: [] }),
    cortesService.getHistorialCortes({
      barberoId: barberoParam,
      fechaInicio,
      fechaFin,
      estado: 'activo'
    }).catch(() => ({ ok: false, data: [] }))
  ]);

  if (liqRes?.ok && liqRes.data) {
    cachedLiquidacion = {
      ...liqRes.data,
      cortesDetalle: histRes?.ok && Array.isArray(histRes.data) ? histRes.data.filter(c => c.estado === 'activo') : []
    };
  }
  if (canFilterBarbers && barbRes?.ok) {
    cachedBarberos = barbRes.data;
  }
}

export function renderComisionesPage() {
  const user = authService.getCurrentUser() || {};
  const canViewAll = can(Capabilities.COMMISSIONS_VIEW_ALL, user);
  const canFilterBarbers = can(Capabilities.BARBERS_FILTER, user);
  const canViewMargin = can(Capabilities.COMMISSIONS_VIEW_MARGIN, user);
  const isBarbero = !canViewAll;
  const { fechaInicio, fechaFin, label: periodoLabel } = computePeriodoRange(selectedPeriodo);

  const data = cachedLiquidacion || {
    totalCortes: 0,
    totalRecaudado: 0,
    comisionTotal: 0,
    barberos: [],
    cortesDetalle: []
  };

  const totalFacturado = data.totalRecaudado || 0;
  const totalComisiones = data.comisionTotal || 0;
  const margenSede = Math.max(0, totalFacturado - totalComisiones);
  const avgCommissionPct = totalFacturado > 0
    ? ((totalComisiones / totalFacturado) * 100).toFixed(1).replace(/\.0$/, '')
    : (data.barberos?.[0]?.porcentajeComision || 50);

  return `
    <div class="flex flex-col gap-6 w-full animate-fadeIn">
      <!-- TAG DISTINTIVO -->
      <section class="flex justify-start sm:justify-end">
        <div class="inline-flex items-center gap-1.5 px-3 py-1 bg-[#E8DFCE] text-[#4F4A42] rounded text-xs w-fit">
          <span class="material-symbols-outlined text-[15px] text-[#6B645A]">balance</span>
          <span>Liquidación Referencial · No constituye nómina electrónica DIAN</span>
        </div>
      </section>

      <!-- CABECERA PRINCIPAL CON ESTILO EDITORIAL -->
      <section class="flex flex-col lg:flex-row lg:items-end justify-between gap-4 pb-1">
        <div class="space-y-1">
          <div class="flex items-center gap-2.5">
            <span class="text-[#8B1E1E] font-mono text-xs font-bold uppercase tracking-wider">LIQ-${fechaInicio.replace(/-/g, '')}</span>
            <span class="w-1.5 h-1.5 rounded-full bg-[#8C8272]"></span>
            <span class="text-[#6B645A] text-xs capitalize">${periodoLabel}</span>
          </div>
          <h1 class="font-serif text-2xl sm:text-3xl font-bold text-[#1C1C1C] tracking-tight">
            ${isBarbero ? 'Mis Comisiones Devengadas' : 'Liquidación de Comisiones'}
          </h1>
        </div>

        <!-- Botones de Acción -->
        <div class="flex items-center gap-2.5 flex-wrap sm:flex-nowrap">
          <button
            type="button"
            id="btn-export-comisiones-csv"
            class="min-h-[44px] px-4 rounded-lg bg-transparent text-[#1F3A5F] border-2 border-[#1F3A5F] font-sans font-semibold text-xs flex items-center gap-2 hover:bg-[#E4ECF5] transition-colors shadow-xs"
          >
            <span class="material-symbols-outlined text-[18px]">download</span>
            <span>${canViewAll ? 'Exportar Liquidación (CSV)' : 'Exportar Mi Resumen (CSV)'}</span>
          </button>
          ${whenCan(Capabilities.COMMISSIONS_REPORT_PRINT, () => `
            <button
              type="button"
              onclick="window.print()"
              class="min-h-[44px] px-4 rounded-lg bg-white border border-[#D5CBB8] text-[#1C1C1C] font-sans font-semibold text-xs flex items-center gap-2 hover:bg-[#FAF3E5] transition-colors shadow-xs"
            >
              <span class="material-symbols-outlined text-[18px]">print</span>
              <span>Imprimir Reporte</span>
            </button>
          `, '', user)}
        </div>
      </section>

      <!-- FILTROS Y REGLAS DE AUDITORÍA -->
      <section class="bg-[#FAF7F2] border border-[#D5CBB8] rounded-xl p-4 shadow-xs flex flex-col gap-4">
        <div class="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
          <!-- Selector de Periodo y Chips -->
          <div class="flex flex-col sm:flex-row sm:items-center gap-3">
            <div class="flex items-center gap-2 bg-white border border-[#8C8272] px-3 py-2 rounded-lg text-xs">
              <span class="material-symbols-outlined text-[#6B645A] text-[18px]">calendar_today</span>
              <span class="font-semibold text-[#1C1C1C] capitalize">${periodoLabel}</span>
            </div>

            <!-- Atajos tipo chip -->
            <div class="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0" role="group">
              <button
                type="button"
                data-periodo="hoy"
                class="periodo-chip px-3 py-1.5 text-xs font-semibold rounded ${selectedPeriodo === 'hoy' ? 'bg-[#1F3A5F] text-white shadow-xs' : 'bg-white text-[#4F4A42] border border-[#D5CBB8] hover:bg-[#FAF3E5]'}"
              >Hoy</button>
              <button
                type="button"
                data-periodo="7dias"
                class="periodo-chip px-3 py-1.5 text-xs font-semibold rounded ${selectedPeriodo === '7dias' ? 'bg-[#1F3A5F] text-white shadow-xs' : 'bg-white text-[#4F4A42] border border-[#D5CBB8] hover:bg-[#FAF3E5]'}"
              >Últimos 7 días</button>
              <button
                type="button"
                data-periodo="semana"
                class="periodo-chip px-3 py-1.5 text-xs font-semibold rounded ${selectedPeriodo === 'semana' ? 'bg-[#1F3A5F] text-white shadow-xs' : 'bg-white text-[#4F4A42] border border-[#D5CBB8] hover:bg-[#FAF3E5]'}"
              >Esta semana</button>
              <button
                type="button"
                data-periodo="quincena"
                class="periodo-chip px-3 py-1.5 text-xs font-semibold rounded ${selectedPeriodo === 'quincena' ? 'bg-[#1F3A5F] text-white shadow-xs' : 'bg-white text-[#4F4A42] border border-[#D5CBB8] hover:bg-[#FAF3E5]'}"
              >Quincena</button>
              <button
                type="button"
                data-periodo="mes"
                class="periodo-chip px-3 py-1.5 text-xs font-semibold rounded ${selectedPeriodo === 'mes' ? 'bg-[#1F3A5F] text-white shadow-xs' : 'bg-white text-[#4F4A42] border border-[#D5CBB8] hover:bg-[#FAF3E5]'}"
              >Mes</button>
            </div>
          </div>

          ${canFilterBarbers ? `
          <!-- Selector de Barbero -->
          <div class="flex items-center gap-2.5">
            <label class="text-xs font-semibold text-[#4F4A42] whitespace-nowrap uppercase tracking-wider" for="select-barbero-comision">
              Filtrar Barbero:
            </label>
            <div class="relative min-w-[220px]">
              <select
                id="select-barbero-comision"
                class="w-full h-10 pl-3 pr-8 rounded-lg bg-white border border-[#8C8272] text-xs font-medium text-[#1C1C1C] appearance-none focus:outline-none focus:ring-2 focus:ring-[#1F3A5F] cursor-pointer"
              >
                <option value="all" ${selectedBarberoFilter === 'all' ? 'selected' : ''}>Todos los barberos</option>
                ${cachedBarberos.map(b => `
                  <option value="${b.id}" ${selectedBarberoFilter === b.id ? 'selected' : ''}>${b.nombre} (${b.sillon || 'Sillón'})</option>
                `).join('')}
              </select>
              <span class="material-symbols-outlined absolute right-2.5 top-2.5 text-[#6B645A] pointer-events-none text-[18px]">unfold_more</span>
            </div>
          </div>
          ` : ''}
        </div>

        <!-- Banner Informativo de Auditoría -->
        <div class="bg-[#E4ECF5] border-l-4 border-[#1F3A5F] p-3 rounded text-xs text-[#1F3A5F] flex items-start gap-2.5">
          <span class="material-symbols-outlined text-[18px] shrink-0 mt-0.5">info</span>
          <p class="leading-relaxed">
            <strong class="font-semibold">Regla de cálculo:</strong> Calculado únicamente sobre cortes en estado <strong>Activo</strong> usando el porcentaje de comisión histórico pactado. Los cortes anulados se encuentran 100% excluidos del arqueo y liquidación.
          </p>
        </div>
      </section>

      <!-- TARJETAS KPI -->
      <section aria-label="Métricas consolidadas de liquidación" class="grid grid-cols-1 ${canViewMargin ? 'md:grid-cols-3' : 'md:grid-cols-2'} gap-4">
        <!-- KPI 1 -->
        <div class="bg-[#FAF7F2] border border-[#D5CBB8] rounded-xl p-5 shadow-xs flex flex-col justify-between">
          <div class="flex items-center justify-between">
            <span class="font-sans text-[11px] font-bold text-[#6B645A] uppercase tracking-wider">${isBarbero ? 'TOTAL FACTURADO POR MÍ' : 'TOTAL FACTURADO SERVICIOS'}</span>
            <div class="w-8 h-8 rounded-lg bg-[#E8DFCE] flex items-center justify-center text-[#4F4A42]">
              <span class="material-symbols-outlined text-[18px]">receipt_long</span>
            </div>
          </div>
          <div class="mt-3">
            <div class="font-mono text-2xl font-bold text-[#1C1C1C] tabular-nums">
              ${formatCOP(totalFacturado)} <span class="text-xs font-normal text-[#6B645A]">COP</span>
            </div>
            <p class="mt-1 text-xs text-[#4F4A42]">
              Sobre <strong>${data.totalCortes} cortes activos</strong> auditados
            </p>
          </div>
        </div>

        <!-- KPI 2 -->
        <div class="bg-[#FAF7F2] border border-[#D5CBB8] rounded-xl p-5 shadow-xs flex flex-col justify-between">
          <div class="flex items-center justify-between">
            <span class="font-sans text-[11px] font-bold text-[#6B645A] uppercase tracking-wider">${isBarbero ? 'MI COMISIÓN A LIQUIDAR' : 'COMISIONES REFERENCIALES'}</span>
            <div class="w-8 h-8 rounded-lg bg-[#E4ECF5] flex items-center justify-center text-[#1F3A5F]">
              <span class="material-symbols-outlined text-[18px]">percent</span>
            </div>
          </div>
          <div class="mt-3">
            <div class="font-mono text-2xl font-bold text-[#1F3A5F] tabular-nums">
              ${formatCOP(totalComisiones)} <span class="text-xs font-normal text-[#6B645A]">COP</span>
            </div>
            <p class="mt-1 text-xs text-[#4F4A42]">
              ${isBarbero ? `Esquema aplicado: ${avgCommissionPct}% sobre tus servicios` : `Tasa efectiva promedio: ${avgCommissionPct}%`}
            </p>
          </div>
        </div>

        ${canViewMargin ? `
        <!-- KPI 3 (Exclusivo Administrador) -->
        <div class="bg-[#FAF7F2] border border-[#D5CBB8] rounded-xl p-5 shadow-xs flex flex-col justify-between">
          <div class="flex items-center justify-between">
            <span class="font-sans text-[11px] font-bold text-[#6B645A] uppercase tracking-wider">MARGEN BRUTO SEDE</span>
            <div class="w-8 h-8 rounded-lg bg-[#E3EFE7] flex items-center justify-center text-[#235D3A]">
              <span class="material-symbols-outlined text-[18px]">account_balance</span>
            </div>
          </div>
          <div class="mt-3">
            <div class="font-mono text-2xl font-bold text-[#235D3A] tabular-nums">
              ${formatCOP(margenSede)} <span class="text-xs font-normal text-[#6B645A]">COP</span>
            </div>
            <p class="mt-1 text-xs text-[#4F4A42]">
              Fondo operativo y costos fijos de sede
            </p>
          </div>
        </div>
        ` : ''}
      </section>

      ${canViewAll ? `
      <!-- TABLA RESUMEN POR BARBERO (Solo Administrador) -->
      <section class="bg-[#FAF7F2] border border-[#D5CBB8] rounded-xl shadow-xs overflow-hidden flex flex-col">
        <div class="p-4 bg-[#E8DFCE]/60 border-b border-[#D5CBB8] flex items-center justify-between">
          <h2 class="font-serif text-base font-bold text-[#1C1C1C]">Consolidado por Barbero</h2>
          <span class="text-xs font-mono text-[#6B645A] capitalize">${periodoLabel}</span>
        </div>

        <div class="overflow-x-auto">
          <table class="w-full text-left border-collapse">
            <thead>
              <tr class="bg-[#E8DFCE] text-[#4F4A42] font-sans text-[11px] uppercase tracking-wider">
                <th class="py-3 px-4 font-semibold">Barbero</th>
                <th class="py-3 px-4 font-semibold">Sillón Asignado</th>
                <th class="py-3 px-4 font-semibold text-center">Cortes Atendidos</th>
                <th class="py-3 px-4 font-semibold text-right">Facturado Bruto</th>
                <th class="py-3 px-4 font-semibold text-center">% Comisión</th>
                <th class="py-3 px-4 font-semibold text-right">Comisión a Pagar</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-[#D5CBB8]/50 text-xs text-[#1C1C1C]">
              ${data.barberos.length === 0 ? `
                <tr>
                  <td colspan="6" class="py-8 text-center text-[#6B645A]">
                    No se registran cortes finalizados para el periodo seleccionado.
                  </td>
                </tr>
              ` : data.barberos.map(b => `
                <tr class="hover:bg-[#FAF3E5] transition-colors bg-white">
                  <td class="py-3 px-4">
                    <span class="font-sans font-bold text-xs text-[#1C1C1C]">${b.barberoNombre}</span>
                  </td>
                  <td class="py-3 px-4">
                    <span class="px-2 py-0.5 rounded bg-[#E4ECF5] text-[#1F3A5F] text-[11px] font-semibold">
                      ${b.sillon || 'Sillón'}
                    </span>
                  </td>
                  <td class="py-3 px-4 text-center font-mono font-semibold">
                    ${b.totalCortes}
                  </td>
                  <td class="py-3 px-4 text-right font-mono font-semibold tabular-nums">
                    ${formatCOP(b.totalRecaudado)}
                  </td>
                  <td class="py-3 px-4 text-center font-mono font-bold text-[#1F3A5F]">
                    ${b.porcentajeComision || 50}%
                  </td>
                  <td class="py-3 px-4 text-right font-mono font-bold text-[#1F3A5F] text-sm tabular-nums">
                    ${formatCOP(b.comisionTotal)}
                  </td>
                </tr>
              `).join('')}
            </tbody>
            <tfoot>
              <tr class="bg-[#E8DFCE] font-bold text-xs text-[#1C1C1C]">
                <td colspan="2" class="py-3 px-4 uppercase font-semibold">TOTAL CONSOLIDADO</td>
                <td class="py-3 px-4 text-center font-mono">${data.totalCortes}</td>
                <td class="py-3 px-4 text-right font-mono">${formatCOP(totalFacturado)}</td>
                <td class="py-3 px-4 text-center font-mono">${avgCommissionPct}%</td>
                <td class="py-3 px-4 text-right font-mono text-sm text-[#1F3A5F]">${formatCOP(totalComisiones)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </section>
      ` : ''}

      <!-- TABLA DE DETALLE AUDITABLE DE CORTES LIQUIDADOS -->
      <section class="bg-[#FAF7F2] border border-[#D5CBB8] rounded-xl shadow-xs overflow-hidden flex flex-col">
        <div class="p-4 bg-[#E8DFCE]/60 border-b border-[#D5CBB8] flex items-center justify-between">
          <h2 class="font-serif text-base font-bold text-[#1C1C1C]">${isBarbero ? 'Detalle de Mis Cortes Liquidados' : 'Detalle de Cortes Liquidados'}</h2>
          <span class="text-xs text-[#6B645A]">Solo registros activos en periodo</span>
        </div>

        <div class="overflow-x-auto">
          <table class="w-full text-left border-collapse">
            <thead>
              <tr class="bg-[#E8DFCE] text-[#4F4A42] font-sans text-[11px] uppercase tracking-wider">
                <th class="py-3 px-4 font-semibold">ID / Hora</th>
                ${canViewAll ? `<th class="py-3 px-4 font-semibold">Barbero</th>` : ''}
                <th class="py-3 px-4 font-semibold">Servicio Prestado</th>
                <th class="py-3 px-4 font-semibold">Método Pago</th>
                <th class="py-3 px-4 font-semibold text-right">Valor Corte</th>
                <th class="py-3 px-4 font-semibold text-right">Comisión Aplicada</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-[#D5CBB8]/50 text-xs text-[#1C1C1C]">
              ${data.cortesDetalle.length === 0 ? `
                <tr>
                  <td colspan="${canViewAll ? 6 : 5}" class="py-8 text-center text-[#6B645A]">
                    No se registran cortes liquidados en el periodo seleccionado.
                  </td>
                </tr>
              ` : data.cortesDetalle.map(c => `
                <tr class="hover:bg-[#FAF3E5] transition-colors bg-white">
                  <td class="py-3 px-4">
                    <span class="font-mono text-xs font-bold text-[#1F3A5F]">${c.codigoCita || 'CORTE'}</span>
                    <span class="block text-[11px] text-[#6B645A]">${c.horaFormato || ''}</span>
                  </td>
                  ${canViewAll ? `<td class="py-3 px-4 font-semibold">${c.barberoNombre}</td>` : ''}
                  <td class="py-3 px-4">${c.servicioNombre}</td>
                  <td class="py-3 px-4 capitalize">
                    <span class="inline-flex items-center gap-1 text-[11px] bg-[#E8DFCE]/70 px-2 py-0.5 rounded">
                      ${String(c.metodoPago || '').replace('_', ' ')}
                    </span>
                  </td>
                  <td class="py-3 px-4 text-right font-mono font-semibold">${formatCOP(c.precio)}</td>
                  <td class="py-3 px-4 text-right font-mono font-bold text-[#1F3A5F]">${formatCOP(c.comisionCalculadaCop ?? c.comisionEstimada ?? 0)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  `;
}

export function attachComisionesListeners(onDataChange) {
  // 1. Selector de barbero
  const barberSelect = document.getElementById('select-barbero-comision');
  if (barberSelect) {
    barberSelect.addEventListener('change', async (e) => {
      selectedBarberoFilter = e.target.value;
      await loadComisionesData();
      if (typeof onDataChange === 'function') onDataChange();
    });
  }

  // 2. Chips de periodo
  const periodoChips = document.querySelectorAll('.periodo-chip');
  periodoChips.forEach(chip => {
    chip.addEventListener('click', async () => {
      selectedPeriodo = chip.getAttribute('data-periodo') || 'semana';
      await loadComisionesData();
      if (typeof onDataChange === 'function') onDataChange();
    });
  });

  // 3. Exportar CSV (CU-013)
  const exportBtn = document.getElementById('btn-export-comisiones-csv');
  if (exportBtn) {
    exportBtn.addEventListener('click', () => {
      exportarComisionesCSV(cachedLiquidacion);
    });
  }
}

function exportarComisionesCSV(liqData) {
  if (!liqData) return;
  const { fechaInicio, fechaFin } = computePeriodoRange(selectedPeriodo);
  const headers = ['Barbero', 'Sillon', 'Total_Cortes', 'Facturado_Bruto_COP', 'Porcentaje_Comision', 'Comision_Total_COP'];
  
  const rows = (liqData.barberos || []).map(b => [
    `"${b.barberoNombre}"`,
    `"${b.sillon || 'Sillón'}"`,
    b.totalCortes,
    b.totalRecaudado,
    b.porcentajeComision || 50,
    b.comisionTotal
  ]);

  const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `liquidacion_comisiones_smartbarber_${fechaInicio}_a_${fechaFin}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
