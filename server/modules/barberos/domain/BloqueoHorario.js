/**
 * @file BloqueoHorario.js
 * @description Entidad de Dominio para bloqueos puntuales de agenda (excepciones horarias).
 */
export class BloqueoHorario {
  /**
   * @param {object} params
   * @param {string} params.bloqueoId
   * @param {string} params.sedeId
   * @param {string} params.barberoId
   * @param {string} params.fecha
   * @param {boolean} [params.diaCompleto=false]
   * @param {string|null} [params.horaInicio=null]
   * @param {string|null} [params.horaFin=null]
   * @param {Date} params.inicioEn
   * @param {Date} params.finEn
   * @param {string} params.motivo
   * @param {boolean} [params.activo=true]
   * @param {string} params.creadoPorUsuarioId
   * @param {Date} [params.creadoEn]
   * @param {Date} [params.actualizadoEn]
   */
  constructor({
    bloqueoId,
    sedeId,
    barberoId,
    fecha,
    diaCompleto = false,
    horaInicio = null,
    horaFin = null,
    inicioEn,
    finEn,
    motivo,
    activo = true,
    creadoPorUsuarioId,
    creadoEn = new Date(),
    actualizadoEn = new Date()
  }) {
    this.bloqueoId = bloqueoId;
    this.sedeId = sedeId;
    this.barberoId = barberoId;
    this.fecha = fecha;
    this.diaCompleto = Boolean(diaCompleto);
    this.horaInicio = horaInicio;
    this.horaFin = horaFin;
    this.inicioEn = inicioEn instanceof Date ? inicioEn : new Date(inicioEn);
    this.finEn = finEn instanceof Date ? finEn : new Date(finEn);
    this.motivo = motivo;
    this.activo = Boolean(activo);
    this.creadoPorUsuarioId = creadoPorUsuarioId;
    this.creadoEn = creadoEn instanceof Date ? creadoEn : new Date(creadoEn);
    this.actualizadoEn = actualizadoEn instanceof Date ? actualizadoEn : new Date(actualizadoEn);
  }
}
