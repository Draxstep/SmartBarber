/**
 * @file Cliente.js
 * @description Entidad de Dominio que representa un Cliente en SmartBarber.
 */
export class Cliente {
  /**
   * @param {object} params
   * @param {string} params.clienteId
   * @param {string} params.sedeId
   * @param {string} params.nombreCompleto
   * @param {string} params.telefonoWhatsapp
   * @param {string} params.correo
   * @param {Date|null} [params.aceptoPoliticaDatosEn=null]
   * @param {Date} [params.creadoEn]
   * @param {Date} [params.actualizadoEn]
   */
  constructor({
    clienteId,
    sedeId,
    nombreCompleto,
    telefonoWhatsapp,
    correo,
    aceptoPoliticaDatosEn = null,
    creadoEn = new Date(),
    actualizadoEn = new Date()
  }) {
    this.clienteId = clienteId;
    this.sedeId = sedeId;
    this.nombreCompleto = nombreCompleto;
    this.telefonoWhatsapp = telefonoWhatsapp;
    this.correo = correo?.toLowerCase().trim();
    this.aceptoPoliticaDatosEn = aceptoPoliticaDatosEn ? new Date(aceptoPoliticaDatosEn) : null;
    this.creadoEn = creadoEn instanceof Date ? creadoEn : new Date(creadoEn);
    this.actualizadoEn = actualizadoEn instanceof Date ? actualizadoEn : new Date(actualizadoEn);
  }
}
