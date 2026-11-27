/**
 * @file HorarioBarbero.js
 * @description Entidad de Dominio para la plantilla semanal recurrente de disponibilidad.
 */
export class HorarioBarbero {
  /**
   * @param {object} params
   * @param {string} params.horarioId
   * @param {string} params.barberoId
   * @param {number} params.diaSemana
   * @param {number} [params.numeroFranja=1]
   * @param {boolean} [params.esDescanso=false]
   * @param {string|null} [params.horaInicio=null]
   * @param {string|null} [params.horaFin=null]
   * @param {Date} [params.creadoEn]
   * @param {Date} [params.actualizadoEn]
   */
  constructor({
    horarioId,
    barberoId,
    diaSemana,
    numeroFranja = 1,
    esDescanso = false,
    horaInicio = null,
    horaFin = null,
    creadoEn = new Date(),
    actualizadoEn = new Date()
  }) {
    this.horarioId = horarioId;
    this.barberoId = barberoId;
    this.diaSemana = diaSemana;
    this.numeroFranja = numeroFranja;
    this.esDescanso = Boolean(esDescanso);
    this.horaInicio = horaInicio;
    this.horaFin = horaFin;
    this.creadoEn = creadoEn instanceof Date ? creadoEn : new Date(creadoEn);
    this.actualizadoEn = actualizadoEn instanceof Date ? actualizadoEn : new Date(actualizadoEn);
  }
}
