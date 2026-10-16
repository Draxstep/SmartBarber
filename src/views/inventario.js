// src/views/inventario.js
import { InventarioRepository } from '../db/inventarioRepository.js';

const repo = new InventarioRepository();
let currentFilter = 'todos';
let searchTerm = '';

export async function renderizarInventario() {
  const container = document.getElementById('view-inventory');
  if (!container) return;

  container.innerHTML = `
    <div class="inventory-header">
      <div>
        <h2>📦 Control de Inventario </h2>
        <p>Insumos internos, productos de venta, conteo físico y trazabilidad.</p>
      </div>
      <div class="inventory-actions">
        <button id="btn-nuevo-producto" class="btn-primary">➕ Nuevo Ítem</button>
        <button id="btn-nuevo-movimiento" class="btn-secondary">🔄 Movimiento</button>
        <button id="btn-ver-kardex" class="btn-secondary">📜 Ver historial</button>
        <button id="btn-exportar-csv" class="btn-secondary">📥 Exportar</button>
      </div>
    </div>

    <!-- Banner de Alertas de Stock Mínimo -->
    <div id="stock-alerts-banner" style="display: none; margin-bottom: 20px;"></div>

    <!-- Barra de Búsqueda y Filtros -->
    <div class="inventory-toolbar">
      <div class="search-box">
        <input type="text" id="inv-search" placeholder="🔍 Buscar por nombre, categoría o código de barras..." value="${searchTerm}">
      </div>
      <div class="filter-tabs">
        <button class="filter-tab ${currentFilter === 'todos' ? 'active' : ''}" data-filter="todos">Todos</button>
        <button class="filter-tab ${currentFilter === 'insumo' ? 'active' : ''}" data-filter="insumo">Insumos Internos</button>
        <button class="filter-tab ${currentFilter === 'venta' ? 'active' : ''}" data-filter="venta">Para Venta</button>
        <button class="filter-tab ${currentFilter === 'bajo_stock' ? 'active' : ''}" data-filter="bajo_stock">⚠️ Bajo Stock</button>
      </div>
    </div>

    <!-- Contenedor de la Lista / Tabla de Productos -->
    <div id="inv-items-container" class="inv-table-container">
      <p>Cargando inventario...</p>
    </div>

    <!-- Contenedor para Modales Dinámicos -->
    <div id="inv-modal-container"></div>
  `;

  setupEventListeners();
  await recargarListaProductos();
}

async function recargarListaProductos() {
  const itemsContainer = document.getElementById('inv-items-container');
  const alertsBanner = document.getElementById('stock-alerts-banner');
  if (!itemsContainer) return;

  let productos = await repo.getAllProductos();
  const alertas = productos.filter(p => Number(p.stockActual) <= Number(p.stockMinimo));

  // Actualizar banner de alertas
  if (alertsBanner) {
    if (alertas.length > 0) {
      alertsBanner.style.display = 'block';
      alertsBanner.innerHTML = `
        <div class="alert-box alert-warning">
          <strong>⚠️ Atención: ${alertas.length} producto(s) en o por debajo del stock mínimo:</strong>
          <span>${alertas.map(a => `<b>${a.nombre}</b> (Stock: ${a.stockActual} / Mín: ${a.stockMinimo})`).join(', ')}</span>
        </div>
      `;
    } else {
      alertsBanner.style.display = 'none';
    }
  }

  // Actualizar contador del dashboard si existe
  const dashStockCounter = document.getElementById('stock-counter');
  if (dashStockCounter) {
    dashStockCounter.innerText = alertas.length.toString();
  }

  // Filtrado
  if (currentFilter === 'bajo_stock') {
    productos = alertas;
  } else if (currentFilter !== 'todos') {
    productos = productos.filter(p => p.tipo === currentFilter);
  }

  // Búsqueda
  if (searchTerm.trim()) {
    const term = searchTerm.toLowerCase().trim();
    productos = productos.filter(p =>
      (p.nombre || '').toLowerCase().includes(term) ||
      (p.categoria || '').toLowerCase().includes(term) ||
      (p.codigoBarras || '').toLowerCase().includes(term)
    );
  }

  if (productos.length === 0) {
    itemsContainer.innerHTML = `
      <div class="empty-state">
        <p>No se encontraron productos o insumos con los filtros actuales.</p>
      </div>
    `;
    return;
  }

  itemsContainer.innerHTML = `
    <table class="inv-table">
      <thead>
        <tr>
          <th>Código</th>
          <th>Nombre y Categoría</th>
          <th>Tipo</th>
          <th>Stock Actual</th>
          <th>Stock Mín.</th>
          <th>Costo / Venta</th>
          <th>Estado</th>
          <th>Acciones</th>
        </tr>
      </thead>
      <tbody>
        ${productos.map(p => {
          const esBajo = Number(p.stockActual) <= Number(p.stockMinimo);
          return `
            <tr class="${esBajo ? 'row-alert' : ''}">
              <td class="font-mono text-small">${p.codigoBarras || 'N/A'}</td>
              <td>
                <strong>${p.nombre}</strong>
                <span class="sub-text">${p.categoria || 'General'}</span>
              </td>
              <td>
                <span class="badge ${p.tipo === 'insumo' ? 'badge-info' : 'badge-success'}">
                  ${p.tipo === 'insumo' ? 'Insumo Interno' : 'Venta Cliente'}
                </span>
              </td>
              <td class="font-mono font-bold ${esBajo ? 'text-danger' : ''}">${p.stockActual}</td>
              <td class="font-mono">${p.stockMinimo}</td>
              <td>
                ${p.tipo === 'venta' 
                  ? `<span class="text-success">$${Number(p.precioVenta || 0).toLocaleString()}</span> <br><small class="text-muted">Costo: $${Number(p.costo || 0).toLocaleString()}</small>`
                  : `<small class="text-muted">Costo: $${Number(p.costo || 0).toLocaleString()}</small>`
                }
              </td>
              <td>
                ${esBajo 
                  ? '<span class="badge badge-danger">⚠️ Reponer</span>' 
                  : '<span class="badge badge-normal">✅ Óptimo</span>'}
              </td>
              <td>
                <button class="btn-action btn-mov" data-id="${p.id}" title="Registrar Entrada/Salida/Ajuste">🔄</button>
                <button class="btn-action btn-del" data-id="${p.id}" title="Eliminar Producto">🗑️</button>
              </td>
            </tr>
          `;
        }).join('')}
      </tbody>
    </table>
  `;

  // Bind acciones por fila
  itemsContainer.querySelectorAll('.btn-mov').forEach(btn => {
    btn.addEventListener('click', () => abrirModalMovimiento(btn.dataset.id));
  });

  itemsContainer.querySelectorAll('.btn-del').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (confirm('¿Estás seguro de eliminar este producto del inventario?')) {
        await repo.deleteProducto(btn.dataset.id);
        await recargarListaProductos();
      }
    });
  });
}

function setupEventListeners() {
  // Input de búsqueda
  const searchInput = document.getElementById('inv-search');
  searchInput?.addEventListener('input', (e) => {
    searchTerm = e.target.value;
    recargarListaProductos();
  });

  // Filtros de pestañas
  const filterTabs = document.querySelectorAll('.filter-tab');
  filterTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      filterTabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      currentFilter = tab.dataset.filter;
      recargarListaProductos();
    });
  });

  // Botón Nuevo Producto
  document.getElementById('btn-nuevo-producto')?.addEventListener('click', () => {
    abrirModalNuevoProducto();
  });

  // Botón Nuevo Movimiento General
  document.getElementById('btn-nuevo-movimiento')?.addEventListener('click', () => {
    abrirModalMovimiento();
  });

  // Botón Ver Kardex
  document.getElementById('btn-ver-kardex')?.addEventListener('click', () => {
    abrirModalKardex();
  });

  // Botón Exportar CSV
  document.getElementById('btn-exportar-csv')?.addEventListener('click', async () => {
    const csvData = await repo.exportarKardexCSV();
    if (!csvData) {
      alert('Aún no hay movimientos en el Kardex para exportar.');
      return;
    }
    const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `kardex_smartbarber_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  });
}

// MODAL 1: NUEVO PRODUCTO
function abrirModalNuevoProducto() {
  const modalContainer = document.getElementById('inv-modal-container');
  if (!modalContainer) return;

  modalContainer.innerHTML = `
    <div class="modal-overlay" id="modal-nuevo-prod">
      <div class="modal-content">
        <div class="modal-header">
          <h3>➕ Nuevo Ítem de Inventario</h3>
          <button class="modal-close" id="close-prod-modal">&times;</button>
        </div>
        <form id="form-nuevo-prod" class="modal-form">
          <div class="form-group">
            <label>Nombre del Producto / Insumo *</label>
            <input type="text" id="prod-nombre" required placeholder="Ej: Gel de afeitar mentolado">
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>Tipo de Ítem *</label>
              <select id="prod-tipo" required>
                <option value="insumo">Insumo Interno (Consumo del Barbero)</option>
                <option value="venta">Producto de Venta al Cliente</option>
              </select>
            </div>
            <div class="form-group">
              <label>Categoría</label>
              <input type="text" id="prod-categoria" placeholder="Ej: Cuidado Facial, Barba, Navajas">
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>Código de Barras</label>
              <input type="text" id="prod-codigo" placeholder="Ej: 770123456789">
            </div>
            <div class="form-group">
              <label>Stock Inicial *</label>
              <input type="number" id="prod-stock" min="0" value="10" required>
            </div>
            <div class="form-group">
              <label>Stock Mínimo (Alerta) *</label>
              <input type="number" id="prod-stock-min" min="1" value="5" required>
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>Costo Unitario ($) *</label>
              <input type="number" id="prod-costo" min="0" value="8000" required>
            </div>
            <div class="form-group" id="group-precio-venta">
              <label>Precio Venta Cliente ($)</label>
              <input type="number" id="prod-precio" min="0" value="15000">
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn-secondary" id="cancel-prod-modal">Cancelar</button>
            <button type="submit" class="btn-primary">Guardar Ítem</button>
          </div>
        </form>
      </div>
    </div>
  `;

  const close = () => { modalContainer.innerHTML = ''; };
  document.getElementById('close-prod-modal')?.addEventListener('click', close);
  document.getElementById('cancel-prod-modal')?.addEventListener('click', close);

  document.getElementById('form-nuevo-prod')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const nuevoProd = {
      id: 'prod-' + Date.now(),
      nombre: document.getElementById('prod-nombre').value.trim(),
      tipo: document.getElementById('prod-tipo').value,
      categoria: document.getElementById('prod-categoria').value.trim() || 'General',
      codigoBarras: document.getElementById('prod-codigo').value.trim(),
      stockActual: Number(document.getElementById('prod-stock').value) || 0,
      stockMinimo: Number(document.getElementById('prod-stock-min').value) || 1,
      costo: Number(document.getElementById('prod-costo').value) || 0,
      precioVenta: Number(document.getElementById('prod-precio').value) || 0
    };

    await repo.createProducto(nuevoProd);

    // Registrar entrada inicial en Kardex
    await repo.registrarMovimientoKardex({
      productoId: nuevoProd.id,
      tipo: 'entrada',
      cantidad: nuevoProd.stockActual,
      motivo: 'Inventario inicial / Alta de producto',
      responsable: 'Administrador'
    });

    close();
    await recargarListaProductos();
  });
}

// MODAL 2: REGISTRAR MOVIMIENTO KARDEX / CONTEO FÍSICO
async function abrirModalMovimiento(productoIdSeleccionado = null) {
  const modalContainer = document.getElementById('inv-modal-container');
  if (!modalContainer) return;

  const productos = await repo.getAllProductos();
  if (productos.length === 0) {
    alert('Primero debes registrar al menos un producto en el inventario.');
    return;
  }

  modalContainer.innerHTML = `
    <div class="modal-overlay" id="modal-mov">
      <div class="modal-content">
        <div class="modal-header">
          <h3>🔄 Registrar Movimiento de Inventario / Kardex</h3>
          <button class="modal-close" id="close-mov-modal">&times;</button>
        </div>
        <form id="form-mov" class="modal-form">
          <div class="form-group">
            <label>Seleccionar Producto / Insumo *</label>
            <select id="mov-producto" required>
              ${productos.map(p => `
                <option value="${p.id}" ${p.id === productoIdSeleccionado ? 'selected' : ''}>
                  ${p.nombre} (Stock actual: ${p.stockActual})
                </option>
              `).join('')}
            </select>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>Tipo de Operación (Kardex) *</label>
              <select id="mov-tipo" required>
                <option value="entrada">📥 Entrada / Compra (Suma al stock)</option>
                <option value="salida_venta">💰 Salida por Venta al Cliente (Resta)</option>
                <option value="salida_consumo">✂️ Salida por Consumo Interno en Servicio (Resta)</option>
                <option value="salida_merma">⚠️ Salida por Merma / Daño / Vencimiento (Resta con motivo)</option>
                <option value="ajuste">⚖️ Ajuste por Conteo Físico (Sobrescribe con stock real)</option>
              </select>
            </div>
            <div class="form-group">
              <label id="label-cantidad">Cantidad *</label>
              <input type="number" id="mov-cantidad" min="1" value="1" required>
            </div>
          </div>
          <div class="form-group">
            <label id="label-motivo">Motivo o Justificación *</label>
            <input type="text" id="mov-motivo" required placeholder="Ej: Compra a Distribuidora BarberPro / Cuchilla rota">
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>Responsable</label>
              <input type="text" id="mov-responsable" value="Barbero Principal" required>
            </div>
            <div class="form-group" id="group-proveedor">
              <label>Proveedor (Opcional en compras)</label>
              <input type="text" id="mov-proveedor" placeholder="Ej: Suplidora Barber SAS">
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn-secondary" id="cancel-mov-modal">Cancelar</button>
            <button type="submit" class="btn-primary">Registrar en Kardex</button>
          </div>
        </form>
      </div>
    </div>
  `;

  const tipoSelect = document.getElementById('mov-tipo');
  const labelCant = document.getElementById('label-cantidad');
  tipoSelect?.addEventListener('change', (e) => {
    if (e.target.value === 'ajuste') {
      labelCant.innerText = 'Nuevo Stock Real Verificado (Conteo Físico) *';
    } else {
      labelCant.innerText = 'Cantidad *';
    }
  });

  const close = () => { modalContainer.innerHTML = ''; };
  document.getElementById('close-mov-modal')?.addEventListener('click', close);
  document.getElementById('cancel-mov-modal')?.addEventListener('click', close);

  document.getElementById('form-mov')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const prodId = document.getElementById('mov-producto').value;
    const tipo = document.getElementById('mov-tipo').value;
    const cantidad = Number(document.getElementById('mov-cantidad').value);
    const motivo = document.getElementById('mov-motivo').value.trim();
    const responsable = document.getElementById('mov-responsable').value.trim();
    const proveedor = document.getElementById('mov-proveedor').value.trim();

    await repo.registrarMovimientoKardex({
      productoId: prodId,
      tipo,
      cantidad,
      motivo,
      responsable,
      proveedor
    });

    close();
    await recargarListaProductos();
  });
}

// MODAL 3: HISTORIAL DE KARDEX
async function abrirModalKardex() {
  const modalContainer = document.getElementById('inv-modal-container');
  if (!modalContainer) return;

  const movimientos = await repo.getMovimientosKardex();

  modalContainer.innerHTML = `
    <div class="modal-overlay" id="modal-kardex">
      <div class="modal-content modal-large">
        <div class="modal-header">
          <h3>📜 Historial de Movimientos (Kardex Completo)</h3>
          <button class="modal-close" id="close-kardex-modal">&times;</button>
        </div>
        <div class="kardex-table-wrapper">
          ${movimientos.length === 0 ? '<p>No hay movimientos registrados en el Kardex.</p>' : `
            <table class="inv-table">
              <thead>
                <tr>
                  <th>Fecha/Hora</th>
                  <th>Producto</th>
                  <th>Tipo Movimiento</th>
                  <th>Cant.</th>
                  <th>Stock Ant.</th>
                  <th>Stock Nuevo</th>
                  <th>Motivo / Proveedor</th>
                  <th>Responsable</th>
                </tr>
              </thead>
              <tbody>
                ${movimientos.map(m => {
                  let badgeClass = 'badge-normal';
                  let tipoNombre = m.tipo;
                  if (m.tipo === 'entrada') { badgeClass = 'badge-success'; tipoNombre = '📥 Entrada'; }
                  else if (m.tipo === 'salida_venta') { badgeClass = 'badge-info'; tipoNombre = '💰 Venta'; }
                  else if (m.tipo === 'salida_consumo') { badgeClass = 'badge-info'; tipoNombre = '✂️ Consumo'; }
                  else if (m.tipo === 'salida_merma') { badgeClass = 'badge-danger'; tipoNombre = '⚠️ Merma'; }
                  else if (m.tipo === 'ajuste') { badgeClass = 'badge-warning'; tipoNombre = '⚖️ Ajuste'; }

                  return `
                    <tr>
                      <td class="font-mono text-small">${m.fecha} ${m.hora || ''}</td>
                      <td><strong>${m.productoNombre}</strong></td>
                      <td><span class="badge ${badgeClass}">${tipoNombre}</span></td>
                      <td class="font-bold">${m.cantidad}</td>
                      <td class="font-mono text-muted">${m.stockAnterior}</td>
                      <td class="font-mono font-bold">${m.stockNuevo}</td>
                      <td>
                        <span>${m.motivo}</span>
                        ${m.proveedor ? `<br><small class="text-muted">Prov: ${m.proveedor}</small>` : ''}
                      </td>
                      <td><small>${m.responsable}</small></td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          `}
        </div>
        <div class="modal-footer">
          <button type="button" class="btn-secondary" id="close-kardex-btn">Cerrar</button>
        </div>
      </div>
    </div>
  `;

  const close = () => { modalContainer.innerHTML = ''; };
  document.getElementById('close-kardex-modal')?.addEventListener('click', close);
  document.getElementById('close-kardex-btn')?.addEventListener('click', close);
}
