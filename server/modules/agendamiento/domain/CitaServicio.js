/**
 * @file CitaServicio.js
 * @description Snapshot inmutable de un servicio incluido en una cita de agendamiento.
 */
export class CitaServicio {
  /**
   * @param {object} params
   * @param {string} params.citaServicioId
   * @param {string} params.citaId
   * @param {string} params.servicioId
   * @param {string} params.nombreServicioSnapshot
   * @param {number} params.precioCopSnapshot
   * @param {number} params.duracionBloquesSnapshot
   * @param {Date} [params.creadoEn]
   */
  constructor({
    citaServicioId,
    citaId,
    servicioId,
    nombreServicioSnapshot,
    precioCopSnapshot,
    duracionBloquesSnapshot,
    creadoEn = new Date()
  }) {
    this.citaServicioId = citaServicioId;
    this.citaId = citaId;
    this.servicioId = servicioId;
    this.nombreServicioSnapshot = nombreServicioSnapshot;
    this.precioCopSnapshot = Math.round(Number(precioCopSnapshot));
    this.duracionBloquesSnapshot = Number(duracionBloquesSnapshot);
    this.creadoEn = creadoEn instanceof Date ? creadoEn : new Date(creadoEn);
  }
}
