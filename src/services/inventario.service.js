/**
 * SmartBarber - Servicio de Inventario & Kardex (100% Producción Real)
 * Control de stock físico, alertas de reposición y movimientos inmutables (CU-016 a CU-019).
 */

import { httpClient, ValidationError } from './http-client.js';
import { sedesService } from './sedes.service.js';
import { encolarCambio } from '../pwa/sync.js';

function normalizeProducto(p) {
  if (!p) return null;
  const id = p.productoId || p.id;
  const stockActual = Number(p.stockActual ?? 0);
  const stockMinimo = Number(p.stockMinimo ?? 0);

  return {
    id,
    productoId: id,
    sedeId: p.sedeId,
    sku: p.sku || `PRD-${id.slice(-6).toUpperCase()}`,
    nombre: p.nombre,
    categoria: p.categoria || 'General',
    stockActual,
    stockMinimo,
    precioVenta: Number(p.precioVentaCop ?? p.precioVenta ?? 0),
    precioVentaCop: Number(p.precioVentaCop ?? p.precioVenta ?? 0),
    costoUnitario: Number(p.costoUnitarioCop ?? p.costoUnitario ?? 0),
    costoUnitarioCop: Number(p.costoUnitarioCop ?? p.costoUnitario ?? 0),
    unidad: p.unidad || 'Unidades',
    estado: p.estado || 'activo',
    isAgotado: stockActual === 0,
    isBajoStock: stockActual > 0 && stockActual <= stockMinimo
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

  return {
    id: m.movimientoId || m.id,
    movimientoId: m.movimientoId || m.id,
    fechaHora: m.creadoEn || new Date().toISOString(),
    fechaFormato,
    sku: m.sku || (m.productoId ? `PRD-${m.productoId.slice(-4)}` : 'SKU'),
    productoId: m.productoId,
    productoNombre: m.productoNombre || m.nombreProducto || 'Producto',
    tipo: m.tipo,
    subtipo: m.subtipo,
    subtipoLabel: subtipoLabels[m.subtipo] || m.subtipo,
    cantidad: Number(m.cantidad || 0),
    stockPrevio: Number(m.stockAnterior ?? m.stockPrevio ?? 0),
    stockNuevo: Number(m.stockResultante ?? m.stockNuevo ?? 0),
    referencia: m.observacion || (m.registroCorteId ? `Corte #${m.registroCorteId.slice(-4)}` : 'Movimiento almacén'),
    responsable: m.usuarioNombre || 'Administrador'
  };
}

export const inventarioService = {
  /**
   * Obtiene la lista de productos con filtros de búsqueda y estado de stock (CU-016).
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
    const response = await httpClient.get(`/inventario${q}`);

    if (response?.data && Array.isArray(response.data)) {
      const list = response.data.map(normalizeProducto);
      return { ok: true, success: true, data: list };
    }

    return response;
  },

  async getProductoPorId(id) {
    const response = await httpClient.get(`/inventario/${id}`);
    if (response?.data) {
      return { ok: true, success: true, data: normalizeProducto(response.data) };
    }
    return response;
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
      return { ok: true, success: true, data: normalizeProducto(response.data) };
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

  async registrarSalida(productoIdOrSku, cantidad, motivo = 'venta_publico') {
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
      metodoPago: subtipo === 'venta_publico' ? 'efectivo' : null,
      observacion: subtipo === 'consumo_interno' ? 'Consumo interno en cabina/sillón' : 'Venta de producto en caja'
    };

    if (!navigator.onLine) {
      await encolarCambio('MOVIMIENTO_INVENTARIO', {
        productoId,
        tipo: 'salida',
        ...payload
      });
      return { ok: true, success: true, offline: true, message: 'Salida encolada en modo sin conexión.' };
    }

    const response = await httpClient.post(`/inventario/${productoId}/salidas`, payload);
    return response;
  },

  async getAlertas() {
    const response = await httpClient.get('/inventario/alertas');
    if (response?.data) {
      const bajoStock = (response.data.bajoStock || []).map(normalizeProducto);
      const agotados = (response.data.agotados || []).map(normalizeProducto);
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
    return response;
  },

  async getMovimientosKardex(filtros = {}) {
    const query = new URLSearchParams();
    if (filtros.productoId) query.append('productoId', filtros.productoId);
    if (filtros.tipo && filtros.tipo !== 'all') query.append('tipo', filtros.tipo);

    const q = query.toString() ? `?${query.toString()}` : '';
    const response = await httpClient.get(`/inventario/movimientos${q}`);

    if (response?.data && Array.isArray(response.data)) {
      let list = response.data.map(normalizeMovimiento);
      if (filtros.sku && filtros.sku !== 'all') {
        list = list.filter(m => m.sku === filtros.sku || m.productoId === filtros.sku);
      }
      return { ok: true, success: true, data: list };
    }

    return response;
  }
};
