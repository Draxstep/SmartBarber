/**
 * SmartBarber - Dashboard Ejecutivo del Negocio (Solo Administrador)
 * Conforme a DESIGN.md: WCAG 2.1 AA, JetBrains Mono para cifras COP (tabular-nums),
 * KPIs en tiempo real de facturación, comisiones, margen de sede, citas y stock.
 */

import { cortesService } from '../../services/index.js';
import { formatCOP, formatDateBogota, formatPlural } from '../../utils/formatters.js';
import { renderKpiCard } from '../../components/kpi-card.js';

let cachedDashboard = null;

export async function loadDashboardData() {
  try {
    const res = await cortesService.getDashboardKpis();
    if (res?.ok && res.data) {
      cachedDashboard = res.data;
    }
  } catch (err) {
    console.warn('⚠️ No se pudieron cargar KPIs del dashboard:', err.message);
  }
}

export function renderDashboardPage() {
  const d = cachedDashboard || {
    fecha: new Date().toISOString().slice(0, 10),
    ingresosHoyCop: 0,
    ingresosServiciosCop: 0,
    ingresosProductosCop: 0,
    totalVentasProductos: 0,
    comisionesHoyCop: 0,
    margenNetoSedeCop: 0,
    cortesTotalHoy: 0,
    citas: { total: 0, completadas: 0, porAtender: 0, noAsistio: 0, canceladas: 0 },
    alertasInventario: { total: 0, bajo: 0, agotado: 0 },
    rendimientoBarberos: []
  };

  const fechaFormat = formatDateBogota(`${d.fecha}T12:00:00`, {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const ingresosServ = Number(d.ingresosServiciosCop ?? d.ingresosHoyCop ?? 0);
  const ingresosProd = Number(d.ingresosProductosCop ?? 0);
  const ingresosCajaTotal = Number(d.ingresosHoyCop ?? (ingresosServ + ingresosProd));
  const citasCompletadasLabel = d.citas.completadas === 1 ? '1 finalizada' : `${d.citas.completadas} finalizadas`;

  return `
    <div class="flex flex-col gap-6 w-full animate-fadeIn">
      <!-- HEADER PRINCIPAL -->
      <section class="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div class="flex items-center gap-2">
            <span class="font-sans text-xs uppercase tracking-widest text-[#57534E] font-semibold">Panel de Control Ejecutivo</span>
            <span class="text-[#8C8272] text-xs">•</span>
            <span class="font-sans text-xs text-[#235D3A] font-semibold flex items-center gap-1">
              <span class="w-2 h-2 rounded-full bg-[#235D3A] animate-pulse"></span> En Vivo
            </span>
          </div>
          <h1 class="font-serif text-2xl sm:text-3xl font-bold text-[#1C1C1C] tracking-tight mt-0.5">
            Dashboard del Negocio
          </h1>
        </div>

        <div class="flex items-center gap-3">
          <div class="flex items-center gap-2 bg-[#FAF7F2] border border-[#D5CBB8] px-3.5 py-2 rounded-lg text-xs font-mono font-medium text-[#1C1C1C] shadow-2xs">
            <span class="material-symbols-outlined text-[16px] text-[#57534E]" aria-hidden="true">calendar_today</span>
            <span>${fechaFormat}</span>
          </div>
          <button
            type="button"
            id="btn-refresh-dashboard"
            class="min-h-[44px] px-3.5 py-1.5 rounded-lg bg-[#FAF7F2] border border-[#D5CBB8] hover:bg-[#E8DFCE] text-[#1C1C1C] text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            <span class="material-symbols-outlined text-[18px]" aria-hidden="true">refresh</span>
            <span>Actualizar</span>
          </button>
        </div>
      </section>

      <!-- TARJETAS DE KPIS PRINCIPALES (5 KPIS) -->
      <section aria-label="Indicadores ejecutivos" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        ${renderKpiCard({
          label: 'Ingresos Caja Hoy',
          value: formatCOP(ingresosCajaTotal),
          caption: `Servicios: ${formatCOP(ingresosServ)} · Productos: ${formatCOP(ingresosProd)}`,
          icon: 'payments',
          iconBg: 'bg-[#E3EFE7]',
          iconColor: 'text-[#235D3A]'
        })}

        ${renderKpiCard({
          label: 'Comisiones Hoy',
          value: formatCOP(d.comisionesHoyCop),
          caption: `Acumuladas sobre ${formatPlural(d.cortesTotalHoy, 'corte cobrado', 'cortes cobrados')}`,
          icon: 'percent',
          iconBg: 'bg-[#E4ECF5]',
          iconColor: 'text-[#1F3A5F]'
        })}

        ${renderKpiCard({
          label: 'Margen Neto Sede',
          value: formatCOP(d.margenNetoSedeCop),
          caption: 'Ingresos de caja menos comisiones',
          icon: 'savings',
          iconBg: 'bg-[#E3EFE7]',
          iconColor: 'text-[#235D3A]'
        })}

        ${renderKpiCard({
          label: 'Citas del Día',
          value: d.citas.total,
          caption: `${citasCompletadasLabel} · ${d.citas.porAtender} por atender`,
          icon: 'calendar_month',
          iconBg: 'bg-[#FAF7F2]',
          iconColor: 'text-[#1C1C1C]'
        })}

        ${renderKpiCard({
          label: 'Alertas Inventario',
          value: d.alertasInventario.total,
          caption: `${d.alertasInventario.bajo} stock bajo · ${formatPlural(d.alertasInventario.agotado, 'agotado', 'agotados')}`,
          icon: 'warning',
          iconBg: d.alertasInventario.total > 0 ? 'bg-[#FCE8E6]' : 'bg-[#FAF7F2]',
          iconColor: d.alertasInventario.total > 0 ? 'text-[#B3261E]' : 'text-[#57534E]',
          href: '#inventario',
          actionLabel: 'Ver inventario'
        })}
      </section>

      <!-- FILA DE ESTADÍSTICAS Y RENDIMIENTO -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        <!-- COLUMNA IZQUIERDA (1/3): DESGLOSE OPERATIVO DE CITAS -->
        <section class="bg-[#FAF7F2] border border-[#D5CBB8] rounded-xl p-5 shadow-xs flex flex-col gap-4">
          <div class="flex items-center justify-between pb-3 border-b border-[#D5CBB8]">
            <div class="flex items-center gap-2">
              <span class="material-symbols-outlined text-[20px] text-[#1F3A5F]">event_available</span>
              <h2 class="font-serif text-lg font-bold text-[#1C1C1C]">Estado de Citas Hoy</h2>
            </div>
            <a href="#agenda" class="text-xs font-semibold text-[#1F3A5F] hover:underline flex items-center gap-0.5">
              <span>Ir a Agenda</span>
              <span class="material-symbols-outlined text-[14px]">arrow_forward</span>
            </a>
          </div>

          <div class="flex flex-col gap-3">
            <div class="flex items-center justify-between p-3 rounded-lg bg-white border border-[#D5CBB8]">
              <div class="flex items-center gap-2.5">
                <span class="w-3 h-3 rounded-full bg-[#235D3A]"></span>
                <span class="text-xs font-semibold text-[#1C1C1C]">Completadas y Cobradas</span>
              </div>
              <span class="font-mono text-sm font-bold text-[#235D3A]">${d.citas.completadas}</span>
            </div>

            <div class="flex items-center justify-between p-3 rounded-lg bg-white border border-[#D5CBB8]">
              <div class="flex items-center gap-2.5">
                <span class="w-3 h-3 rounded-full bg-[#1F3A5F]"></span>
                <span class="text-xs font-semibold text-[#1C1C1C]">Por Atender (Confirmadas / Pendientes)</span>
              </div>
              <span class="font-mono text-sm font-bold text-[#1F3A5F]">${d.citas.porAtender}</span>
            </div>

            <div class="flex items-center justify-between p-3 rounded-lg bg-white border border-[#D5CBB8]">
              <div class="flex items-center gap-2.5">
                <span class="w-3 h-3 rounded-full bg-[#8A5300]"></span>
                <span class="text-xs font-semibold text-[#1C1C1C]">Inasistencias (No Asistió)</span>
              </div>
              <span class="font-mono text-sm font-bold text-[#8A5300]">${d.citas.noAsistio}</span>
            </div>

            <div class="flex items-center justify-between p-3 rounded-lg bg-white border border-[#D5CBB8]">
              <div class="flex items-center gap-2.5">
                <span class="w-3 h-3 rounded-full bg-[#B3261E]"></span>
                <span class="text-xs font-semibold text-[#1C1C1C]">Canceladas</span>
              </div>
              <span class="font-mono text-sm font-bold text-[#B3261E]">${d.citas.canceladas}</span>
            </div>
          </div>
        </section>

        <!-- COLUMNA DERECHA (2/3): RENDIMIENTO DEL EQUIPO DE BARBEROS -->
        <section class="lg:col-span-2 bg-[#FAF7F2] border border-[#D5CBB8] rounded-xl p-5 shadow-xs flex flex-col gap-4">
          <div class="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-[#D5CBB8]">
            <div class="flex items-center gap-2">
              <span class="material-symbols-outlined text-[20px] text-[#1F3A5F]">badge</span>
              <h2 class="font-serif text-lg font-bold text-[#1C1C1C]">Rendimiento del Equipo Hoy</h2>
            </div>
            <a href="#barberos" class="text-xs font-semibold text-[#1F3A5F] hover:underline flex items-center gap-0.5">
              <span>Gestionar Barberos</span>
              <span class="material-symbols-outlined text-[14px]">arrow_forward</span>
            </a>
          </div>

          <!-- TABLA RESPONSIVA DE RENDIMIENTO -->
          <div class="overflow-x-auto">
            <table class="w-full text-left text-xs border-collapse">
              <thead>
                <tr class="border-b border-[#D5CBB8] text-[#6B645A] uppercase tracking-wider font-semibold text-[11px]">
                  <th class="py-2.5 px-3">Barbero / Sillón</th>
                  <th class="py-2.5 px-3 text-center">Estado</th>
                  <th class="py-2.5 px-3 text-center">Comisión %</th>
                  <th class="py-2.5 px-3 text-center">Cortes</th>
                  <th class="py-2.5 px-3 text-right">Facturado (COP)</th>
                  <th class="py-2.5 px-3 text-right">Comisión Devengada</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-[#D5CBB8]/50">
                ${d.rendimientoBarberos.length === 0 ? `
                  <tr>
                    <td colspan="6" class="text-center py-8 text-[#6B645A] italic">
                      No hay datos registrados de barberos para la jornada de hoy.
                    </td>
                  </tr>
                ` : d.rendimientoBarberos.map(b => `
                  <tr class="hover:bg-[#FAF3E5] transition-colors">
                    <td class="py-3 px-3 font-semibold text-[#1C1C1C]">
                      <div class="flex flex-col">
                        <span>${b.nombre}</span>
                        <span class="text-[10px] text-[#6B645A] font-normal">${b.sillon}</span>
                      </div>
                    </td>
                    <td class="py-3 px-3 text-center">
                      ${b.activo ? `
                        <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#E3EFE7] text-[#235D3A] text-[10px] font-bold">
                          Activo
                        </span>
                      ` : `
                        <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#E8DFCE] text-[#6B645A] text-[10px] font-bold">
                          Inactivo
                        </span>
                      `}
                    </td>
                    <td class="py-3 px-3 text-center font-mono font-medium text-[#4F4A42]">
                      ${b.porcentajeComision || 50}%
                    </td>
                    <td class="py-3 px-3 text-center font-mono font-bold text-[#1C1C1C]">
                      ${b.cortesCount}
                    </td>
                    <td class="py-3 px-3 text-right font-mono font-bold text-[#1C1C1C] tabular-nums">
                      ${formatCOP(b.ingresosCop)}
                    </td>
                    <td class="py-3 px-3 text-right font-mono font-bold text-[#235D3A] tabular-nums">
                      ${formatCOP(b.comisionesCop)}
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  `;
}

export function attachDashboardListeners(refresh) {
  const btnRefresh = document.getElementById('btn-refresh-dashboard');
  if (btnRefresh) {
    btnRefresh.addEventListener('click', async () => {
      btnRefresh.disabled = true;
      await loadDashboardData();
      if (typeof refresh === 'function') refresh();
    });
  }
}
