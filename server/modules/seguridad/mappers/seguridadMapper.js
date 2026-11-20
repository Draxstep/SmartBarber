/**
 * @file seguridadMapper.js
 * @description Mapeador para las entidades del módulo de Seguridad.
 */
import { Usuario } from '../domain/Usuario.js';
import { SesionUsuario } from '../domain/SesionUsuario.js';

export class SeguridadMapper {
  static usuarioToDomain(row) {
    if (!row) return null;
    return new Usuario({
      usuarioId: row.usuario_id,
      sedeId: row.sede_id,
      correo: row.correo,
      contrasenaHash: row.contrasena_hash,
      rol: row.rol,
      estado: row.estado,
      intentosFallidos: row.intentos_fallidos,
      bloqueadoHasta: row.bloqueado_hasta,
      ultimoAccesoEn: row.ultimo_acceso_en,
      creadoEn: row.creado_en,
      actualizadoEn: row.actualizado_en
    });
  }

  /**
   * Genera el DTO público de un usuario garantizando cero fugas de contrasena_hash
   * @param {Usuario} entity
   * @returns {object | null}
   */
  static usuarioToDto(entity) {
    if (!entity) return null;
    return {
      usuarioId: entity.usuarioId,
      sedeId: entity.sedeId,
      correo: entity.correo,
      rol: entity.rol,
      estado: entity.estado,
      intentosFallidos: entity.intentosFallidos,
      bloqueadoHasta: entity.bloqueadoHasta ? entity.bloqueadoHasta.toISOString() : null,
      ultimoAccesoEn: entity.ultimoAccesoEn ? entity.ultimoAccesoEn.toISOString() : null,
      creadoEn: entity.creadoEn.toISOString(),
      actualizadoEn: entity.actualizadoEn.toISOString()
    };
  }

  static sesionToDomain(row) {
    if (!row) return null;
    return new SesionUsuario({
      sesionId: row.sesion_id,
      usuarioId: row.usuario_id,
      tokenHash: row.token_hash,
      direccionIp: row.direccion_ip,
      agenteUsuario: row.agente_usuario,
      ultimaActividadEn: row.ultima_actividad_en,
      expiraEn: row.expira_en,
      revocadaEn: row.revocada_en,
      creadoEn: row.creado_en
    });
  }

  static sesionToDto(entity) {
    if (!entity) return null;
    return {
      sesionId: entity.sesionId,
      usuarioId: entity.usuarioId,
      direccionIp: entity.direccionIp,
      agenteUsuario: entity.agenteUsuario,
      ultimaActividadEn: entity.ultimaActividadEn.toISOString(),
      expiraEn: entity.expiraEn.toISOString(),
      revocadaEn: entity.revocadaEn ? entity.revocadaEn.toISOString() : null,
      creadoEn: entity.creadoEn.toISOString()
    };
  }
}
