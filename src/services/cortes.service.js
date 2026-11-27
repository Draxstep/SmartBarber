/**
 * SmartBarber - Servicio de Cortes & Caja POS (100% Producción Real)
 * Registro de cortes walk-in, conversión 1:1 de cita, anulación auditada y liquidación (CU-004 a CU-008).
 */

import { httpClient, ValidationError, NetworkError } from './http-client.js';
import { encolarCambio } from '../pwa/sync.js';
import { emitDataMutation } from '../utils/event-bus.js';
import { getTodayBogota } from '../utils/formatters.js';

export function normalizePaymentMethodEnum(m) {
  if (!m) return 'efectivo';
  const val = String(m).toLowerCase().trim();
  if (val === 'datafono' || val === 'tarjeta') return 'tarjeta_debito_credito';
  if (val === 'transferencia') return 'transferencia_bancaria';
  return val;
}

function normalizeCorte(c) {
  if (!c) return null;
  const id = c.registroCorteId || c.id;
  const fecha = c.fechaHoraAtencion ? new Date(c.fechaHoraAtencion) : new Date();
  const horaStr = fecha.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', hour12: true });

  const servicioNombre = Array.isArray(c.servicios) && c.servicios.length > 0
    ? c.servicios.map(s => s.nombreServicioSnapshot || s.nombre).join(' + ')
    : (c.servicioNombre || 'Servicio Barbería');

  return {
    id,
    registroCorteId: id,
    codigoCita: c.citaId ? `SB-${c.citaId.slice(-6).toUpperCase()}` : `WK-${id.slice(-4).toUpperCase()}`,
    citaId: c.citaId || null,
    barberoId: c.barberoId,
    barberoNombre: c.barberoNombre || 'Barbero',
    sillon: c.sillon || 'Sillón 01',
    clienteNombre: c.nombreClienteReferencial || c.clienteNombre || 'Cliente Mostrador',
    servicioNombre,
    origen: (c.origen === 'cita') ? 'cita' : 'walk_in',
    precio: Number(c.precioCobradoCop ?? c.precio ?? 0),
    precioCalculadoCop: Number(c.precioCalculadoCop ?? c.precioCobradoCop ?? 0),
    precioCobradoCop: Number(c.precioCobradoCop ?? c.precio ?? 0),
    metodoPago: c.metodoPago || 'efectivo',
    comprobante: c.metodoPago === 'efectivo' ? 'Efectivo en caja' : `Comprobante ${c.metodoPago}`,
    fechaHora: c.fechaHoraAtencion || new Date().toISOString(),
    horaFormato: horaStr,
    estado: c.estado || 'activo',
    motivoAnulacion: c.motivoAnulacion || null,
    comisionEstimada: Number(c.comisionCalculadaCop ?? 0),
    comisionCalculadaCop: Number(c.comisionCalculadaCop ?? 0),
    servicios: c.servicios || []
  };
}

export const cortesService = {
  /**
   * Registra un corte sin cita (Walk-in) o convierte cita a corte (CU-004, CU-005).
   */
  async registrarCorte(datos) {
    const metodoPagoNormalizado = normalizePaymentMethodEnum(datos.metodoPago);

    // Si no hay conexión a internet, encolar en Outbox para Background Sync (CU-004, CU-005)
    if (!navigator.onLine) {
      if (datos.citaId) {
        const payload = {
          citaId: datos.citaId,
          servicioIds: datos.servicioIds || undefined,
          metodoPago: metodoPagoNormalizado,
          precioCobradoCop: datos.precioCobradoCop !== undefined ? Number(datos.precioCobradoCop) : (datos.precio ? Number(datos.precio) : undefined),
          notas: datos.notas || null
        };
        await encolarCambio('COMPLETAR_CITA', payload);
        emitDataMutation('cortes', 'create');
        return {
          ok: true,
          success: true,
          offline: true,
          data: normalizeCorte({
            id: crypto.randomUUID(),
            citaId: datos.citaId,
            barberoId: datos.barberoId,
            precioCobradoCop: payload.precioCobradoCop || 25000,
            metodoPago: payload.metodoPago,
            fechaHoraAtencion: new Date().toISOString()
          })
        };
      } else {
        let servicioIds = datos.servicioIds;
        if (!servicioIds && datos.servicioId) {
          servicioIds = [datos.servicioId];
        }
        if (!servicioIds || servicioIds.length === 0) {
          throw new ValidationError('Debe seleccionar al menos un servicio para registrar el corte.');
        }
        const payload = {
          barberoId: datos.barberoId || undefined,
          servicioIds,
          metodoPago: metodoPagoNormalizado,
          precioCobradoCop: datos.precioCobradoCop ? Number(datos.precioCobradoCop) : (datos.precio ? Number(datos.precio) : 25000),
          nombreCliente: datos.clienteNombre || datos.nombreCliente || 'Cliente Mostrador',
          notas: datos.notas || null
        };
        await encolarCambio('CREAR_CORTE_WALKIN', payload);
        emitDataMutation('cortes', 'create');
        return {
          ok: true,
          success: true,
          offline: true,
          data: normalizeCorte({
            id: crypto.randomUUID(),
            origen: 'walk_in',
            barberoId: payload.barberoId,
            precioCobradoCop: payload.precioCobradoCop,
            metodoPago: payload.metodoPago,
            nombreClienteReferencial: payload.nombreCliente,
            fechaHoraAtencion: new Date().toISOString()
          })
        };
      }
    }

    // Si viene vinculado a una cita, usar endpoint de conversión 1:1
    if (datos.citaId) {
      const payload = {
        servicioIds: datos.servicioIds || undefined,
        metodoPago: metodoPagoNormalizado,
        precioCobradoCop: datos.precioCobradoCop !== undefined ? Number(datos.precioCobradoCop) : (datos.precio ? Number(datos.precio) : undefined),
        notas: datos.notas || null
      };

      const response = await httpClient.post(`/cortes/convertir-cita/${datos.citaId}`, payload);
      emitDataMutation('cortes', 'create');
      emitDataMutation('citas', 'update');
      if (response?.data) {
        return { ok: true, success: true, data: normalizeCorte(response.data) };
      }
      return response;
    }

    // Registro Walk-in
    let servicioIds = datos.servicioIds;
    if (!servicioIds && datos.servicioId) {
      servicioIds = [datos.servicioId];
    }

    if (!servicioIds || servicioIds.length === 0) {
      throw new ValidationError('Debe seleccionar al menos un servicio para registrar el corte.');
    }

    const payload = {
      barberoId: datos.barberoId || undefined,
      servicioIds,
      metodoPago: metodoPagoNormalizado,
      precioCobradoCop: datos.precioCobradoCop ? Number(datos.precioCobradoCop) : (datos.precio ? Number(datos.precio) : undefined),
      nombreCliente: datos.clienteNombre || datos.nombreCliente || null,
      notas: datos.notas || null
    };

    const response = await httpClient.post('/cortes/walk-in', payload);
    emitDataMutation('cortes', 'create');
    if (response?.data) {
      return { ok: true, success: true, data: normalizeCorte(response.data) };
    }
    return response;
  },

  /**
   * Consulta el historial diario de cortes y arqueo de caja (CU-006, CU-007).
   */
  async getHistorialCortes(filtros = {}) {
    const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Bogota' }).format(new Date());
    const query = new URLSearchParams();

    const fInicio = filtros.fechaInicio || filtros.fecha || today;
    const fFin = filtros.fechaFin || filtros.fecha || today;

    query.append('fechaInicio', fInicio.includes('T') ? fInicio : `${fInicio}T00:00:00-05:00`);
    query.append('fechaFin', fFin.includes('T') ? fFin : `${fFin}T23:59:59-05:00`);

    if (filtros.barberoId && filtros.barberoId !== 'all') {
      query.append('barberoId', filtros.barberoId);
    }
    if (filtros.estado && filtros.estado !== 'all') {
      query.append('estado', filtros.estado);
    }

    const response = await httpClient.get(`/cortes/historial?${query.toString()}`);

    if (response?.data && Array.isArray(response.data)) {
      let list = response.data.map(normalizeCorte);

      if (filtros.metodoPago && filtros.metodoPago !== 'all') {
        list = list.filter(c => c.metodoPago === filtros.metodoPago);
      }
      if (filtros.origen && filtros.origen !== 'all') {
        const targetOrigen = (filtros.origen === 'walk-in' || filtros.origen === 'walk_in') ? 'walk_in' : filtros.origen;
        list = list.filter(c => c.origen === targetOrigen);
      }
      if (filtros.search) {
        const q = filtros.search.toLowerCase().trim();
        list = list.filter(c =>
          c.id.toLowerCase().includes(q) ||
          c.clienteNombre.toLowerCase().includes(q) ||
          c.barberoNombre.toLowerCase().includes(q) ||
          c.servicioNombre.toLowerCase().includes(q)
        );
      }

      return { ok: true, success: true, data: list };
    }

    return response;
  },

  /**
   * Resumen de ingresos y desglose por los 5 métodos de pago (CU-007).
   */
  async getResumenIngresos({ fechaInicio, fechaFin, barberoId } = {}) {
    const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Bogota' }).format(new Date());
    const fInicio = fechaInicio || today;
    const fFin = fechaFin || today;
    const query = new URLSearchParams({
      fechaInicio: fInicio.includes('T') ? fInicio : `${fInicio}T00:00:00-05:00`,
      fechaFin: fFin.includes('T') ? fFin : `${fFin}T23:59:59-05:00`
    });

    if (barberoId && barberoId !== 'all') {
      query.append('barberoId', barberoId);
    }

    const response = await httpClient.get(`/cortes/resumen?${query.toString()}`);
    return response;
  },

  /**
   * Anulación auditada de un registro de corte (CU-008, RF-COR-05).
   * Requiere motivo obligatorio >= 10 caracteres y rol de Administrador.
   */
  async anularCorte(corteId, { motivo = '' } = {}) {
    if (!navigator.onLine) {
      throw new NetworkError('La anulación auditada de un corte requiere conexión obligatoria al servidor (CU-008).');
    }

    if (!motivo || motivo.trim().length < 10) {
      throw new ValidationError('El motivo de anulación es obligatorio y debe tener al menos 10 caracteres (RF-COR-05).');
    }

    const response = await httpClient.patch(`/cortes/${corteId}/anular`, {
      motivoAnulacion: motivo.trim(),
      revertirEstadoCita: false
    });

    emitDataMutation('cortes', 'delete');
    if (response?.data) {
      return { ok: true, success: true, data: normalizeCorte(response.data) };
    }
    return response;
  },

  /**
   * Liquidación referencial de comisiones por barbero (CU-013, RF-BAR-05).
   */
  async getLiquidacionComisiones({ barberoId = 'all', fechaInicio, fechaFin } = {}) {
    const today = getTodayBogota();
    const query = new URLSearchParams({
      fechaInicio: fechaInicio || today,
      fechaFin: fechaFin || today
    });

    if (barberoId && barberoId !== 'all') {
      query.append('barberoId', barberoId);
    }

    const response = await httpClient.get(`/barberos/liquidaciones?${query.toString()}`);

    if (response?.data) {
      const d = response.data;
      const barberosArr = Array.isArray(d.barberos) ? d.barberos.map(b => ({
        barberoId: b.barberoId,
        barberoNombre: b.nombreCompleto || b.nombrePublico || 'Barbero',
        sillon: b.sillon || 'Sillón',
        totalCortes: Number(b.totalCortesRealizados || 0),
        totalRecaudado: Number(b.totalCobradoCop || 0),
        porcentajeComision: Number(b.porcentajeComision || 50),
        comisionTotal: Number(b.comisionTotalCop || 0)
      })) : [];

      return {
        ok: true,
        success: true,
        data: {
          periodo: { fechaInicio, fechaFin, semana: 47, anio: 2026 },
          totalCortes: Number(d.resumenGeneral?.totalCortes || 0),
          totalRecaudado: Number(d.resumenGeneral?.ingresoTotalCop || 0),
          porcentajeReferencial: 50,
          comisionTotal: Number(d.resumenGeneral?.comisionesTotalesCop || 0),
          barberos: barberosArr,
          cortesDetalle: []
        }
      };
    }

    return response;
  },

  async getDashboardKpis(fecha = null) {
    const url = `/cortes/dashboard-kpis${fecha ? `?fecha=${fecha}` : ''}`;
    return await httpClient.get(url);
  }
};
