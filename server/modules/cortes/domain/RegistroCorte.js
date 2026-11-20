/**
 * @file RegistroCorte.js
 * @description Entidad de Dominio que representa un Registro de Corte y atención en caja.
 */
import { OrigenCorte, EstadoCorte, MetodoPago } from '../../../../shared/contracts/enums.js';

export class RegistroCorte {
  /**
   * @param {object} params
   * @param {string} params.registroCorteId
   * @param {string} params.sedeId
   * @param {string|null} [params.citaId=null]
   * @param {string} params.barberoId
   * @param {string|null} [params.clienteId=null]
   * @param {string|null} [params.nombreClienteReferencial=null]
   * @param {string} params.origen
   * @param {Date} [params.fechaHoraAtencion]
   * @param {number} params.precioCalculadoCop
   * @param {number} params.precioCobradoCop
   * @param {string} params.metodoPago
   * @param {number} [params.porcentajeComisionSnapshot=0.00]
   * @param {number} [params.comisionCalculadaCop=0]
   * @param {string|null} [params.notas=null]
   * @param {string} [params.estado=EstadoCorte.ACTIVO]
   * @param {string|null} [params.motivoAnulacion=null]
   * @param {string|null} [params.anuladoPorUsuarioId=null]
   * @param {Date|null} [params.anuladoEn=null]
   * @param {string} params.registradoPorUsuarioId
   * @param {Date} [params.creadoEn]
   * @param {Date} [params.actualizadoEn]
   * @param {Array<import('./RegistroCorteServicio.js').RegistroCorteServicio>} [params.servicios=[]]
   */
  constructor({
    registroCorteId,
    sedeId,
    citaId = null,
    barberoId,
    clienteId = null,
    nombreClienteReferencial = null,
    origen,
    fechaHoraAtencion = new Date(),
    precioCalculadoCop,
    precioCobradoCop,
    metodoPago,
    porcentajeComisionSnapshot = 0.00,
    comisionCalculadaCop = 0,
    notas = null,
    estado = EstadoCorte.ACTIVO,
    motivoAnulacion = null,
    anuladoPorUsuarioId = null,
    anuladoEn = null,
    registradoPorUsuarioId,
    creadoEn = new Date(),
    actualizadoEn = new Date(),
    servicios = []
  }) {
    this.registroCorteId = registroCorteId;
    this.sedeId = sedeId;
    this.citaId = citaId;
    this.barberoId = barberoId;
    this.clienteId = clienteId;
    this.nombreClienteReferencial = nombreClienteReferencial;
    this.origen = origen;
    this.fechaHoraAtencion = fechaHoraAtencion instanceof Date ? fechaHoraAtencion : new Date(fechaHoraAtencion);
    this.precioCalculadoCop = Math.round(Number(precioCalculadoCop));
    this.precioCobradoCop = Math.round(Number(precioCobradoCop));
    this.metodoPago = metodoPago;
    this.porcentajeComisionSnapshot = Number(porcentajeComisionSnapshot);
    this.comisionCalculadaCop = Math.round(Number(comisionCalculadaCop));
    this.notas = notas;
    this.estado = estado;
    this.motivoAnulacion = motivoAnulacion;
    this.anuladoPorUsuarioId = anuladoPorUsuarioId;
    this.anuladoEn = anuladoEn ? new Date(anuladoEn) : null;
    this.registradoPorUsuarioId = registradoPorUsuarioId;
    this.creadoEn = creadoEn instanceof Date ? creadoEn : new Date(creadoEn);
    this.actualizadoEn = actualizadoEn instanceof Date ? actualizadoEn : new Date(actualizadoEn);
    this.servicios = servicios;
  }

  isActivo() {
    return this.estado === EstadoCorte.ACTIVO;
  }

  isAnulado() {
    return this.estado === EstadoCorte.ANULADO;
  }
}
