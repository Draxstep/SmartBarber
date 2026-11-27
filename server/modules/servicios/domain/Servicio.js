/**
 * @file Servicio.js
 * @description Entidad de Dominio que representa un Servicio en el catálogo de SmartBarber.
 */
import { EstadoRegistro } from '../../../../shared/contracts/enums.js';

export class Servicio {
  /**
   * @param {object} params
   * @param {string} params.servicioId
   * @param {string} params.sedeId
   * @param {string} params.nombre
   * @param {string|null} [params.descripcionBreve=null]
   * @param {number} params.precioCop
   * @param {number} [params.duracionBloques=1]
   * @param {boolean} [params.visiblePublico=true]
   * @param {string} [params.estado=EstadoRegistro.ACTIVO]
   * @param {number} [params.ordenVisual=0]
   * @param {Date} [params.creadoEn]
   * @param {Date} [params.actualizadoEn]
   */
  constructor({
    servicioId,
    sedeId,
    nombre,
    descripcionBreve = null,
    precioCop,
    duracionBloques = 1,
    visiblePublico = true,
    estado = EstadoRegistro.ACTIVO,
    ordenVisual = 0,
    creadoEn = new Date(),
    actualizadoEn = new Date()
  }) {
    this.servicioId = servicioId;
    this.sedeId = sedeId;
    this.nombre = nombre;
    this.descripcionBreve = descripcionBreve;
    this.precioCop = Math.round(Number(precioCop)); // COP entero sin decimales
    this.duracionBloques = Number(duracionBloques); // 1 a 6 bloques de 30 min
    this.visiblePublico = Boolean(visiblePublico);
    this.estado = estado;
    this.ordenVisual = Number(ordenVisual);
    this.creadoEn = creadoEn instanceof Date ? creadoEn : new Date(creadoEn);
    this.actualizadoEn = actualizadoEn instanceof Date ? actualizadoEn : new Date(actualizadoEn);
  }

  isActivo() {
    return this.estado === EstadoRegistro.ACTIVO;
  }

  /**
   * Duración en minutos calculada a partir de los bloques discretos de 30 min
   * @returns {number}
   */
  get duracionMinutos() {
    return this.duracionBloques * 30;
  }
}
