/**
 * @file NotificacionCorreo.js
 * @description Registro en cola Outbox para envío confiable de confirmaciones de cita por correo.
 */
import { EstadoNotificacion } from '../../../../shared/contracts/enums.js';

export class NotificacionCorreo {
  /**
   * @param {object} params
   * @param {string} params.notificacionId
   * @param {string} params.sedeId
   * @param {string} params.citaId
   * @param {string} params.correoDestino
   * @param {string} params.asunto
   * @param {string} [params.estado=EstadoNotificacion.PENDIENTE]
   * @param {number} [params.intentos=0]
   * @param {string|null} [params.ultimoError=null]
   * @param {Date|null} [params.proximoReintentoEn=null]
   * @param {Date|null} [params.enviadaEn=null]
   * @param {Date} [params.creadoEn]
   * @param {Date} [params.actualizadoEn]
   */
  constructor({
    notificacionId,
    sedeId,
    citaId,
    correoDestino,
    asunto,
    estado = EstadoNotificacion.PENDIENTE,
    intentos = 0,
    ultimoError = null,
    proximoReintentoEn = new Date(),
    enviadaEn = null,
    creadoEn = new Date(),
    actualizadoEn = new Date()
  }) {
    this.notificacionId = notificacionId;
    this.sedeId = sedeId;
    this.citaId = citaId;
    this.correoDestino = correoDestino?.toLowerCase().trim();
    this.asunto = asunto;
    this.estado = estado;
    this.intentos = Number(intentos);
    this.ultimoError = ultimoError;
    this.proximoReintentoEn = proximoReintentoEn ? new Date(proximoReintentoEn) : null;
    this.enviadaEn = enviadaEn ? new Date(enviadaEn) : null;
    this.creadoEn = creadoEn instanceof Date ? creadoEn : new Date(creadoEn);
    this.actualizadoEn = actualizadoEn instanceof Date ? actualizadoEn : new Date(actualizadoEn);
  }
}
