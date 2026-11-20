/**
 * @file servicioMapper.js
 * @description Mapeador para las entidades del catálogo de Servicios.
 */
import { Servicio } from '../domain/Servicio.js';

export class ServicioMapper {
  static toDomain(row) {
    if (!row) return null;
    return new Servicio({
      servicioId: row.servicio_id,
      sedeId: row.sede_id,
      nombre: row.nombre,
      descripcionBreve: row.descripcion_breve,
      precioCop: row.precio_cop,
      duracionBloques: row.duracion_bloques,
      visiblePublico: row.visible_publico,
      estado: row.estado,
      ordenVisual: row.orden_visual,
      creadoEn: row.creado_en,
      actualizadoEn: row.actualizado_en
    });
  }

  static toDto(entity) {
    if (!entity) return null;
    return {
      servicioId: entity.servicioId,
      sedeId: entity.sedeId,
      nombre: entity.nombre,
      descripcionBreve: entity.descripcionBreve,
      precioCop: entity.precioCop,
      duracionBloques: entity.duracionBloques,
      duracionMinutos: entity.duracionMinutos,
      visiblePublico: entity.visiblePublico,
      estado: entity.estado,
      ordenVisual: entity.ordenVisual,
      creadoEn: entity.creadoEn.toISOString(),
      actualizadoEn: entity.actualizadoEn.toISOString()
    };
  }
}
