/**
 * @file sedeMapper.js
 * @description Mapeador entre filas de base de datos, entidad de dominio Sede y DTO.
 */
import { Sede } from '../domain/Sede.js';

export class SedeMapper {
  /**
   * Transforma un registro crudo de PostgreSQL en una entidad de dominio Sede
   * @param {object} row
   * @returns {Sede | null}
   */
  static toDomain(row) {
    if (!row) return null;
    return new Sede({
      sedeId: row.sede_id,
      nombreComercial: row.nombre_comercial,
      eslogan: row.eslogan,
      logoUrl: row.logo_url,
      direccionFisica: row.direccion_fisica,
      enlaceMapaUrl: row.enlace_mapa_url,
      telefonoContacto: row.telefono_contacto,
      correoContacto: row.correo_contacto,
      horarioGeneralTexto: row.horario_general_texto,
      zonaHoraria: row.zona_horaria,
      diasMaxAnticipacion: row.dias_max_anticipacion,
      minutosMinAnticipacion: row.minutos_min_anticipacion,
      estadoInicialCita: row.estado_inicial_cita,
      politicaDatosUrl: row.politica_datos_url,
      estado: row.estado,
      creadoEn: row.creado_en,
      actualizadoEn: row.actualizado_en
    });
  }

  /**
   * Transforma una entidad de dominio Sede en un DTO público seguro
   * @param {Sede} entity
   * @returns {object | null}
   */
  static toDto(entity) {
    if (!entity) return null;
    return {
      sedeId: entity.sedeId,
      nombreComercial: entity.nombreComercial,
      eslogan: entity.eslogan,
      logoUrl: entity.logoUrl,
      direccionFisica: entity.direccionFisica,
      enlaceMapaUrl: entity.enlaceMapaUrl,
      telefonoContacto: entity.telefonoContacto,
      correoContacto: entity.correoContacto,
      horarioGeneralTexto: entity.horarioGeneralTexto,
      zonaHoraria: entity.zonaHoraria,
      diasMaxAnticipacion: entity.diasMaxAnticipacion,
      minutosMinAnticipacion: entity.minutosMinAnticipacion,
      estadoInicialCita: entity.estadoInicialCita,
      politicaDatosUrl: entity.politicaDatosUrl,
      estado: entity.estado,
      creadoEn: entity.creadoEn.toISOString(),
      actualizadoEn: entity.actualizadoEn.toISOString()
    };
  }
}
