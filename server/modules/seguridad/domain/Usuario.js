/**
 * @file Usuario.js
 * @description Entidad de Dominio que representa un Usuario del Backoffice (RBAC y seguridad).
 */
import { EstadoRegistro, RolUsuario } from '../../../../shared/contracts/enums.js';

export class Usuario {
  /**
   * @param {object} params
   * @param {string} params.usuarioId
   * @param {string} params.sedeId
   * @param {string} params.correo
   * @param {string} params.contrasenaHash
   * @param {string} params.rol
   * @param {string} [params.estado=EstadoRegistro.ACTIVO]
   * @param {number} [params.intentosFallidos=0]
   * @param {Date|null} [params.bloqueadoHasta=null]
   * @param {Date|null} [params.ultimoAccesoEn=null]
   * @param {Date} [params.creadoEn]
   * @param {Date} [params.actualizadoEn]
   */
  constructor({
    usuarioId,
    sedeId,
    correo,
    contrasenaHash,
    rol,
    estado = EstadoRegistro.ACTIVO,
    intentosFallidos = 0,
    bloqueadoHasta = null,
    ultimoAccesoEn = null,
    creadoEn = new Date(),
    actualizadoEn = new Date()
  }) {
    this.usuarioId = usuarioId;
    this.sedeId = sedeId;
    this.correo = correo?.toLowerCase().trim();
    this.contrasenaHash = contrasenaHash;
    this.rol = rol;
    this.estado = estado;
    this.intentosFallidos = intentosFallidos;
    this.bloqueadoHasta = bloqueadoHasta ? new Date(bloqueadoHasta) : null;
    this.ultimoAccesoEn = ultimoAccesoEn ? new Date(ultimoAccesoEn) : null;
    this.creadoEn = creadoEn instanceof Date ? creadoEn : new Date(creadoEn);
    this.actualizadoEn = actualizadoEn instanceof Date ? actualizadoEn : new Date(actualizadoEn);
  }

  isActivo() {
    return this.estado === EstadoRegistro.ACTIVO;
  }

  isAdministrador() {
    return this.rol === RolUsuario.ADMINISTRADOR;
  }

  isBarbero() {
    return this.rol === RolUsuario.BARBERO;
  }

  /**
   * Comprueba si la cuenta está temporalmente bloqueada por exceso de intentos fallidos
   * @param {Date} [ahora=new Date()]
   * @returns {boolean}
   */
  isBloqueado(ahora = new Date()) {
    if (!this.bloqueadoHasta) return false;
    return this.bloqueadoHasta.getTime() > ahora.getTime();
  }
}
