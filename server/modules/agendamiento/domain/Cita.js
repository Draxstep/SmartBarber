/**
 * @file Cita.js
 * @description Entidad de Dominio que representa una Cita de Agendamiento en SmartBarber.
 */
import { EstadoCita, OrigenCita } from '../../../../shared/contracts/enums.js';

export class Cita {
  /**
   * @param {object} params
   * @param {string} params.citaId
   * @param {string} params.sedeId
   * @param {string} params.codigoReserva
   * @param {string} params.clienteId
   * @param {string} params.barberoId
   * @param {boolean} [params.barberoAsignadoAutomaticamente=false]
   * @param {string} params.fecha
   * @param {string} params.horaInicio
   * @param {string} params.horaFin
   * @param {Date} params.inicioEn
   * @param {Date} params.finEn
   * @param {number} params.bloquesTotales
   * @param {number} params.precioEstimadoCop
   * @param {string} [params.estado=EstadoCita.PENDIENTE]
   * @param {string|null} [params.notasCliente=null]
   * @param {string|null} [params.motivoCancelacion=null]
   * @param {string} [params.origen=OrigenCita.LANDING]
   * @param {string|null} [params.creadoPorUsuarioId=null]
   * @param {Date} [params.creadoEn]
   * @param {Date} [params.actualizadoEn]
   * @param {Array<import('./CitaServicio.js').CitaServicio>} [params.servicios=[]]
   */
  constructor({
    citaId,
    sedeId,
    codigoReserva,
    clienteId,
    barberoId,
    barberoAsignadoAutomaticamente = false,
    fecha,
    horaInicio,
    horaFin,
    inicioEn,
    finEn,
    bloquesTotales,
    precioEstimadoCop,
    estado = EstadoCita.PENDIENTE,
    notasCliente = null,
    motivoCancelacion = null,
    origen = OrigenCita.LANDING,
    creadoPorUsuarioId = null,
    creadoEn = new Date(),
    actualizadoEn = new Date(),
    servicios = [],
    clienteNombre = null,
    clienteTelefono = null,
    clienteCorreo = null,
    barberoNombre = null
  }) {
    this.citaId = citaId;
    this.sedeId = sedeId;
    this.codigoReserva = codigoReserva;
    this.clienteId = clienteId;
    this.barberoId = barberoId;
    this.barberoAsignadoAutomaticamente = Boolean(barberoAsignadoAutomaticamente);
    this.fecha = fecha;
    this.horaInicio = horaInicio;
    this.horaFin = horaFin;
    this.inicioEn = inicioEn instanceof Date ? inicioEn : new Date(inicioEn);
    this.finEn = finEn instanceof Date ? finEn : new Date(finEn);
    this.bloquesTotales = Number(bloquesTotales);
    this.precioEstimadoCop = Math.round(Number(precioEstimadoCop));
    this.estado = estado;
    this.notasCliente = notasCliente;
    this.motivoCancelacion = motivoCancelacion;
    this.origen = origen;
    this.creadoPorUsuarioId = creadoPorUsuarioId;
    this.creadoEn = creadoEn instanceof Date ? creadoEn : new Date(creadoEn);
    this.actualizadoEn = actualizadoEn instanceof Date ? actualizadoEn : new Date(actualizadoEn);
    this.servicios = servicios;
    this.clienteNombre = clienteNombre;
    this.clienteTelefono = clienteTelefono;
    this.clienteCorreo = clienteCorreo;
    this.barberoNombre = barberoNombre;
  }

  isActiva() {
    return this.estado === EstadoCita.PENDIENTE || this.estado === EstadoCita.CONFIRMADA;
  }

  isCompletada() {
    return this.estado === EstadoCita.COMPLETADA;
  }

  isCancelada() {
    return this.estado === EstadoCita.CANCELADA;
  }
}
