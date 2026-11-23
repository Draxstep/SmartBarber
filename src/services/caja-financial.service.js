/**
 * @file caja-financial.service.js
 * @description Servicio Financiero de Caja y Arqueo POS (Clean Architecture & SOLID - SRP).
 * Consolida atenciones operativas (registros_cortes) y ventas al público de productos (movimientos_inventario).
 * Garantiza inmutabilidad de snapshots de comisiones (RN-12), exclusión de anulados y desglose por 5 métodos.
 */

import { cortesService } from './cortes.service.js';
import { inventarioService } from './inventario.service.js';
import { barberosService } from './barberos.service.js';
import { serviciosService } from './servicios.service.js';
import { authService } from './auth.service.js';

export function normalizePaymentMethodKey(metodo) {
  const m = String(metodo || 'efectivo').toLowerCase().trim();
  if (m === 'tarjeta_debito_credito' || m === 'datafono' || m === 'tarjeta') return 'datafono';
  if (m === 'transferencia_bancaria' || m === 'transferencia') return 'transferencia';
  if (m === 'nequi') return 'nequi';
  if (m === 'daviplata') return 'daviplata';
  return 'efectivo';
}

export function getTodayBogota() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Bogota' }).format(new Date());
}

export const cajaFinancialService = {
  /**
   * Carga y consolida todas las fuentes financieras de caja del día o período seleccionado.
   */
  async loadFinancialData(filters = {}) {
    const user = authService.getCurrentUser() || {};
    const isBarbero = user.rol === 'barbero';
    const today = getTodayBogota();

    const fInicio = filters.fechaInicio || filters.fecha || today;
    const fFin = filters.fechaFin || filters.fecha || today;

    const fechaInicioISO = fInicio.includes('T') ? fInicio : `${fInicio}T00:00:00-05:00`;
    const fechaFinISO = fFin.includes('T') ? fFin : `${fFin}T23:59:59-05:00`;

    const requestFilters = {
      ...filters,
      fechaInicio: fechaInicioISO,
      fechaFin: fechaFinISO
    };

    if (isBarbero) {
      requestFilters.barberoId = user.barberoId;
    }

    // Cargar en paralelo cortes, movimientos de inventario, barberos y servicios
    const [cortesRes, kardexRes, barbRes, srvRes] = await Promise.all([
      cortesService.getHistorialCortes(requestFilters),
      inventarioService.getMovimientosKardex({
        tipo: 'salida',
        fechaInicio: fechaInicioISO,
        fechaFin: fechaFinISO
      }),
      barberosService.getBarberos(),
      serviciosService.getServicios()
    ]);

    const cortes = cortesRes?.ok && Array.isArray(cortesRes.data) ? cortesRes.data : [];
    const movimientos = kardexRes?.ok && Array.isArray(kardexRes.data) ? kardexRes.data : [];
    const barberos = barbRes?.ok && Array.isArray(barbRes.data) ? barbRes.data : [];
    const servicios = srvRes?.ok && Array.isArray(srvRes.data) ? srvRes.data : [];

    // Separar cortes activos de auditados anulados
    const activos = cortes.filter((c) => c.estado === 'activo');
    const anulados = cortes.filter((c) => c.estado === 'anulado');

    // Filtrar ventas de inventario al público
    let ventasProductos = movimientos.filter(
      (m) => m.tipo === 'salida' && m.subtipo === 'venta_publico'
    );

    // Filtrar ventas de inventario si hay filtro de método de pago
    if (filters.metodoPago && filters.metodoPago !== 'all') {
      const targetMethod = normalizePaymentMethodKey(filters.metodoPago);
      ventasProductos = ventasProductos.filter(
        (v) => normalizePaymentMethodKey(v.metodoPago) === targetMethod
      );
    }

    // Si el usuario es barbero, las ventas de producto en mostrador generales son del administrador
    if (isBarbero) {
      ventasProductos = [];
    }

    // 1. Cálculos de ingresos y comisiones (enteros en COP)
    const ingresosServiciosCop = activos.reduce((sum, c) => sum + (Number(c.precio) || 0), 0);
    const ingresosProductosCop = ventasProductos.reduce(
      (sum, p) => sum + (Number(p.valorTotalCop) || 0),
      0
    );
    const totalIngresosBrutosCop = ingresosServiciosCop + ingresosProductosCop;

    const totalComisionesCop = activos.reduce(
      (sum, c) => sum + (Number(c.comisionCalculadaCop ?? c.comisionEstimada ?? 0)),
      0
    );
    const margenSedeCop = Math.max(0, totalIngresosBrutosCop - totalComisionesCop);
    const totalAnuladosExcluidosCop = anulados.reduce((sum, c) => sum + (Number(c.precio) || 0), 0);

    // 2. Desglose exacto por método de pago normalizado (Servicios + Productos)
    const breakdown = {
      efectivo: { total: 0, count: 0, label: 'Efectivo', icon: 'payments', color: 'bg-primary' },
      nequi: { total: 0, count: 0, label: 'Nequi', icon: 'phone_iphone', color: 'bg-[#7BA3D4]' },
      daviplata: { total: 0, count: 0, label: 'Daviplata', icon: 'account_balance_wallet', color: 'bg-[#E07A7A]' },
      datafono: { total: 0, count: 0, label: 'Datáfono', icon: 'credit_card', color: 'bg-[#1F3A5F]' },
      transferencia: { total: 0, count: 0, label: 'Transferencia', icon: 'account_balance', color: 'bg-[#235D3A]' }
    };

    // Sumar servicios activos
    activos.forEach((c) => {
      const key = normalizePaymentMethodKey(c.metodoPago);
      if (breakdown[key]) {
        breakdown[key].total += Number(c.precio) || 0;
        breakdown[key].count += 1;
      }
    });

    // Sumar ventas de productos al público
    ventasProductos.forEach((p) => {
      const key = normalizePaymentMethodKey(p.metodoPago);
      if (breakdown[key]) {
        breakdown[key].total += Number(p.valorTotalCop) || 0;
        breakdown[key].count += 1;
      }
    });

    // 3. Unificar transacciones cronológicas de caja
    const transacciones = [
      ...cortes.map((c) => ({
        ...c,
        tipoTransaccion: 'servicio',
        descripcionPrincipal: c.servicioNombre,
        descripcionSecundaria: `Cliente: ${c.clienteNombre || 'Cliente Mostrador'}`,
        monto: Number(c.precio),
        esAnulado: c.estado === 'anulado',
        timestamp: new Date(c.fechaHora).getTime()
      })),
      ...ventasProductos.map((p) => {
        const fecha = new Date(p.fechaHora);
        const horaFormato = fecha.toLocaleTimeString('es-CO', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: true
        });
        return {
          id: p.id,
          registroCorteId: null,
          codigoCita: `PROD-${p.id.slice(-4).toUpperCase()}`,
          citaId: null,
          barberoId: null,
          barberoNombre: p.responsable || 'Caja Mostrador',
          sillon: 'Mostrador / POS',
          clienteNombre: 'Venta Mostrador',
          servicioNombre: `${p.cantidad}x ${p.productoNombre}`,
          descripcionPrincipal: `${p.cantidad}x ${p.productoNombre}`,
          descripcionSecundaria: `SKU: ${p.sku} · ${p.referencia || 'Venta al público'}`,
          origen: 'producto',
          precio: Number(p.valorTotalCop),
          precioCobradoCop: Number(p.valorTotalCop),
          metodoPago: p.metodoPago || 'efectivo',
          comprobante: p.metodoPago === 'efectivo' ? 'Efectivo en caja' : `Comprobante ${p.metodoPago}`,
          fechaHora: p.fechaHora,
          horaFormato,
          estado: 'activo',
          motivoAnulacion: null,
          comisionEstimada: 0,
          comisionCalculadaCop: 0,
          servicios: [],
          tipoTransaccion: 'producto',
          monto: Number(p.valorTotalCop),
          esAnulado: false,
          timestamp: fecha.getTime()
        };
      })
    ].sort((a, b) => b.timestamp - a.timestamp);

    return {
      fechaConsulta: today,
      isBarbero,
      user,
      cortes,
      activos,
      anulados,
      ventasProductos,
      transacciones,
      barberos,
      servicios,
      totales: {
        totalIngresosBrutosCop,
        ingresosServiciosCop,
        ingresosProductosCop,
        totalComisionesCop,
        margenSedeCop,
        totalAnuladosExcluidosCop,
        totalAtencionesActivas: activos.length,
        totalAtencionesAnuladas: anulados.length,
        totalCitas: activos.filter((c) => c.origen === 'cita').length,
        totalWalkIns: activos.filter((c) => c.origen === 'walk_in').length,
        totalVentasProductos: ventasProductos.length,
        totalOperaciones: activos.length + ventasProductos.length
      },
      desgloseMetodosPago: breakdown
    };
  }
};
