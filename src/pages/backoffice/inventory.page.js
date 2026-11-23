/**
 * Backoffice Inventario & Venta de Productos Page
 * Catálogo reactivo, filtros por estado, modal de Venta al Público con los 5 métodos de pago de Colombia,
 * salidas por consumo en sillón (CU-018), modales administrativos de Entrada (CU-017), Alta de Producto (CU-016)
 * y Libro Mayor de Movimientos Kardex con exportación CSV (CU-019).
 * Adaptativo por rol (Administrador vs. Barbero) con estricto resguardo de confidencialidad comercial.
 */

import { backofficeStore } from './backoffice-state.js';
import { inventarioService } from '../../services/index.js';
import { formatCOP } from '../../utils/formatters.js';
import { renderStatusBadge } from '../../components/status-badge.js';
import { renderKpiCard } from '../../components/kpi-card.js';
import { openDialog } from '../../components/ui-dialog.js';

let cachedKardexMovements = [];

export async function loadInventoryKardexData(userRole = 'administrador') {
  try {
    const isBarbero = userRole === 'barbero';
    if (isBarbero) {
      // El barbero solo consulta productos activos disponibles (CU-018)
      const prodRes = await inventarioService.getProductos();
      if (prodRes?.ok && Array.isArray(prodRes.data)) {
        backofficeStore.products = prodRes.data;
      }
    } else {
      // El administrador consulta catálogo completo y movimientos Kardex
      const [kdxRes, prodRes] = await Promise.all([
        inventarioService.getMovimientosKardex().catch(() => ({ ok: false, data: [] })),
        inventarioService.getProductos().catch(() => ({ ok: false, data: [] }))
      ]);
      if (kdxRes?.ok && Array.isArray(kdxRes.data)) {
        cachedKardexMovements = kdxRes.data;
      }
      if (prodRes?.ok && Array.isArray(prodRes.data)) {
        backofficeStore.products = prodRes.data;
      }
    }
  } catch (err) {
    console.warn('⚠️ Error en carga de inventario/kardex, recurriendo a estado local:', err.message);
  }
}

export function renderInventoryPage(options = {}) {
  const userRole = (typeof options === 'string' ? options : options?.userRole) || 'administrador';
  const isBarbero = userRole === 'barbero';

  const products = backofficeStore.getFilteredProducts();
  const allProducts = backofficeStore.products;

  const totalValueCOP = allProducts.reduce((sum, p) => sum + ((p.stockActual || 0) * (p.precioVenta || 0)), 0);
  const optimalCount = allProducts.filter(p => (p.stockActual || 0) > (p.stockMinimo || 0)).length;
  const lowCount = allProducts.filter(p => (p.stockActual || 0) > 0 && (p.stockActual || 0) <= (p.stockMinimo || 0)).length;
  const outCount = allProducts.filter(p => (p.stockActual || 0) === 0).length;

  const currentFilter = backofficeStore.inventoryStatusFilter;

  return `
    <div class="flex flex-col gap-6 animate-fadeIn">
      <!-- HEADER CON ACCIONES SEGÚN ROL -->
      <header class="flex flex-col gap-2">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 class="font-serif text-2xl sm:text-3xl font-bold text-[#1C1C1C] tracking-tight">
              ${isBarbero ? 'Catálogo & Venta de Productos' : 'Inventario de Productos & Kardex'}
            </h1>
            ${isBarbero ? `
              <p class="font-sans text-xs text-[#4F4A42] mt-0.5">
                Venta directa en mostrador (ceras, geles, aceites) y registro de consumo en sillón.
              </p>
            ` : ''}
          </div>

          <div class="flex flex-wrap items-center gap-2">
            ${isBarbero ? `
              <!-- Acciones exclusivas del Barbero (CU-018) -->
              <button
                id="btn-inv-consumo"
                type="button"
                class="min-h-[44px] px-3.5 py-2 rounded-lg bg-[#FAF7F2] border border-[#D5CBB8] text-[#1C1C1C] font-semibold text-xs hover:border-[#1F3A5F] transition-colors flex items-center gap-1.5 active:scale-[0.98] shadow-2xs"
                title="Registrar insumo utilizado en atención de cabina"
              >
                <span class="material-symbols-outlined text-[18px] text-[#1F3A5F]">content_cut</span>
                <span>- Consumo Sillón</span>
              </button>

              <button
                id="btn-inv-salida"
                type="button"
                class="min-h-[44px] px-4 py-2 rounded-lg bg-[#235D3A] hover:bg-[#1a472c] text-white font-semibold text-xs shadow-sm transition-all flex items-center gap-2 active:scale-[0.98]"
                title="Registrar venta de cera, gel o producto a cliente"
              >
                <span class="material-symbols-outlined text-[20px]">point_of_sale</span>
                <span>+ Vender Producto</span>
              </button>
            ` : `
              <!-- Acciones completas del Administrador (CU-016 a CU-019) -->
              <button
                id="btn-inv-kardex"
                type="button"
                class="min-h-[40px] px-3.5 py-1.5 rounded-lg bg-[#E4ECF5] text-[#1F3A5F] border border-[#1F3A5F]/20 font-semibold text-xs hover:bg-[#d5e3ff] transition-colors flex items-center gap-1.5 active:scale-[0.98] shadow-xs"
              >
                <span class="material-symbols-outlined text-[18px]">receipt_long</span>
                <span>Historial Kardex</span>
              </button>
              <button
                id="btn-inv-entrada"
                type="button"
                class="min-h-[40px] px-3.5 py-1.5 rounded-lg bg-[#FAF7F2] border border-[#D5CBB8] text-[#1C1C1C] font-semibold text-xs hover:border-[#235D3A] transition-colors flex items-center gap-1.5 active:scale-[0.98] shadow-2xs"
              >
                <span class="material-symbols-outlined text-[18px] text-[#235D3A]">arrow_downward</span>
                <span>+ Entrada Stock</span>
              </button>
              <button
                id="btn-inv-salida"
                type="button"
                class="min-h-[40px] px-3.5 py-1.5 rounded-lg bg-[#FAF7F2] border border-[#D5CBB8] text-[#1C1C1C] font-semibold text-xs hover:border-[#8B1E1E] transition-colors flex items-center gap-1.5 active:scale-[0.98] shadow-2xs"
              >
                <span class="material-symbols-outlined text-[18px] text-[#8B1E1E]">arrow_upward</span>
                <span>- Salida / Venta</span>
              </button>
              <button
                id="btn-inv-nuevo"
                type="button"
                class="min-h-[40px] px-4 py-1.5 rounded-lg bg-[#1F3A5F] hover:bg-[#162B47] text-white font-semibold text-xs shadow-sm transition-all flex items-center gap-1.5 active:scale-[0.98]"
              >
                <span class="material-symbols-outlined text-[18px]">add</span>
                <span>+ Nuevo Producto</span>
              </button>
            `}
          </div>
        </div>

        <!-- Double-rule Heritage Line -->
        <div class="double-rule-divider w-full mt-2"></div>
      </header>

      <!-- 4 TARJETAS KPI -->
      <section aria-label="Resumen de inventario" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        ${renderKpiCard({
          label: isBarbero ? 'Productos Disponibles' : 'Total Referencias',
          value: allProducts.length,
          caption: isBarbero ? 'Catálogo activo para mostrador' : `Valoración: ${formatCOP(totalValueCOP)}`,
          icon: 'inventory_2',
          iconBg: 'bg-[#E4ECF5]',
          iconColor: 'text-[#1F3A5F]'
        })}

        ${renderKpiCard({
          label: 'En Nivel Óptimo',
          value: optimalCount,
          caption: 'Con stock suficiente para la jornada',
          icon: 'check_circle',
          iconBg: 'bg-[#E3EFE7]',
          iconColor: 'text-[#235D3A]'
        })}

        ${renderKpiCard({
          label: 'Alerta Stock Bajo',
          value: lowCount,
          caption: 'Próximos a agotar existencias',
          icon: 'warning',
          iconBg: 'bg-[#FDF1DC]',
          iconColor: 'text-[#8A5300]'
        })}

        ${renderKpiCard({
          label: 'Productos Agotados',
          value: outCount,
          caption: isBarbero ? 'No disponibles para venta' : 'Requieren reposición inmediata',
          icon: 'cancel',
          iconBg: 'bg-[#FCE8E6]',
          iconColor: 'text-[#B3261E]'
        })}
      </section>

      <!-- BARRA DE BÚSQUEDA Y FILTROS -->
      <section aria-label="Filtros de inventario" class="bg-[#FAF7F2] border border-[#D5CBB8] rounded-xl p-4 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div class="relative flex-1 max-w-md">
          <span class="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-[#6B645A]">search</span>
          <input
            id="inv-search-input"
            type="search"
            value="${backofficeStore.inventorySearchQuery}"
            placeholder="Buscar cera, gel, aceite o categoría..."
            class="w-full h-10 pl-9 pr-3 rounded-lg bg-white border border-[#8C8272] text-xs text-[#1C1C1C] placeholder-[#6B645A] focus:outline-none focus:ring-2 focus:ring-[#1F3A5F]"
          />
        </div>

        <div class="flex items-center gap-1.5 flex-wrap">
          <button
            type="button"
            data-inv-filter="all"
            class="inv-filter-btn px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${currentFilter === 'all' ? 'bg-[#1F3A5F] text-white shadow-2xs' : 'bg-white border border-[#D5CBB8] text-[#4F4A42] hover:bg-[#FAF3E5]'}"
          >
            Todos (${allProducts.length})
          </button>
          <button
            type="button"
            data-inv-filter="disponible"
            class="inv-filter-btn px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${currentFilter === 'disponible' ? 'bg-[#1F3A5F] text-white shadow-2xs' : 'bg-white border border-[#D5CBB8] text-[#4F4A42] hover:bg-[#FAF3E5]'}"
          >
            Óptimo (${optimalCount})
          </button>
          <button
            type="button"
            data-inv-filter="stock_bajo"
            class="inv-filter-btn px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${currentFilter === 'stock_bajo' ? 'bg-[#1F3A5F] text-white shadow-2xs' : 'bg-white border border-[#D5CBB8] text-[#4F4A42] hover:bg-[#FAF3E5]'}"
          >
            Stock Bajo (${lowCount})
          </button>
          <button
            type="button"
            data-inv-filter="agotado"
            class="inv-filter-btn px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${currentFilter === 'agotado' ? 'bg-[#1F3A5F] text-white shadow-2xs' : 'bg-white border border-[#D5CBB8] text-[#4F4A42] hover:bg-[#FAF3E5]'}"
          >
            Agotados (${outCount})
          </button>
        </div>
      </section>

      <!-- TABLA DE PRODUCTOS -->
      <section aria-label="Listado de productos" class="bg-[#FAF7F2] border border-[#D5CBB8] rounded-xl shadow-xs overflow-hidden flex flex-col">
        <div class="overflow-x-auto">
          <table class="w-full text-left border-collapse">
            <thead>
              <tr class="bg-[#E8DFCE] text-[#4F4A42] font-sans text-[11px] uppercase tracking-wider">
                <th class="py-3 px-4 font-semibold">SKU / Ref</th>
                <th class="py-3 px-4 font-semibold min-w-[220px]">Producto</th>
                <th class="py-3 px-4 font-semibold">Categoría</th>
                <th class="py-3 px-4 font-semibold text-center">Stock Disponible</th>
                ${!isBarbero ? `<th class="py-3 px-4 font-semibold text-center">Mínimo</th>` : ''}
                <th class="py-3 px-4 font-semibold text-right">Precio Venta (COP)</th>
                <th class="py-3 px-4 font-semibold text-center">Estado</th>
                <th class="py-3 px-4 font-semibold text-right min-w-[120px]">Acción</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-[#D5CBB8]/40 text-xs text-[#1C1C1C]">
              ${products.length === 0 ? `
                <tr>
                  <td colspan="${isBarbero ? 7 : 8}" class="py-12 text-center text-[#6B645A]">
                    <div class="flex flex-col items-center gap-2">
                      <span class="material-symbols-outlined text-[32px] text-[#8C8272]">inventory_2</span>
                      <p class="font-medium text-sm">No se encontraron productos con el filtro aplicado.</p>
                      <button id="btn-reset-inv-filter" type="button" class="text-xs font-semibold text-[#1F3A5F] hover:underline">
                        Limpiar búsqueda y filtros
                      </button>
                    </div>
                  </td>
                </tr>
              ` : products.map(p => {
                const stock = p.stockActual ?? 0;
                const min = p.stockMinimo ?? 0;
                let statusBadge;
                if (stock === 0) {
                  statusBadge = renderStatusBadge('agotado', { customLabel: 'Agotado', size: 'sm' });
                } else if (stock <= min) {
                  statusBadge = renderStatusBadge('stock_bajo', { customLabel: 'Bajo', size: 'sm' });
                } else {
                  statusBadge = renderStatusBadge('disponible', { customLabel: 'Óptimo', size: 'sm' });
                }

                return `
                  <tr class="hover:bg-[#FAF3E5] transition-colors bg-white">
                    <td class="py-3 px-4 font-mono font-bold text-xs text-[#1F3A5F]">
                      ${p.sku}
                    </td>
                    <td class="py-3 px-4">
                      <div class="font-sans font-bold text-xs text-[#1C1C1C]">${p.nombre}</div>
                      ${!isBarbero ? `
                        <div class="text-[10px] text-[#6B645A] font-mono mt-0.5">Costo: ${formatCOP(p.costoUnitario || 0)}</div>
                      ` : ''}
                    </td>
                    <td class="py-3 px-4 text-[#4F4A42]">
                      <span class="bg-[#E8DFCE]/50 px-2 py-0.5 rounded text-[11px] font-medium border border-[#D5CBB8]/40">
                        ${p.categoria}
                      </span>
                    </td>
                    <td class="py-3 px-4 text-center font-mono font-bold text-sm ${stock === 0 ? 'text-[#B3261E]' : stock <= min ? 'text-[#8A5300]' : 'text-[#1C1C1C]'}">
                      ${stock}
                    </td>
                    ${!isBarbero ? `
                      <td class="py-3 px-4 text-center font-mono text-xs text-[#6B645A]">
                        ${min}
                      </td>
                    ` : ''}
                    <td class="py-3 px-4 text-right font-mono font-bold text-xs text-[#1C1C1C] tabular-nums">
                      ${formatCOP(p.precioVenta)}
                    </td>
                    <td class="py-3 px-4 text-center">
                      ${statusBadge}
                    </td>
                    <td class="py-3 px-4 text-right">
                      ${isBarbero ? `
                        ${stock > 0 ? `
                          <button
                            type="button"
                            data-quick-sell="${p.sku}"
                            class="min-h-[36px] px-3 py-1 rounded-md bg-[#235D3A] hover:bg-[#1a472c] text-white font-semibold text-xs transition-all inline-flex items-center gap-1 active:scale-95 shadow-xs"
                            title="Vender ${p.nombre}"
                          >
                            <span class="material-symbols-outlined text-[15px]">point_of_sale</span>
                            <span>Vender</span>
                          </button>
                        ` : `
                          <span class="text-[11px] text-[#B3261E] font-medium font-sans">Agotado</span>
                        `}
                      ` : `
                        <div class="inline-flex items-center justify-end gap-1">
                          <button
                            type="button"
                            data-quick-entry="${p.sku}"
                            class="p-1 rounded text-[#235D3A] hover:bg-[#E3EFE7] transition-colors"
                            title="Entrada de reposición"
                          >
                            <span class="material-symbols-outlined text-[18px]">add_circle</span>
                          </button>
                          <button
                            type="button"
                            data-quick-exit="${p.sku}"
                            class="p-1 rounded text-[#8B1E1E] hover:bg-[#FCE8E6] transition-colors"
                            title="Descontar stock / Venta"
                          >
                            <span class="material-symbols-outlined text-[18px]">remove_circle</span>
                          </button>
                        </div>
                      `}
                    </td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>

        <div class="bg-[#E8DFCE] px-4 py-3 flex items-center justify-between text-xs text-[#4F4A42]">
          <span>Mostrando <strong>${products.length}</strong> de <strong>${allProducts.length}</strong> referencias registradas</span>
          ${!isBarbero ? `<span class="font-mono text-[11px] text-[#6B645A]">Valoración total: ${formatCOP(totalValueCOP)}</span>` : ''}
        </div>
      </section>
    </div>

    ${!isBarbero ? `
      <!-- ========================================== -->
      <!-- MODAL: LIBRO MAYOR KARDEX (ADMIN ONLY)     -->
      <!-- ========================================== -->
      <dialog
        id="dialog-kardex-ledger"
        class="p-0 rounded-2xl bg-[#FAF7F2] border border-[#D5CBB8] shadow-2xl backdrop:bg-black/50 max-w-4xl w-full mx-auto my-auto"
      >
        <div class="p-6 flex flex-col gap-5">
          <!-- Header -->
          <div class="flex items-start justify-between pb-3 border-b border-[#D5CBB8]">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-lg bg-[#1F3A5F] text-white flex items-center justify-center">
                <span class="material-symbols-outlined text-[22px]">receipt_long</span>
              </div>
              <div>
                <h2 class="font-serif text-xl font-bold text-[#1C1C1C]">Historial de Movimientos (Kardex)</h2>
              </div>
            </div>
            <button type="button" id="btn-close-kardex-modal" class="text-[#6B645A] hover:text-[#1C1C1C] p-1">
              <span class="material-symbols-outlined text-[22px]">close</span>
            </button>
          </div>

          <!-- Tabla de Movimientos Kardex -->
          <div class="overflow-x-auto bg-white border border-[#D5CBB8] rounded-lg max-h-80 overflow-y-auto">
            <table class="w-full text-left border-collapse text-xs">
              <thead class="sticky top-0 bg-[#E8DFCE] text-[#4F4A42] text-[11px] uppercase tracking-wider font-semibold">
                <tr>
                  <th class="py-2.5 px-3">ID / Fecha</th>
                  <th class="py-2.5 px-3">Producto / SKU</th>
                  <th class="py-2.5 px-3">Tipo & Subtipo</th>
                  <th class="py-2.5 px-3 text-center">Cant.</th>
                  <th class="py-2.5 px-3 text-center">Balance Stock</th>
                  <th class="py-2.5 px-3">Referencia / Factura</th>
                  <th class="py-2.5 px-3">Responsable</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-[#D5CBB8]/50 text-xs">
                ${cachedKardexMovements.length === 0 ? `
                  <tr>
                    <td colspan="7" class="py-8 text-center text-[#6B645A]">
                      No hay movimientos registrados en el Kardex.
                    </td>
                  </tr>
                ` : cachedKardexMovements.map(k => `
                  <tr class="hover:bg-[#FAF3E5] transition-colors">
                    <td class="py-2.5 px-3">
                      <span class="font-mono font-bold text-[#1F3A5F]">${k.id}</span>
                      <span class="block text-[10px] text-[#6B645A]">${k.fechaFormato || ''}</span>
                    </td>
                    <td class="py-2.5 px-3">
                      <span class="font-semibold text-[#1C1C1C]">${k.productoNombre}</span>
                      <span class="block text-[10px] font-mono text-[#6B645A]">${k.sku}</span>
                    </td>
                    <td class="py-2.5 px-3">
                      ${k.tipo === 'entrada' ? `
                        <span class="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded bg-[#E3EFE7] text-[#235D3A] font-semibold">
                          <span class="material-symbols-outlined text-[13px]">arrow_circle_up</span>
                          <span>${k.subtipoLabel || 'Entrada'}</span>
                        </span>
                      ` : `
                        <span class="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded bg-[#FCE8E6] text-[#B3261E] font-semibold">
                          <span class="material-symbols-outlined text-[13px]">arrow_circle_down</span>
                          <span>${k.subtipoLabel || 'Salida'}</span>
                        </span>
                      `}
                    </td>
                    <td class="py-2.5 px-3 text-center font-mono font-bold ${k.tipo === 'entrada' ? 'text-[#235D3A]' : 'text-[#B3261E]'}">
                      ${k.tipo === 'entrada' ? `+${k.cantidad}` : `-${k.cantidad}`}
                    </td>
                    <td class="py-2.5 px-3 text-center font-mono">
                      <span class="text-[#6B645A]">${k.stockPrevio}</span>
                      <span class="text-[#1C1C1C] mx-1">&rarr;</span>
                      <strong class="text-[#1C1C1C]">${k.stockNuevo}</strong>
                    </td>
                    <td class="py-2.5 px-3 font-mono text-[11px] text-[#4F4A42]">
                      ${k.referencia || 'Operación directa'}
                    </td>
                    <td class="py-2.5 px-3 text-[11px] text-[#6B645A]">
                      ${k.responsable || 'Carlos Mendoza'}
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>

          <!-- Footer Modal -->
          <div class="flex items-center justify-between pt-2 border-t border-[#D5CBB8]">
            <button
              type="button"
              id="btn-export-kardex-csv"
              class="min-h-[44px] inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white border border-[#8C8272] text-xs font-semibold text-[#1F3A5F] hover:bg-[#FAF3E5] transition-colors"
            >
              <span class="material-symbols-outlined text-[18px]">download</span>
              <span>Descargar Kardex CSV</span>
            </button>

            <button
              type="button"
              id="btn-cerrar-kardex"
              class="min-h-[44px] px-5 py-2 rounded-lg bg-[#1F3A5F] text-white text-xs font-semibold hover:bg-[#162B47] transition-colors"
            >
              Cerrar Libro
            </button>
          </div>
        </div>
      </dialog>
    ` : ''}
  `;
}

export function attachInventoryListeners(onUpdate, userRole = 'administrador') {
  const isBarbero = userRole === 'barbero';

  // Búsqueda reactiva
  const searchInput = document.getElementById('inv-search-input');
  if (searchInput) {
    let timeout;
    searchInput.addEventListener('input', (e) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        backofficeStore.inventorySearchQuery = e.target.value.trim();
        onUpdate();
      }, 250);
    });
  }

  // Filtros de estado (Pills)
  const filterBtns = document.querySelectorAll('.inv-filter-btn');
  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const filter = btn.getAttribute('data-inv-filter');
      backofficeStore.inventoryStatusFilter = filter;
      onUpdate();
    });
  });

  // Botón Salida / Venta Stock (Disponible para Barbero y Admin)
  const btnSalida = document.getElementById('btn-inv-salida');
  if (btnSalida) {
    btnSalida.addEventListener('click', () => openStockExitModal(onUpdate, '', 'venta_publico', userRole));
  }

  // Botón Consumo en Sillón (Exclusivo Barbero)
  const btnConsumo = document.getElementById('btn-inv-consumo');
  if (btnConsumo) {
    btnConsumo.addEventListener('click', () => openStockExitModal(onUpdate, '', 'consumo_interno', userRole));
  }

  // Venta rápida desde la fila de tabla (Barbero)
  const sellBtns = document.querySelectorAll('button[data-quick-sell]');
  sellBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const sku = btn.getAttribute('data-quick-sell');
      openStockExitModal(onUpdate, sku, 'venta_publico', userRole);
    });
  });

  // Acciones exclusivas del Administrador
  if (!isBarbero) {
    const btnEntrada = document.getElementById('btn-inv-entrada');
    if (btnEntrada) {
      btnEntrada.addEventListener('click', () => openStockEntryModal(onUpdate));
    }

    const btnNuevo = document.getElementById('btn-inv-nuevo');
    if (btnNuevo) {
      btnNuevo.addEventListener('click', () => openNuevoProductoModal(onUpdate));
    }

    const btnKardex = document.getElementById('btn-inv-kardex');
    const dialogKardex = document.getElementById('dialog-kardex-ledger');
    const closeKardexX = document.getElementById('btn-close-kardex-modal');
    const closeKardexBtn = document.getElementById('btn-cerrar-kardex');
    const exportKardexBtn = document.getElementById('btn-export-kardex-csv');

    if (btnKardex && dialogKardex) {
      btnKardex.addEventListener('click', async () => {
        await loadInventoryKardexData('administrador');
        dialogKardex.showModal();
      });
    }

    const closeKardexModal = () => {
      if (dialogKardex) dialogKardex.close();
    };
    if (closeKardexX) closeKardexX.addEventListener('click', closeKardexModal);
    if (closeKardexBtn) closeKardexBtn.addEventListener('click', closeKardexModal);

    if (exportKardexBtn) {
      exportKardexBtn.addEventListener('click', () => {
        exportarKardexCSV(cachedKardexMovements);
      });
    }

    const entryBtns = document.querySelectorAll('button[data-quick-entry]');
    entryBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const sku = btn.getAttribute('data-quick-entry');
        openStockEntryModal(onUpdate, sku);
      });
    });

    const exitBtns = document.querySelectorAll('button[data-quick-exit]');
    exitBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const sku = btn.getAttribute('data-quick-exit');
        openStockExitModal(onUpdate, sku, 'venta_publico', userRole);
      });
    });
  }

  // Restablecer filtros desde estado vacío
  const btnReset = document.getElementById('btn-reset-inv-filter');
  if (btnReset) {
    btnReset.addEventListener('click', () => {
      backofficeStore.inventorySearchQuery = '';
      backofficeStore.inventoryStatusFilter = 'all';
      onUpdate();
    });
  }
}

/**
 * Modal accesible de Venta de Producto y Salida de Stock (CU-018)
 * Cumple con validación de no-stock negativo (RN-10) y los 5 métodos de pago de Colombia.
 */
function openStockExitModal(onUpdate, defaultSku = '', defaultReason = 'venta_publico', userRole = 'administrador') {
  const products = backofficeStore.products.filter(p => (p.stockActual || 0) > 0);
  const isBarbero = userRole === 'barbero';

  if (products.length === 0) {
    openDialog({
      title: 'Inventario sin existencias',
      description: 'Actualmente no hay productos con existencias disponibles en el inventario para registrar salidas o ventas.',
      confirmLabel: 'Entendido',
      isAlertOnly: true
    });
    return;
  }

  const selectedInitialSku = defaultSku || products[0]?.sku || '';
  const initialProduct = products.find(p => p.sku === selectedInitialSku) || products[0];

  openDialog({
    title: isBarbero ? 'Venta de Producto en Mostrador / Sillón' : 'Registrar Salida de Inventario (CU-018)',
    contentHtml: `
      <form id="form-stock-exit" class="flex flex-col gap-4 text-xs">
        <div class="flex flex-col gap-1.5">
          <label for="exit-sku" class="font-sans font-semibold text-[#1C1C1C]">Producto</label>
          <select id="exit-sku" class="h-10 px-3 rounded-lg bg-white border border-[#8C8272] text-xs font-semibold text-[#1C1C1C]">
            ${products.map(p => `
              <option value="${p.sku}" ${p.sku === selectedInitialSku ? 'selected' : ''} data-price="${p.precioVenta}" data-stock="${p.stockActual}">
                ${p.nombre} (Stock: ${p.stockActual} uds · ${formatCOP(p.precioVenta)})
              </option>
            `).join('')}
          </select>
        </div>

        <div class="grid grid-cols-2 gap-3">
          <div class="flex flex-col gap-1.5">
            <label for="exit-qty" class="font-sans font-semibold text-[#1C1C1C]">Cantidad</label>
            <input
              type="number"
              id="exit-qty"
              min="1"
              max="${initialProduct?.stockActual || 1}"
              value="1"
              class="h-10 px-3 rounded-lg bg-white border border-[#8C8272] font-mono text-sm text-[#1C1C1C] font-bold"
              required
            />
            <span id="exit-stock-hint" class="text-[10px] text-[#6B645A]">Máximo disponible: ${initialProduct?.stockActual || 0} uds</span>
          </div>

          <div class="flex flex-col gap-1.5">
            <label for="exit-reason" class="font-sans font-semibold text-[#1C1C1C]">Motivo</label>
            <select id="exit-reason" class="h-10 px-3 rounded-lg bg-white border border-[#8C8272] text-xs text-[#1C1C1C] font-semibold">
              <option value="venta_publico" ${defaultReason === 'venta_publico' ? 'selected' : ''}>Venta al Público</option>
              <option value="consumo_interno" ${defaultReason === 'consumo_interno' ? 'selected' : ''}>Consumo en Sillón / Cabina</option>
              ${!isBarbero ? `<option value="merma">Avería / Merma (Ajuste)</option>` : ''}
            </select>
          </div>
        </div>

        <!-- SECCIÓN DE MÉTODO DE PAGO (Solo visible si es Venta al Público) -->
        <div id="section-metodo-pago" class="flex flex-col gap-2 pt-1 border-t border-[#D5CBB8]">
          <label class="font-sans font-semibold text-[#1C1C1C]">Método de Pago (Colombia)</label>
          <div class="grid grid-cols-2 sm:grid-cols-3 gap-2">
            <label class="flex items-center gap-2 p-2 rounded-lg bg-white border border-[#D5CBB8] cursor-pointer hover:border-[#1F3A5F]">
              <input type="radio" name="exit-metodo-pago" value="efectivo" checked class="text-[#1F3A5F] focus:ring-0" />
              <span class="font-medium text-[11px] text-[#1C1C1C]">Efectivo</span>
            </label>
            <label class="flex items-center gap-2 p-2 rounded-lg bg-white border border-[#D5CBB8] cursor-pointer hover:border-[#1F3A5F]">
              <input type="radio" name="exit-metodo-pago" value="nequi" class="text-[#1F3A5F] focus:ring-0" />
              <span class="font-medium text-[11px] text-[#1C1C1C]">Nequi</span>
            </label>
            <label class="flex items-center gap-2 p-2 rounded-lg bg-white border border-[#D5CBB8] cursor-pointer hover:border-[#1F3A5F]">
              <input type="radio" name="exit-metodo-pago" value="daviplata" class="text-[#1F3A5F] focus:ring-0" />
              <span class="font-medium text-[11px] text-[#1C1C1C]">Daviplata</span>
            </label>
            <label class="flex items-center gap-2 p-2 rounded-lg bg-white border border-[#D5CBB8] cursor-pointer hover:border-[#1F3A5F]">
              <input type="radio" name="exit-metodo-pago" value="tarjeta_debito_credito" class="text-[#1F3A5F] focus:ring-0" />
              <span class="font-medium text-[11px] text-[#1C1C1C]">Datáfono</span>
            </label>
            <label class="flex items-center gap-2 p-2 rounded-lg bg-white border border-[#D5CBB8] cursor-pointer hover:border-[#1F3A5F]">
              <input type="radio" name="exit-metodo-pago" value="transferencia_bancaria" class="text-[#1F3A5F] focus:ring-0" />
              <span class="font-medium text-[11px] text-[#1C1C1C]">Transferencia</span>
            </label>
          </div>

          <!-- Total a cobrar calculado en vivo -->
          <div class="mt-2 p-3 bg-[#E4ECF5] border border-[#1F3A5F]/20 rounded-lg flex items-center justify-between">
            <span class="font-sans font-semibold text-xs text-[#1F3A5F]">Total a Cobrar:</span>
            <span id="exit-total-display" class="font-mono font-bold text-base text-[#1F3A5F]">
              ${formatCOP(initialProduct?.precioVenta || 0)}
            </span>
          </div>
        </div>

        <div class="flex flex-col gap-1.5">
          <label for="exit-note" class="font-sans font-semibold text-[#1C1C1C]">Nota u Observación (Opcional)</label>
          <input
            type="text"
            id="exit-note"
            placeholder="Ej: Cliente fidelizado / Venta adicional a corte"
            class="h-9 px-3 rounded-lg bg-white border border-[#8C8272] text-xs text-[#1C1C1C]"
          />
        </div>
      </form>
    `,
    confirmText: 'Confirmar Operación',
    cancelText: 'Cancelar',
    confirmVariant: 'primary',
    onConfirm: async () => {
      const skuSelect = document.getElementById('exit-sku');
      const sku = skuSelect?.value;
      const qtyInput = document.getElementById('exit-qty');
      const qty = parseInt(qtyInput?.value, 10) || 1;
      const reason = document.getElementById('exit-reason')?.value || 'venta_publico';
      const note = document.getElementById('exit-note')?.value?.trim() || '';

      const paymentInput = document.querySelector('input[name="exit-metodo-pago"]:checked');
      const metodoPago = reason === 'venta_publico' ? (paymentInput?.value || 'efectivo') : null;

      const product = backofficeStore.products.find(p => p.sku === sku);
      if (!product) return false;

      // Validación estricta de stock no-negativo (RN-10)
      if (qty > (product.stockActual || 0)) {
        alert(`No es posible realizar la operación: existencias insuficientes (${product.stockActual} disponibles).`);
        return false;
      }

      await backofficeStore.addStockExit(sku, qty, reason, metodoPago, note);
      await loadInventoryKardexData(userRole);
      onUpdate();
      return true;
    }
  });

  // Cálculo en vivo y sincronización de stock máximo en el modal
  setTimeout(() => {
    const skuSelect = document.getElementById('exit-sku');
    const qtyInput = document.getElementById('exit-qty');
    const reasonSelect = document.getElementById('exit-reason');
    const paymentSection = document.getElementById('section-metodo-pago');
    const totalDisplay = document.getElementById('exit-total-display');
    const stockHint = document.getElementById('exit-stock-hint');

    const updateCalculations = () => {
      if (!skuSelect || !qtyInput) return;
      const selectedOption = skuSelect.options[skuSelect.selectedIndex];
      const price = Number(selectedOption?.getAttribute('data-price') || 0);
      const stock = Number(selectedOption?.getAttribute('data-stock') || 0);
      const qty = Math.max(1, parseInt(qtyInput.value, 10) || 1);

      qtyInput.max = stock;
      if (stockHint) stockHint.textContent = `Máximo disponible: ${stock} uds`;

      if (totalDisplay) {
        totalDisplay.textContent = formatCOP(price * qty);
      }
    };

    const togglePaymentSection = () => {
      if (!reasonSelect || !paymentSection) return;
      if (reasonSelect.value === 'venta_publico') {
        paymentSection.classList.remove('hidden');
      } else {
        paymentSection.classList.add('hidden');
      }
    };

    skuSelect?.addEventListener('change', updateCalculations);
    qtyInput?.addEventListener('input', updateCalculations);
    reasonSelect?.addEventListener('change', togglePaymentSection);
    togglePaymentSection();
    updateCalculations();
  }, 50);
}

function openStockEntryModal(onUpdate, defaultSku = '') {
  const products = backofficeStore.products;

  openDialog({
    title: '+ Registrar Entrada de Stock (Reposición)',
    contentHtml: `
      <form id="form-stock-entry" class="flex flex-col gap-4 text-xs">
        <div class="flex flex-col gap-1.5">
          <label class="font-sans font-semibold text-[#1C1C1C]">Producto / Referencia</label>
          <select id="entry-sku" class="h-10 px-3 rounded-lg bg-white border border-[#8C8272] text-xs font-semibold text-[#1C1C1C]">
            ${products.map(p => `
              <option value="${p.sku}" ${p.sku === defaultSku ? 'selected' : ''}>
                ${p.sku} · ${p.nombre} (Stock actual: ${p.stockActual})
              </option>
            `).join('')}
          </select>
        </div>

        <div class="flex flex-col gap-1.5">
          <label class="font-sans font-semibold text-[#1C1C1C]">Cantidad de Unidades a Ingresar</label>
          <input
            type="number"
            id="entry-qty"
            min="1"
            value="5"
            class="h-10 px-3 rounded-lg bg-white border border-[#8C8272] font-mono text-sm text-[#1C1C1C] font-bold"
            required
          />
        </div>

        <div class="flex flex-col gap-1.5">
          <label class="font-sans font-semibold text-[#1C1C1C]">Número de Factura o Remisión Proveedor (Opcional)</label>
          <input
            type="text"
            id="entry-note"
            placeholder="Ej: FAC-2026-908"
            class="h-10 px-3 rounded-lg bg-white border border-[#8C8272] text-xs text-[#1C1C1C]"
          />
        </div>
      </form>
    `,
    confirmText: 'Registrar Entrada',
    cancelText: 'Cancelar',
    confirmVariant: 'primary',
    onConfirm: async () => {
      const sku = document.getElementById('entry-sku').value;
      const qty = parseInt(document.getElementById('entry-qty').value, 10) || 1;
      const note = document.getElementById('entry-note').value;

      await backofficeStore.addStockEntry(sku, qty, note);
      await loadInventoryKardexData('administrador');
      onUpdate();
      return true;
    }
  });
}

function openNuevoProductoModal(onUpdate) {
  openDialog({
    title: '+ Registrar Nuevo Producto',
    contentHtml: `
      <form id="form-nuevo-producto" class="flex flex-col gap-3 text-xs">
        <div class="flex flex-col gap-1">
          <label class="font-semibold text-[#1C1C1C]">Nombre del Producto <span class="text-[#8B1E1E]">*</span></label>
          <input type="text" id="prd-new-nombre" required placeholder="Ej. Cera Moldeadora Fibra 100ml" class="h-10 px-3 bg-white border border-[#8C8272] rounded-lg" />
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div class="flex flex-col gap-1">
            <label class="font-semibold text-[#1C1C1C]">SKU Único <span class="text-[#8B1E1E]">*</span></label>
            <input type="text" id="prd-new-sku" required placeholder="CERA-FIB-06" class="h-10 px-3 bg-white border border-[#8C8272] rounded-lg uppercase font-mono" />
          </div>
          <div class="flex flex-col gap-1">
            <label class="font-semibold text-[#1C1C1C]">Categoría <span class="text-[#8B1E1E]">*</span></label>
            <select id="prd-new-cat" class="h-10 px-3 bg-white border border-[#8C8272] rounded-lg">
              <option value="Peinado">Peinado</option>
              <option value="Cuidado Facial">Cuidado Facial</option>
              <option value="Afeitado">Afeitado</option>
              <option value="Uso en Cabina">Uso en Cabina</option>
            </select>
          </div>
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div class="flex flex-col gap-1">
            <label class="font-semibold text-[#1C1C1C]">Stock Inicial</label>
            <input type="number" id="prd-new-stock" min="0" value="10" class="h-10 px-3 bg-white border border-[#8C8272] rounded-lg font-mono" />
          </div>
          <div class="flex flex-col gap-1">
            <label class="font-semibold text-[#1C1C1C]">Stock Mínimo (Alerta)</label>
            <input type="number" id="prd-new-min" min="1" value="3" class="h-10 px-3 bg-white border border-[#8C8272] rounded-lg font-mono" />
          </div>
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div class="flex flex-col gap-1">
            <label class="font-semibold text-[#1C1C1C]">Precio Venta COP <span class="text-[#8B1E1E]">*</span></label>
            <input type="number" id="prd-new-precio" step="1000" min="1000" value="35000" class="h-10 px-3 bg-white border border-[#8C8272] rounded-lg font-mono font-bold" />
          </div>
          <div class="flex flex-col gap-1">
            <label class="font-semibold text-[#1C1C1C]">Costo Unitario COP</label>
            <input type="number" id="prd-new-costo" step="1000" min="0" value="20000" class="h-10 px-3 bg-white border border-[#8C8272] rounded-lg font-mono" />
          </div>
        </div>
      </form>
    `,
    confirmText: 'Crear Producto',
    cancelText: 'Cancelar',
    confirmVariant: 'primary',
    onConfirm: () => {
      const nombre = document.getElementById('prd-new-nombre')?.value.trim();
      const sku = document.getElementById('prd-new-sku')?.value.trim().toUpperCase();
      const categoria = document.getElementById('prd-new-cat')?.value;
      const stockActual = parseInt(document.getElementById('prd-new-stock')?.value, 10) || 0;
      const stockMinimo = parseInt(document.getElementById('prd-new-min')?.value, 10) || 3;
      const precioVenta = parseInt(document.getElementById('prd-new-precio')?.value, 10) || 35000;
      const costoUnitario = parseInt(document.getElementById('prd-new-costo')?.value, 10) || 20000;

      if (!nombre || !sku) return false;

      inventarioService.crearProducto({
        sku,
        nombre,
        categoria,
        stockInicial: stockActual,
        stockMinimo,
        precioVentaCop: precioVenta,
        costoUnitarioCop: costoUnitario
      }).then(async () => {
        await loadInventoryKardexData('administrador');
        onUpdate();
      }).catch(err => {
        alert('Error al crear producto: ' + err.message);
      });

      return true;
    }
  });
}

function exportarKardexCSV(movements = []) {
  const headers = ['ID_Movimiento', 'Fecha_Hora', 'SKU', 'Producto', 'Tipo', 'Subtipo', 'Cantidad', 'Stock_Previo', 'Stock_Nuevo', 'Referencia', 'Responsable'];

  const rows = movements.map(m => [
    `"${m.id}"`,
    `"${m.fechaHora}"`,
    `"${m.sku}"`,
    `"${m.productoNombre}"`,
    `"${m.tipo}"`,
    `"${m.subtipoLabel || m.subtipo}"`,
    m.cantidad,
    m.stockPrevio,
    m.stockNuevo,
    `"${m.referencia || ''}"`,
    `"${m.responsable || ''}"`
  ]);

  const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `kardex_movimientos_smartbarber_${new Date().toISOString().substring(0,10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
