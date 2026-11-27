/**
 * @file HistorialEstadoCita.js
 * @description Evento inmutable de auditoría para la transición de estado de una cita.
 */
export class HistorialEstadoCita {
  /**
   * @param {object} params
   * @param {string} params.historialId
   * @param {string} params.citaId
   * @param {string|null} [params.estadoAnterior=null]
   * @param {string} params.estadoNuevo
   * @param {string|null} [params.observacion=null]
   * @param {string|null} [params.cambiadoPorUsuarioId=null]
   * @param {Date} [params.cambiadoEn]
   */
  constructor({
    historialId,
    citaId,
    estadoAnterior = null,
    estadoNuevo,
    observacion = null,
    cambiadoPorUsuarioId = null,
    cambiadoEn = new Date()
  }) {
    this.historialId = historialId;
    this.citaId = citaId;
    this.estadoAnterior = estadoAnterior;
    this.estadoNuevo = estadoNuevo;
    this.observacion = observacion;
    this.cambiadoPorUsuarioId = cambiadoPorUsuarioId;
    this.cambiadoEn = cambiadoEn instanceof Date ? cambiadoEn : new Date(cambiadoEn);
  }
}
