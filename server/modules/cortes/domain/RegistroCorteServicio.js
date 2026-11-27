/**
 * @file RegistroCorteServicio.js
 * @description Detalle y snapshot inmutable de un servicio prestado en un corte.
 */
export class RegistroCorteServicio {
  /**
   * @param {object} params
   * @param {string} params.registroCorteServicioId
   * @param {string} params.registroCorteId
   * @param {string} params.servicioId
   * @param {string} params.nombreServicioSnapshot
   * @param {number} params.precioCopSnapshot
   * @param {Date} [params.creadoEn]
   */
  constructor({
    registroCorteServicioId,
    registroCorteId,
    servicioId,
    nombreServicioSnapshot,
    precioCopSnapshot,
    creadoEn = new Date()
  }) {
    this.registroCorteServicioId = registroCorteServicioId;
    this.registroCorteId = registroCorteId;
    this.servicioId = servicioId;
    this.nombreServicioSnapshot = nombreServicioSnapshot;
    this.precioCopSnapshot = Math.round(Number(precioCopSnapshot));
    this.creadoEn = creadoEn instanceof Date ? creadoEn : new Date(creadoEn);
  }
}
