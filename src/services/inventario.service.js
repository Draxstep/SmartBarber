/**
 * SmartBarber - Servicio de Inventario & Kardex (100% Producción Real)
 * Control de stock físico, alertas de reposición y movimientos inmutables (CU-016 a CU-019).
 * Soporte Offline-First con IndexedDB ('smartbarber-db' -> store 'inventario').
 */

import { httpClient, ValidationError } from './http-client.js';
import { sedesService } from './sedes.service.js';
import { encolarCambio } from '../pwa/sync.js';
import { guardarLote, guardarRegistro, listarRegistros } from '../pwa/db.js';

function normalizeProducto(p) {
  if (!p) return null;
  const id = p.productoId || p.id || p.producto_id || '';
  const stockActual = Number(p.stockActual ?? p.stock_actual ?? 0);
  const stockMinimo = Number(p.stockMinimo ?? p.stock_minimo ?? 0);

  return {
    id,
    productoId: id,
    sedeId: p.sedeId || p.sede_id,
    sku: p.sku || (id ? `PRD-${String(id).slice(-6).toUpperCase()}` : 'PRD-GRAL'),
    nombre: p.nombre || 'Producto',
    categoria: p.categoria || 'General',
    stockActual,
    stockMinimo,
    precioVenta: Number(p.precioVentaCop ?? p.precio_venta_cop ?? p.precioVenta ?? 0),
    precioVentaCop: Number(p.precioVentaCop ?? p.precio_venta_cop ?? p.precioVenta ?? 0),
    costoUnitario: Number(p.costoUnitarioCop ?? p.costo_unitario_cop ?? p.costoUnitario ?? 0),
    costoUnitarioCop: Number(p.costoUnitarioCop ?? p.costo_unitario_cop ?? p.costoUnitario ?? 0),
    unidad: p.unidad || 'Unidades',
    estado: p.estado || 'activo',
    isAgotado: stockActual === 0,
    isBajoStock: stockActual > 0 && stockActual <= stockMinimo
  };
}

function toIDBProducto(p) {
  return {
    producto_id: p.productoId || p.id,
    sku: p.sku,
    nombre: p.nombre,
    categoria: p.categoria,
    stock_actual: p.stockActual,
    stock_minimo: p.stockMinimo,
    precio_venta_cop: p.precioVentaCop || p.precioVenta,
    costo_unitario_cop: p.costoUnitarioCop || p.costoUnitario,
    estado: p.estado || 'activo',
    sede_id: p.sedeId
  };
}

function normalizeMovimiento(m) {
  if (!m) return null;
  const fecha = m.creadoEn ? new Date(m.creadoEn) : new Date();
  const fechaFormato = fecha.toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' }) +
    ', ' + fecha.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', hour12: true });

  const subtipoLabels = {
    inventario_inicial: 'Inventario inicial',
    compra_reposicion: 'Reposición proveedor',
    compra_proveedor: 'Reposición proveedor',
    ajuste_positivo: 'Ajuste positivo',
    venta_publico: 'Venta al público',
    consumo_interno: 'Consumo interno cabina',
    ajuste_negativo: 'Ajuste negativo / merma'
  };

  const id = m.movimientoId || m.id || '';
  const prodId = m.productoId || m.producto_id || '';

  return {
    id,
    movimientoId: id,
    fechaHora: m.creadoEn || new Date().toISOString(),
    fechaFormato,
    sku: m.sku || (prodId ? `PRD-${String(prodId).slice(-4)}` : 'SKU'),
    productoId: prodId,
    productoNombre: m.productoNombre || m.nombreProducto || 'Producto',
    tipo: m.tipo,
    subtipo: m.subtipo,
    subtipoLabel: subtipoLabels[m.subtipo] || m.subtipo,
    cantidad: Number(m.cantidad || 0),
    stockPrevio: Number(m.stockAnterior ?? m.stockPrevio ?? 0),
    stockNuevo: Number(m.stockResultante ?? m.stockNuevo ?? 0),
    referencia: m.observacion || (m.registroCorteId ? `Corte #${String(m.registroCorteId).slice(-4)}` : 'Movimiento almacén'),
    responsable: m.usuarioNombre || 'Administrador'
  };
}

export const inventarioService = {
  /**
   * Obtiene la lista de productos con filtros de búsqueda y estado de stock (CU-016).
   * Con persistencia y fallback automático a IndexedDB en modo Offline.
   */
  async getProductos(filtros = {}) {
    const query = new URLSearchParams();
    if (filtros.search) query.append('busqueda', filtros.search);
    if (filtros.categoria && filtros.categoria !== 'all') query.append('categoria', filtros.categoria);

    if (filtros.estado === 'disponible') {
      query.append('estadoStock', 'disponible');
    } else if (filtros.estado === 'stock_bajo') {
      query.append('estadoStock', 'bajo_stock');
    } else if (filtros.estado === 'agotado') {
      query.append('estadoStock', 'agotado');
    }

    const q = query.toString() ? `?${query.toString()}` : '';

    try {
      const response = await httpClient.get(`/inventario${q}`);

      if (response?.data && Array.isArray(response.data)) {
        const list = response.data.map(normalizeProducto).filter(Boolean);
        // Persistir en IndexedDB para disponibilidad offline
        guardarLote('inventario', list.map(toIDBProducto)).catch(() => {});
        return { ok: true, success: true, data: list };
      }
      if (Array.isArray(response)) {
        const list = response.map(normalizeProducto).filter(Boolean);
        guardarLote('inventario', list.map(toIDBProducto)).catch(() => {});
        return { ok: true, success: true, data: list };
      }
    } catch (networkErr) {
      console.warn('⚠️ Red no disponible en inventarioService.getProductos. Consultando IndexedDB local...', networkErr.message);
    }

    // Fallback Offline a IndexedDB
    try {
      const offlineItems = await listarRegistros('inventario');
      if (Array.isArray(offlineItems) && offlineItems.length > 0) {
        let list = offlineItems.map(p => normalizeProducto({
          id: p.producto_id,
          productoId: p.producto_id,
          sku: p.sku,
          nombre: p.nombre,
          categoria: p.categoria,
          stockActual: p.stock_actual,
          stockMinimo: p.stock_minimo,
          precioVentaCop: p.precio_venta_cop,
          costoUnitarioCop: p.costo_unitario_cop,
          estado: p.estado,
          sedeId: p.sede_id
        })).filter(Boolean);

        if (filtros.search) {
          const s = filtros.search.toLowerCase();
          list = list.filter(p => p.nombre.toLowerCase().includes(s) || p.sku.toLowerCase().includes(s) || p.categoria.toLowerCase().includes(s));
        }
        if (filtros.categoria && filtros.categoria !== 'all') {
          list = list.filter(p => p.categoria === filtros.categoria);
        }
        if (filtros.estado === 'disponible') {
          list = list.filter(p => p.stockActual > p.stockMinimo);
        } else if (filtros.estado === 'stock_bajo') {
          list = list.filter(p => p.stockActual > 0 && p.stockActual <= p.stockMinimo);
        } else if (filtros.estado === 'agotado') {
          list = list.filter(p => p.stockActual === 0);
        }

        return { ok: true, success: true, offline: true, data: list };
      }
    } catch (idbErr) {
      console.warn('⚠️ No se pudieron recuperar productos de IndexedDB:', idbErr.message);
    }

    return { ok: true, success: true, offline: true, data: [] };
  },

  async getProductoPorId(id) {
    try {
      const response = await httpClient.get(`/inventario/${id}`);
      if (response?.data) {
        return { ok: true, success: true, data: normalizeProducto(response.data) };
      }
      return response;
    } catch (err) {
      // Fallback a IndexedDB
      const items = await listarRegistros('inventario').catch(() => []);
      const found = items.find(p => p.producto_id === id || p.sku === id);
      if (found) {
        return { ok: true, success: true, offline: true, data: normalizeProducto(found) };
      }
      throw err;
    }
  },

  async crearProducto(datos) {
    let sedeId = datos.sedeId;
    if (!sedeId) {
      const sede = await sedesService.getSedeActiva();
      sedeId = sede?.data?.sedeId || sede?.data?.id;
    }

    const payload = {
      sedeId,
      sku: (datos.sku || '').trim() || null,
      nombre: datos.nombre?.trim(),
      categoria: datos.categoria?.trim() || 'General',
      precioVentaCop: Math.round(Number(datos.precioVentaCop || datos.precioVenta || 0)),
      costoUnitarioCop: Math.round(Number(datos.costoUnitarioCop || datos.costoUnitario || 0)) || null,
      stockInicial: Math.max(0, parseInt(datos.stockInicial || datos.stockActual || 0, 10)),
      stockMinimo: Math.max(0, parseInt(datos.stockMinimo || 0, 10)),
      estado: datos.estado || 'activo'
    };

    const response = await httpClient.post('/inventario', payload);
    if (response?.data) {
      const normalized = normalizeProducto(response.data);
      if (normalized) {
        guardarRegistro('inventario', toIDBProducto(normalized)).catch(() => {});
      }
      return { ok: true, success: true, data: normalized };
    }
    return response;
  },

  async registrarEntrada(productoIdOrSku, cantidad, factura = '') {
    const qty = Math.max(1, parseInt(cantidad, 10) || 1);

    // Si es SKU o UUID, resolver ID
    let productoId = productoIdOrSku;
    if (productoIdOrSku && !productoIdOrSku.includes('-')) {
      const prods = await this.getProductos({ search: productoIdOrSku });
      const found = prods.data?.find(p => p.sku === productoIdOrSku);
      if (found) productoId = found.productoId;
    }

    const payload = {
      cantidad: qty,
      motivo: 'compra_reposicion',
      costoUnitarioCop: null,
      observacion: factura ? `Factura Proveedor: ${factura}` : 'Entrada manual de almacén'
    };

    if (!navigator.onLine) {
      await encolarCambio('MOVIMIENTO_INVENTARIO', {
        productoId,
        tipo: 'entrada',
        ...payload
      });
      return { ok: true, success: true, offline: true, message: 'Entrada encolada en modo sin conexión.' };
    }

    const response = await httpClient.post(`/inventario/${productoId}/entradas`, payload);
    return response;
  },

  async registrarSalida(productoIdOrSku, cantidad, motivo = 'venta_publico', metodoPago = 'efectivo', observacion = '') {
    const qty = Math.max(1, parseInt(cantidad, 10) || 1);

    let productoId = productoIdOrSku;
    if (productoIdOrSku && !productoIdOrSku.includes('-')) {
      const prods = await this.getProductos({ search: productoIdOrSku });
      const found = prods.data?.find(p => p.sku === productoIdOrSku);
      if (found) productoId = found.productoId;
    }

    const subtipo = motivo === 'consumo_interno' ? 'consumo_interno' : 'venta_publico';
    const payload = {
      cantidad: qty,
      tipo: subtipo,
      metodoPago: subtipo === 'venta_publico' ? (metodoPago || 'efectivo') : null,
      observacion: observacion || (subtipo === 'consumo_interno' ? 'Consumo interno en cabina/sillón' : 'Venta de producto en caja')
    };

    if (!navigator.onLine) {
      await encolarCambio('MOVIMIENTO_INVENTARIO', {
        productoId,
        tipo: 'salida',
        ...payload
      });

      // Actualizar optimísticamente en IndexedDB local
      try {
        const dbItems = await listarRegistros('inventario');
        const item = dbItems?.find(p => p.producto_id === productoId || p.sku === productoIdOrSku);
        if (item) {
          item.stock_actual = Math.max(0, (item.stock_actual || 0) - qty);
          await guardarRegistro('inventario', item);
        }
      } catch (_) {}

      return {
        ok: true,
        success: true,
        offline: true,
        message: 'Salida encolada en modo sin conexión.',
        data: {
          producto: { productoId, stockActual: 0 }
        }
      };
    }

    try {
      const response = await httpClient.post(`/inventario/${productoId}/salidas`, payload);
      return response;
    } catch (err) {
      if (err.name === 'NetworkError') {
        await encolarCambio('MOVIMIENTO_INVENTARIO', {
          productoId,
          tipo: 'salida',
          ...payload
        });
        return { ok: true, success: true, offline: true, message: 'Salida encolada en modo sin conexión.' };
      }
      throw err;
    }
  },

  async getAlertas() {
    try {
      const response = await httpClient.get('/inventario/alertas');
      if (response?.data) {
        if (Array.isArray(response.data)) {
          const prods = response.data.map(normalizeProducto).filter(Boolean);
          const bajoStock = prods.filter(p => p.stockActual > 0 && p.stockActual <= p.stockMinimo);
          const agotados = prods.filter(p => p.stockActual === 0);
          return {
            ok: true,
            success: true,
            data: {
              totalAlertas: prods.length,
              bajoStock,
              agotados
            }
          };
        } else {
          const bajoStock = (response.data.bajoStock || []).map(normalizeProducto).filter(Boolean);
          const agotados = (response.data.agotados || []).map(normalizeProducto).filter(Boolean);
          return {
            ok: true,
            success: true,
            data: {
              totalAlertas: bajoStock.length + agotados.length,
              bajoStock,
              agotados
            }
          };
        }
      }
      return response;
    } catch (_) {
      // Fallback a IndexedDB
      try {
        const offlineItems = await listarRegistros('inventario');
        if (Array.isArray(offlineItems)) {
          const prods = offlineItems.map(p => normalizeProducto({
            id: p.producto_id,
            productoId: p.producto_id,
            sku: p.sku,
            nombre: p.nombre,
            categoria: p.categoria,
            stockActual: p.stock_actual,
            stockMinimo: p.stock_minimo
          })).filter(Boolean);

          const bajoStock = prods.filter(p => p.stockActual > 0 && p.stockActual <= p.stockMinimo);
          const agotados = prods.filter(p => p.stockActual === 0);
          return {
            ok: true,
            success: true,
            offline: true,
            data: {
              totalAlertas: bajoStock.length + agotados.length,
              bajoStock,
              agotados
            }
          };
        }
      } catch (_) {}
      return { ok: true, success: true, data: { totalAlertas: 0, bajoStock: [], agotados: [] } };
    }
  },

  async getMovimientosKardex(filtros = {}) {
    const query = new URLSearchParams();
    if (filtros.productoId) query.append('productoId', filtros.productoId);
    if (filtros.tipo && filtros.tipo !== 'all') query.append('tipo', filtros.tipo);

    const q = query.toString() ? `?${query.toString()}` : '';
    try {
      const response = await httpClient.get(`/inventario/movimientos${q}`);

      if (response?.data && Array.isArray(response.data)) {
        let list = response.data.map(normalizeMovimiento).filter(Boolean);
        if (filtros.sku && filtros.sku !== 'all') {
          list = list.filter(m => m.sku === filtros.sku || m.productoId === filtros.sku);
        }
        return { ok: true, success: true, data: list };
      }

      return response;
    } catch (_) {
      return { ok: true, success: true, offline: true, data: [] };
    }
  }
};
