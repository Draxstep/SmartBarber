/**
 * SmartBarber - Servicio de Agendamiento de Citas (100% Producción Real)
 * Disponibilidad discreta de 30 min, reserva pública y gestión de agenda en Backoffice (CU-021 a CU-025).
 */

import { httpClient, ConflictError, ValidationError, NetworkError } from './http-client.js';
import { encolarCambio } from '../pwa/sync.js';
import { emitDataMutation } from '../utils/event-bus.js';
import { getTodayBogota } from '../utils/formatters.js';

function normalizeCitaConsulta(d) {
  const servicios = Array.isArray(d.servicios) ? d.servicios : [];
  const precioServicios = servicios.reduce(
    (sum, s) => sum + Number(s.precioCopSnapshot ?? s.precioCop ?? s.precio ?? 0),
    0
  );
  const precioCop = Number(d.precioEstimadoCop ?? d.precio ?? precioServicios) || 0;
  const serviceName = servicios.length > 0
    ? servicios.map(s => s.nombreServicioSnapshot || s.nombre).join(' + ')
    : 'Servicio Reservado';

  return {
    id: d.codigoReserva,
    codigo: d.codigoReserva,
    codigoReserva: d.codigoReserva,
    fecha: d.fecha,
    timeStart: d.horaInicio?.slice(0, 5) || '',
    timeEnd: d.horaFin?.slice(0, 5) || '',
    horaInicio: d.horaInicio?.slice(0, 5) || '',
    horaFin: d.horaFin?.slice(0, 5) || '',
    status: d.estado,
    estado: d.estado,
    clientName: d.clienteNombre || d.cliente?.nombre || 'Cliente',
    clientPhone: d.clienteTelefono || d.cliente?.telefono || '',
    barberName: d.barberoNombre || d.barbero?.nombre || 'Barbero Asignado',
    price: precioCop,
    precio: precioCop,
    precioEstimadoCop: precioCop,
    serviceName,
    servicios
  };
}

export const citasService = {
  /**
   * Consulta los bloques horarios de 30 minutos disponibles en tiempo real (CU-025).
   * Conecta con /api/v1/public/disponibilidad.
   */
  async getDisponibilidad({ fecha, barberoId, duracionBloques = 1, servicioIds, duracionMinutos } = {}) {
    const rawBloques = Number(duracionBloques) || (duracionMinutos ? Math.ceil(duracionMinutos / 30) : 1);
    const bloques = Math.max(1, rawBloques);
    const hoyBogota = getTodayBogota();
    const query = new URLSearchParams({
      fecha: fecha || hoyBogota,
      duracionBloques: bloques
    });

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (barberoId && barberoId !== 'any' && barberoId !== 'cualquiera' && uuidRegex.test(barberoId)) {
      query.append('barberoId', barberoId);
    }
    if (servicioIds) {
      const rawList = Array.isArray(servicioIds) ? servicioIds : String(servicioIds).split(',');
      const validIds = rawList.map(id => String(id).trim()).filter(id => uuidRegex.test(id));
      if (validIds.length > 0) {
        query.append('servicioIds', validIds.join(','));
      }
    }

    const response = await httpClient.get(`/public/disponibilidad?${query.toString()}`);

    if (response?.data) {
      const slotsDisponibles = Array.isArray(response.data.horariosDisponibles)
        ? response.data.horariosDisponibles
        : (Array.isArray(response.data.slotsDisponibles) ? response.data.slotsDisponibles : []);
      const porBarbero = response.data.porBarbero || {};
      const allSlots = [
        '08:00', '08:30', '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
        '12:00', '12:30', '13:00', '13:30', '14:00', '14:30', '15:00', '15:30',
        '16:00', '16:30', '17:00', '17:30', '18:00', '18:30', '19:00', '19:30'
      ];

      const slots = allSlots.map((time) => {
        const isDisponible = slotsDisponibles.includes(time);
        return {
          time,
          horaInicio: time,
          disponible: isDisponible,
          status: isDisponible ? 'available' : 'occupied',
          motivoOcupado: isDisponible ? null : 'Horario no disponible'
        };
      });

      return {
        ok: true,
        success: true,
        data: {
          ...response.data,
          horariosDisponibles: slotsDisponibles,
          slotsDisponibles,
          porBarbero,
          slots
        }
      };
    }

    return response;
  },

  /**
   * Crea una reserva en línea desde el Portal Público (CU-021).
   * Conecta con POST /api/v1/public/reservar y maneja concurrencia GiST (HTTP 409).
   */
  async crearCita(datos) {
    // Extraer y normalizar servicios
    let servicioIds = datos.servicioIds;
    if (!servicioIds && datos.servicioId) {
      servicioIds = [datos.servicioId];
    }
    if (!servicioIds || servicioIds.length === 0) {
      throw new ValidationError('Debe seleccionar al menos un servicio del catálogo.');
    }

    // Normalizar cliente y teléfono de Colombia (10 dígitos comenzando con 3)
    const rawTel = (datos.cliente?.telefono || datos.telefono || '').replace(/\D/g, '');
    const cleanTel = rawTel.length === 12 && rawTel.startsWith('57') ? rawTel.slice(2) : rawTel;

    const nombreCompleto = (datos.cliente?.nombreCompleto || datos.cliente?.nombre || datos.nombreCliente || '').trim();
    if (!nombreCompleto || nombreCompleto.length < 3) {
      throw new ValidationError('El nombre debe tener al menos 3 caracteres.');
    }

    const correo = (datos.cliente?.correo || datos.cliente?.email || datos.correo || `${cleanTel}@smartbarber.local`).trim().toLowerCase();

    const barberoId = (datos.barberoId && datos.barberoId !== 'any' && datos.barberoId !== 'cualquiera')
      ? datos.barberoId
      : null;

    const payload = {
      sedeId: datos.sedeId || undefined,
      servicioIds,
      barberoId,
      fecha: datos.fecha,
      horaInicio: datos.horaInicio ? `${datos.horaInicio.slice(0, 5)}:00` : undefined,
      cliente: {
        nombreCompleto,
        telefono: cleanTel,
        correo,
        aceptoPoliticaDatos: true
      },
      notasCliente: (datos.notasCliente || datos.notas || '').trim() || null
    };

    try {
      const response = await httpClient.post('/public/reservar', payload);

      if (response?.data) {
        const d = response.data;
        const normalized = {
          ...d,
          id: d.codigoReserva || d.citaId,
          codigo: d.codigoReserva,
          codigoReserva: d.codigoReserva,
          chairIndex: 0,
          barberId: d.barbero?.id || barberoId,
          barberName: d.barbero?.nombre || 'Barbero Asignado',
          fecha: d.fecha,
          timeStart: d.horaInicio,
          timeEnd: d.horaFin,
          clientName: d.cliente?.nombre || nombreCompleto,
          clientPhone: d.cliente?.telefono || cleanTel,
          price: d.precioEstimadoCop,
          status: d.estado || 'pendiente'
        };
        emitDataMutation('citas', 'create');
        return { ok: true, success: true, data: normalized };
      }

      return response;
    } catch (err) {
      if (err.status === 409) {
        throw new ConflictError(
          'El horario seleccionado acaba de ser reservado por otro cliente. Por favor elige otro bloque de 30 minutos.',
          err.details
        );
      }
      throw err;
    }
  },

  /**
   * Consulta pública de estado de reserva por código Crockford Base32 (RF-AGE-06).
   */
  async consultarCita(codigo, telefono = '') {
    const codeClean = (codigo || '').toUpperCase().trim();
    if (!codeClean) {
      throw new ValidationError('Por favor ingrese un código de reserva válido (ej: SB-XXXXXX).');
    }

    const response = await httpClient.get(`/public/reservas/${codeClean}`);

    if (response?.data) {
      return { ok: true, success: true, data: normalizeCitaConsulta(response.data) };
    }

    return response;
  },

  /**
   * Cancelación de cita por parte del cliente en el portal público (RF-AGE-06).
   */
  async cancelarCitaPublica(codigo, motivo = '') {
    const codeClean = (codigo || '').toUpperCase().trim();
    const response = await httpClient.patch(`/public/reservas/${codeClean}/cancelar`, { motivo });
    emitDataMutation('citas', 'update');
    return response;
  },

  /**
   * Consulta la agenda diaria en el Backoffice (CU-022, RBAC 'P' barbero / 'G' admin).
   */
  async getCitasDelDia(fecha = '2026-11-20', barberoId = null) {
    const query = new URLSearchParams({ fecha });
    if (barberoId && barberoId !== 'all') {
      query.append('barberoId', barberoId);
    }

    const response = await httpClient.get(`/citas/agenda?${query.toString()}`);

    if (response?.data) {
      const rawCitas = response.data.citas || [];
      const list = rawCitas.map((c, idx) => ({
        id: c.citaId,
        citaId: c.citaId,
        codigo: c.codigoReserva,
        chairIndex: idx % 3,
        barberId: c.barberoId,
        barberoId: c.barberoId,
        barberName: c.barberoNombre || 'Barbero',
        fecha: c.fecha,
        timeStart: c.horaInicio?.slice(0, 5),
        timeEnd: c.horaFin?.slice(0, 5),
        horaInicio: c.horaInicio?.slice(0, 5),
        horaFin: c.horaFin?.slice(0, 5),
        clientName: c.clienteNombre || 'Cliente',
        clientPhone: c.clienteTelefono || '',
        serviceName: Array.isArray(c.servicios) ? c.servicios.map(s => s.nombreServicioSnapshot).join(' + ') : 'Corte Clásico',
        price: c.precioEstimadoCop,
        durationMinutes: (c.bloquesTotales || 1) * 30,
        durationBlocks: c.bloquesTotales || 1,
        status: c.estado,
        estado: c.estado,
        servicios: c.servicios || []
      }));

      return {
        ok: true,
        success: true,
        data: list,
        agendaMeta: response.data
      };
    }

    return response;
  },

  /**
   * Actualiza el estado de una cita en el Backoffice (CU-023).
   */
  async cambiarEstadoCita(citaId, nuevoEstado, motivo = '') {
    const payload = {
      nuevoEstado,
      observacion: motivo || null,
      motivoCancelacion: nuevoEstado === 'cancelada' ? (motivo || 'Cancelada por el usuario') : null
    };

    if (!navigator.onLine) {
      await encolarCambio('CAMBIAR_ESTADO_CITA', { citaId, ...payload });
      emitDataMutation('citas', 'update');
      return {
        ok: true,
        success: true,
        offline: true,
        data: { citaId, estado: nuevoEstado }
      };
    }

    const response = await httpClient.patch(`/citas/${citaId}/estado`, payload);
    emitDataMutation('citas', 'update');
    return response;
  }
};
