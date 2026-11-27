/**
 * @file Barbero.js
 * @description Entidad de Dominio que representa un Barbero en SmartBarber.
 */
import { EstadoRegistro } from '../../../../shared/contracts/enums.js';

export class Barbero {
  /**
   * @param {object} params
   * @param {string} params.barberoId
   * @param {string} params.sedeId
   * @param {string|null} [params.usuarioId=null]
   * @param {string} params.nombreCompleto
   * @param {string|null} [params.nombrePublico=null]
   * @param {string} params.telefono
   * @param {string} params.correo
   * @param {string|null} [params.fotoUrl=null]
   * @param {string|null} [params.biografiaBreve=null]
   * @param {number|null} [params.porcentajeComision=null]
   * @param {string} [params.estado=EstadoRegistro.ACTIVO]
   * @param {Date} [params.creadoEn]
   * @param {Date} [params.actualizadoEn]
   */
  constructor({
    barberoId,
    sedeId,
    usuarioId = null,
    nombreCompleto,
    nombrePublico = null,
    telefono,
    correo,
    fotoUrl = null,
    biografiaBreve = null,
    porcentajeComision = null,
    estado = EstadoRegistro.ACTIVO,
    creadoEn = new Date(),
    actualizadoEn = new Date()
  }) {
    this.barberoId = barberoId;
    this.sedeId = sedeId;
    this.usuarioId = usuarioId;
    this.nombreCompleto = nombreCompleto;
    this.nombrePublico = nombrePublico || nombreCompleto;
    this.telefono = telefono;
    this.correo = correo?.toLowerCase().trim();
    this.fotoUrl = fotoUrl;
    this.biografiaBreve = biografiaBreve;
    this.porcentajeComision = porcentajeComision !== null ? Number(porcentajeComision) : null;
    this.estado = estado;
    this.creadoEn = creadoEn instanceof Date ? creadoEn : new Date(creadoEn);
    this.actualizadoEn = actualizadoEn instanceof Date ? actualizadoEn : new Date(actualizadoEn);
  }

  isActivo() {
    return this.estado === EstadoRegistro.ACTIVO;
  }
}
