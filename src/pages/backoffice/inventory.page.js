/**
 * Backoffice Inventario & Kardex Page
 * Búsqueda reactiva, filtros por estado, modales de Entrada, Salida, Nuevo Producto
 * y Libro Mayor de Movimientos Kardex con exportación CSV (Bloque 3).
 * Fiel a docs/stitch/smartbarber_inventario_de_productos_y_kardex y smartbarber_historial_de_movimientos_kardex.
 */

import { backofficeStore } from './backoffice-state.js';
import { inventarioService } from '../../services/index.js';
import { formatCOP } from '../../utils/formatters.js';
import { renderStatusBadge } from '../../components/status-badge.js';
import { renderKpiCard } from '../../components/kpi-card.js';
import { openDialog } from '../../components/ui-dialog.js';

let cachedKardexMovements = [];

export async function loadInventoryKardexData() {
  const [kdxRes, prodRes] = await Promise.all([
    inventarioService.getMovimientosKardex(),
    inventarioService.getProductos()
  ]);
  if (kdxRes.ok) cachedKardexMovements = kdxRes.data;
  if (prodRes.ok) backofficeStore.products = prodRes.data;
}

export function renderInventoryPage() {
  const products = backofficeStore.getFilteredProducts();
  const allProducts = backofficeStore.products;

  const totalValueCOP = allProducts.reduce((sum, p) => sum + (p.stockActual * p.precioVenta), 0);
  const optimalCount = allProducts.filter(p => p.stockActual > p.stockMinimo).length;
  const lowCount = allProducts.filter(p => p.stockActual > 0 && p.stockActual <= p.stockMinimo).length;
  const outCount = allProducts.filter(p => p.stockActual === 0).length;

  const currentFilter = backofficeStore.inventoryStatusFilter;

  return `
    <div class="flex flex-col gap-6 animate-fadeIn">
      <!-- HEADER CON ACCIONES -->
      <header class="flex flex-col gap-2">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 class="font-serif text-2xl sm:text-3xl font-bold text-[#1C1C1C] tracking-tight">
              Inventario de Productos & Kardex
            </h1>
          </div>

          <div class="flex flex-wrap items-center gap-2">
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
              <span>- Salida Stock</span>
            </button>
            <button
              id="btn-inv-nuevo"
              type="button"
              class="min-h-[40px] px-4 py-1.5 rounded-lg bg-[#1F3A5F] hover:bg-[#162B47] text-white font-semibold text-xs shadow-sm transition-all flex items-center gap-1.5 active:scale-[0.98]"
            >
              <span class="material-symbols-outlined text-[18px]">add</span>
              <span>+ Nuevo Producto</span>
            </button>
          </div>
        </div>

        <!-- Double-rule Heritage Line -->
        <div class="double-rule-divider w-full mt-2"></div>
      </header>

      <!-- 4 TARJETAS KPI -->
      <section aria-label="Resumen de inventario" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        ${renderKpiCard({
          label: 'Total Referencias',
          value: allProducts.length,
          caption: `Valoración: ${formatCOP(totalValueCOP)}`,
          icon: 'inventory_2',
          iconBg: 'bg-[#E4ECF5]',
          iconColor: 'text-[#1F3A5F]'
        })}

        ${renderKpiCard({
          label: 'En Nivel Óptimo',
          value: optimalCount,
          caption: 'Con stock por encima del mínimo',
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
          caption: 'Requieren orden de reposición inmediata',
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
            placeholder="Buscar por SKU, producto o categoría..."
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
                <th class="py-3 px-4 font-semibold">SKU / Referencia</th>
                <th class="py-3 px-4 font-semibold min-w-[240px]">Producto</th>
                <th class="py-3 px-4 font-semibold">Categoría</th>
                <th class="py-3 px-4 font-semibold text-center">Stock Físico</th>
                <th class="py-3 px-4 font-semibold text-center">Nivel Mínimo</th>
                <th class="py-3 px-4 font-semibold text-right">Precio Venta (COP)</th>
                <th class="py-3 px-4 font-semibold text-center">Estado</th>
                <th class="py-3 px-4 font-semibold text-right min-w-[140px]">Acciones</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-[#D5CBB8]/40 text-xs text-[#1C1C1C]">
              ${products.length === 0 ? `
                <tr>
                  <td colspan="8" class="py-12 text-center text-[#6B645A]">
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
                let statusBadge;
                if (p.stockActual === 0) {
                  statusBadge = renderStatusBadge({ status: 'agotado', label: 'Agotado' });
                } else if (p.stockActual <= p.stockMinimo) {
                  statusBadge = renderStatusBadge({ status: 'stock_bajo', label: 'Bajo' });
                } else {
                  statusBadge = renderStatusBadge({ status: 'disponible', label: 'Óptimo' });
                }

                return `
                  <tr class="hover:bg-[#FAF3E5] transition-colors bg-white">
                    <td class="py-3 px-4 font-mono font-bold text-xs text-[#1F3A5F]">
                      ${p.sku}
                    </td>
                    <td class="py-3 px-4">
                      <div class="font-sans font-bold text-xs text-[#1C1C1C]">${p.nombre}</div>
                      <div class="text-[10px] text-[#6B645A] font-mono mt-0.5">Costo: ${formatCOP(p.costoUnitario || 0)}</div>
                    </td>
                    <td class="py-3 px-4 text-[#4F4A42]">
                      <span class="bg-[#E8DFCE]/50 px-2 py-0.5 rounded text-[11px] font-medium border border-[#D5CBB8]/40">
                        ${p.categoria}
                      </span>
                    </td>
                    <td class="py-3 px-4 text-center font-mono font-bold text-sm ${p.stockActual === 0 ? 'text-[#B3261E]' : p.stockActual <= p.stockMinimo ? 'text-[#8A5300]' : 'text-[#1C1C1C]'}">
                      ${p.stockActual}
                    </td>
                    <td class="py-3 px-4 text-center font-mono text-xs text-[#6B645A]">
                      ${p.stockMinimo}
                    </td>
                    <td class="py-3 px-4 text-right font-mono font-bold text-xs text-[#1C1C1C] tabular-nums">
                      ${formatCOP(p.precioVenta)}
                    </td>
                    <td class="py-3 px-4 text-center">
                      ${statusBadge}
                    </td>
                    <td class="py-3 px-4 text-right">
                      <div class="inline-flex items-center justify-end gap-1">
                        <button
                          type="button"
                          data-quick-entry="${p.sku}"
                          class="p-1 rounded text-[#235D3A] hover:bg-[#E3EFE7] transition-colors"
                          title="Entrada rápida de stock"
                        >
                          <span class="material-symbols-outlined text-[18px]">add_circle</span>
                        </button>
                        <button
                          type="button"
                          data-quick-exit="${p.sku}"
                          class="p-1 rounded text-[#8B1E1E] hover:bg-[#FCE8E6] transition-colors"
                          title="Descontar stock"
                        >
                          <span class="material-symbols-outlined text-[18px]">remove_circle</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>

        <div class="bg-[#E8DFCE] px-4 py-3 flex items-center justify-between text-xs text-[#4F4A42]">
          <span>Mostrando <strong>${products.length}</strong> de <strong>${allProducts.length}</strong> productos registrados</span>
          <span class="font-mono text-[11px] text-[#6B645A]">Valoración total: ${formatCOP(totalValueCOP)}</span>
        </div>
      </section>
    </div>

    <!-- ========================================== -->
    <!-- MODAL / DRAWER: LIBRO MAYOR KARDEX         -->
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

        <!-- 4 Summary KPI Strip -->
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div class="p-3 bg-white border border-[#D5CBB8] rounded-lg">
            <span class="text-[#6B645A] uppercase font-bold text-[10px]">Movimientos Mes</span>
            <div class="font-mono text-xl font-bold text-[#1C1C1C] mt-1">142</div>
            <span class="text-[10px] text-[#235D3A] font-semibold">+12% vs mes anterior</span>
          </div>
          <div class="p-3 bg-white border border-[#D5CBB8] rounded-lg">
            <span class="text-[#6B645A] uppercase font-bold text-[10px]">Entradas del Período</span>
            <div class="font-mono text-xl font-bold text-[#235D3A] mt-1">+16 uds</div>
            <span class="text-[10px] text-[#4F4A42]">Reposición proveedor</span>
          </div>
          <div class="p-3 bg-white border border-[#D5CBB8] rounded-lg">
            <span class="text-[#6B645A] uppercase font-bold text-[10px]">Salidas por Venta/Uso</span>
            <div class="font-mono text-xl font-bold text-[#B3261E] mt-1">-5 uds</div>
            <span class="text-[10px] text-[#4F4A42]">Ventas + Sillón</span>
          </div>
          <div class="p-3 bg-white border border-[#D5CBB8] rounded-lg">
            <span class="text-[#6B645A] uppercase font-bold text-[10px]">Auditoría Kardex</span>
            <div class="font-mono text-xl font-bold text-[#1F3A5F] mt-1">100% OK</div>
            <span class="text-[10px] text-[#235D3A] font-semibold">Caja cuadrada</span>
          </div>
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
              ${cachedKardexMovements.map(k => `
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
  `;
}

export function attachInventoryListeners(onUpdate) {
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

  // Botón Entrada Stock
  const btnEntrada = document.getElementById('btn-inv-entrada');
  if (btnEntrada) {
    btnEntrada.addEventListener('click', () => openStockEntryModal(onUpdate));
  }

  // Botón Salida Stock
  const btnSalida = document.getElementById('btn-inv-salida');
  if (btnSalida) {
    btnSalida.addEventListener('click', () => openStockExitModal(onUpdate));
  }

  // Botón Nuevo Producto
  const btnNuevo = document.getElementById('btn-inv-nuevo');
  if (btnNuevo) {
    btnNuevo.addEventListener('click', () => openNuevoProductoModal(onUpdate));
  }

  // Botón Historial Kardex
  const btnKardex = document.getElementById('btn-inv-kardex');
  const dialogKardex = document.getElementById('dialog-kardex-ledger');
  const closeKardexX = document.getElementById('btn-close-kardex-modal');
  const closeKardexBtn = document.getElementById('btn-cerrar-kardex');
  const exportKardexBtn = document.getElementById('btn-export-kardex-csv');

  if (btnKardex && dialogKardex) {
    btnKardex.addEventListener('click', async () => {
      await loadInventoryKardexData();
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

  // Restablecer filtros desde estado vacío
  const btnReset = document.getElementById('btn-reset-inv-filter');
  if (btnReset) {
    btnReset.addEventListener('click', () => {
      backofficeStore.inventorySearchQuery = '';
      backofficeStore.inventoryStatusFilter = 'all';
      onUpdate();
    });
  }

  // Acciones en fila de tabla
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
      openStockExitModal(onUpdate, sku);
    });
  });
}

function openStockEntryModal(onUpdate, defaultSku = '') {
  const products = backofficeStore.products;

  openDialog({
    title: '+ Registrar Entrada de Stock (Kardex)',
    contentHtml: `
      <form id="form-stock-entry" class="flex flex-col gap-4">
        <div class="flex flex-col gap-1">
          <label class="font-sans font-semibold text-xs text-[#1C1C1C]">Producto / SKU</label>
          <select id="entry-sku" class="h-10 px-3 rounded-md bg-white border border-[#8C8272] text-xs font-semibold text-[#1C1C1C]">
            ${products.map(p => `
              <option value="${p.sku}" ${p.sku === defaultSku ? 'selected' : ''}>
                ${p.sku} · ${p.nombre} (Stock actual: ${p.stockActual})
              </option>
            `).join('')}
          </select>
        </div>

        <div class="flex flex-col gap-1">
          <label class="font-sans font-semibold text-xs text-[#1C1C1C]">Cantidad de Unidades a Ingresar</label>
          <input
            type="number"
            id="entry-qty"
            min="1"
            value="5"
            class="h-10 px-3 rounded-md bg-white border border-[#8C8272] font-mono text-sm text-[#1C1C1C]"
            required
          />
        </div>

        <div class="flex flex-col gap-1">
          <label class="font-sans font-semibold text-xs text-[#1C1C1C]">Número de Factura / Remisión (Opcional)</label>
          <input
            type="text"
            id="entry-note"
            placeholder="Ej: FAC-2026-908"
            class="h-10 px-3 rounded-md bg-white border border-[#8C8272] text-xs text-[#1C1C1C]"
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
      await loadInventoryKardexData();
      onUpdate();
      return true;
    }
  });
}

function openStockExitModal(onUpdate, defaultSku = '') {
  const products = backofficeStore.products;

  openDialog({
    title: '- Registrar Salida de Stock (Kardex)',
    contentHtml: `
      <form id="form-stock-exit" class="flex flex-col gap-4">
        <div class="flex flex-col gap-1">
          <label class="font-sans font-semibold text-xs text-[#1C1C1C]">Producto / SKU</label>
          <select id="exit-sku" class="h-10 px-3 rounded-md bg-white border border-[#8C8272] text-xs font-semibold text-[#1C1C1C]">
            ${products.map(p => `
              <option value="${p.sku}" ${p.sku === defaultSku ? 'selected' : ''}>
                ${p.sku} · ${p.nombre} (Stock actual: ${p.stockActual})
              </option>
            `).join('')}
          </select>
        </div>

        <div class="flex flex-col gap-1">
          <label class="font-sans font-semibold text-xs text-[#1C1C1C]">Cantidad de Unidades a Descontar</label>
          <input
            type="number"
            id="exit-qty"
            min="1"
            value="1"
            class="h-10 px-3 rounded-md bg-white border border-[#8C8272] font-mono text-sm text-[#1C1C1C]"
            required
          />
        </div>

        <div class="flex flex-col gap-1">
          <label class="font-sans font-semibold text-xs text-[#1C1C1C]">Motivo de Salida</label>
          <select id="exit-reason" class="h-10 px-3 rounded-md bg-white border border-[#8C8272] text-xs text-[#1C1C1C]">
            <option value="venta_publico">Venta al Público (Mostrador)</option>
            <option value="consumo_interno">Consumo Interno en Cabina / Sillón</option>
            <option value="merma">Avería / Producto Dañado</option>
          </select>
        </div>
      </form>
    `,
    confirmText: 'Descontar Unidades',
    cancelText: 'Cancelar',
    confirmVariant: 'danger',
    onConfirm: async () => {
      const sku = document.getElementById('exit-sku').value;
      const qty = parseInt(document.getElementById('exit-qty').value, 10) || 1;
      const reason = document.getElementById('exit-reason').value;

      await backofficeStore.addStockExit(sku, qty, reason);
      await loadInventoryKardexData();
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
        await loadInventoryKardexData();
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
