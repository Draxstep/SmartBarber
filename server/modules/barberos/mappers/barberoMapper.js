/**
 * @file barberoMapper.js
 * @description Mapeador para las entidades del módulo de Barberos.
 */
import { Barbero } from '../domain/Barbero.js';
import { HorarioBarbero } from '../domain/HorarioBarbero.js';
import { BloqueoHorario } from '../domain/BloqueoHorario.js';

export class BarberoMapper {
  static barberoToDomain(row) {
    if (!row) return null;
    return new Barbero({
      barberoId: row.barbero_id,
      sedeId: row.sede_id,
      usuarioId: row.usuario_id,
      nombreCompleto: row.nombre_completo,
      nombrePublico: row.nombre_publico,
      telefono: row.telefono,
      correo: row.correo,
      fotoUrl: row.foto_url,
      biografiaBreve: row.biografia_breve,
      porcentajeComision: row.porcentaje_comision,
      estado: row.estado,
      creadoEn: row.creado_en,
      actualizadoEn: row.actualizado_en
    });
  }

  static barberoToDto(entity) {
    if (!entity) return null;
    return {
      barberoId: entity.barberoId,
      sedeId: entity.sedeId,
      usuarioId: entity.usuarioId,
      nombreCompleto: entity.nombreCompleto,
      nombrePublico: entity.nombrePublico,
      telefono: entity.telefono,
      correo: entity.correo,
      fotoUrl: entity.fotoUrl,
      biografiaBreve: entity.biografiaBreve,
      porcentajeComision: entity.porcentajeComision,
      estado: entity.estado,
      creadoEn: entity.creadoEn.toISOString(),
      actualizadoEn: entity.actualizadoEn.toISOString()
    };
  }

  static horarioToDomain(row) {
    if (!row) return null;
    return new HorarioBarbero({
      horarioId: row.horario_id,
      barberoId: row.barbero_id,
      diaSemana: row.dia_semana,
      numeroFranja: row.numero_franja,
      esDescanso: row.es_descanso,
      horaInicio: row.hora_inicio,
      horaFin: row.hora_fin,
      creadoEn: row.creado_en,
      actualizadoEn: row.actualizado_en
    });
  }

  static bloqueoToDomain(row) {
    if (!row) return null;
    return new BloqueoHorario({
      bloqueoId: row.bloqueo_id,
      sedeId: row.sede_id,
      barberoId: row.barbero_id,
      fecha: row.fecha instanceof Date ? row.fecha.toISOString().split('T')[0] : row.fecha,
      diaCompleto: row.dia_completo,
      horaInicio: row.hora_inicio,
      horaFin: row.hora_fin,
      inicioEn: row.inicio_en,
      finEn: row.fin_en,
      motivo: row.motivo,
      activo: row.activo,
      creadoPorUsuarioId: row.creado_por_usuario_id,
      creadoEn: row.creado_en,
      actualizadoEn: row.actualizado_en
    });
  }
}
