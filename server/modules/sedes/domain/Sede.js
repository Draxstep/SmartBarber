/**
 * @file Sede.js
 * @description Entidad de Dominio que representa una Sede de SmartBarber.
 */
import { EstadoRegistro, EstadoCita } from '../../../../shared/contracts/enums.js';

export class Sede {
  /**
   * @param {object} params
   * @param {string} params.sedeId
   * @param {string} params.nombreComercial
   * @param {string|null} [params.eslogan]
   * @param {string|null} [params.logoUrl]
   * @param {string} params.direccionFisica
   * @param {string|null} [params.enlaceMapaUrl]
   * @param {string} params.telefonoContacto
   * @param {string} params.correoContacto
   * @param {string} params.horarioGeneralTexto
   * @param {string} [params.zonaHoraria='America/Bogota']
   * @param {number} [params.diasMaxAnticipacion=30]
   * @param {number} [params.minutosMinAnticipacion=30]
   * @param {string} [params.estadoInicialCita=EstadoCita.PENDIENTE]
   * @param {string} params.politicaDatosUrl
   * @param {string} [params.estado=EstadoRegistro.ACTIVO]
   * @param {Date} [params.creadoEn]
   * @param {Date} [params.actualizadoEn]
   */
  constructor({
    sedeId,
    nombreComercial,
    eslogan = null,
    logoUrl = null,
    direccionFisica,
    enlaceMapaUrl = null,
    telefonoContacto,
    correoContacto,
    horarioGeneralTexto,
    zonaHoraria = 'America/Bogota',
    diasMaxAnticipacion = 30,
    minutosMinAnticipacion = 30,
    estadoInicialCita = EstadoCita.PENDIENTE,
    politicaDatosUrl,
    estado = EstadoRegistro.ACTIVO,
    creadoEn = new Date(),
    actualizadoEn = new Date()
  }) {
    this.sedeId = sedeId;
    this.nombreComercial = nombreComercial;
    this.eslogan = eslogan;
    this.logoUrl = logoUrl;
    this.direccionFisica = direccionFisica;
    this.enlaceMapaUrl = enlaceMapaUrl;
    this.telefonoContacto = telefonoContacto;
    this.correoContacto = correoContacto?.toLowerCase().trim();
    this.horarioGeneralTexto = horarioGeneralTexto;
    this.zonaHoraria = zonaHoraria;
    this.diasMaxAnticipacion = diasMaxAnticipacion;
    this.minutosMinAnticipacion = minutosMinAnticipacion;
    this.estadoInicialCita = estadoInicialCita;
    this.politicaDatosUrl = politicaDatosUrl;
    this.estado = estado;
    this.creadoEn = creadoEn instanceof Date ? creadoEn : new Date(creadoEn);
    this.actualizadoEn = actualizadoEn instanceof Date ? actualizadoEn : new Date(actualizadoEn);
  }

  isActiva() {
    return this.estado === EstadoRegistro.ACTIVO;
  }
}
