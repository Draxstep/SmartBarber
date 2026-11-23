/**
 * @file UsuarioPgRepository.js
 * @description Implementación en PostgreSQL del repositorio de Usuarios y Sesiones.
 */
import { IUsuarioRepository } from './IUsuarioRepository.js';
import { SeguridadMapper } from '../mappers/seguridadMapper.js';
import { getDatabasePool } from '../../../shared/database/connection.js';
import { mapDatabaseError } from '../../../shared/database/errors.js';

export class UsuarioPgRepository extends IUsuarioRepository {
  constructor(pool = null) {
    super();
    this.pool = pool || getDatabasePool();
  }

  async findById(id, { client } = {}) {
    const executor = client || this.pool;
    try {
      const result = await executor.query(
        'SELECT * FROM usuarios WHERE usuario_id = $1 LIMIT 1',
        [id]
      );
      return SeguridadMapper.usuarioToDomain(result.rows[0]);
    } catch (error) {
      throw mapDatabaseError(error, `Error al buscar usuario con ID ${id}`);
    }
  }

  async findAll(sedeId, { client } = {}) {
    const executor = client || this.pool;
    try {
      const result = await executor.query(
        'SELECT * FROM usuarios WHERE sede_id = $1 ORDER BY creado_en DESC',
        [sedeId]
      );
      return result.rows.map(SeguridadMapper.usuarioToDomain);
    } catch (error) {
      throw mapDatabaseError(error, `Error al listar usuarios de la sede ${sedeId}`);
    }
  }

  async findByCorreo(correo, { client } = {}) {
    const executor = client || this.pool;
    try {
      const result = await executor.query(
        'SELECT * FROM usuarios WHERE correo = LOWER(TRIM($1)) LIMIT 1',
        [correo]
      );
      return SeguridadMapper.usuarioToDomain(result.rows[0]);
    } catch (error) {
      throw mapDatabaseError(error, `Error al buscar usuario con correo ${correo}`);
    }
  }

  async save(usuario, { client } = {}) {
    const executor = client || this.pool;
    try {
      const result = await executor.query(
        `INSERT INTO usuarios (
          usuario_id,
          sede_id,
          correo,
          contrasena_hash,
          rol,
          estado,
          intentos_fallidos,
          bloqueado_hasta,
          ultimo_acceso_en
        ) VALUES (
          COALESCE($1, gen_random_uuid()), $2, LOWER(TRIM($3)), $4, $5, $6, $7, $8, $9
        )
        ON CONFLICT (usuario_id) DO UPDATE SET
          correo = EXCLUDED.correo,
          contrasena_hash = EXCLUDED.contrasena_hash,
          rol = EXCLUDED.rol,
          estado = EXCLUDED.estado,
          intentos_fallidos = EXCLUDED.intentos_fallidos,
          bloqueado_hasta = EXCLUDED.bloqueado_hasta,
          ultimo_acceso_en = EXCLUDED.ultimo_acceso_en
        RETURNING *;`,
        [
          usuario.usuarioId || null,
          usuario.sedeId,
          usuario.correo,
          usuario.contrasenaHash,
          usuario.rol,
          usuario.estado,
          usuario.intentosFallidos,
          usuario.bloqueadoHasta,
          usuario.ultimoAccesoEn
        ]
      );
      return SeguridadMapper.usuarioToDomain(result.rows[0]);
    } catch (error) {
      throw mapDatabaseError(error, 'Error al guardar usuario');
    }
  }

  async registrarIntentoFallido(usuarioId, { client } = {}) {
    const executor = client || this.pool;
    try {
      await executor.query(
        `UPDATE usuarios 
         SET intentos_fallidos = intentos_fallidos + 1,
             bloqueado_hasta = CASE 
               WHEN intentos_fallidos + 1 >= 5 THEN NOW() + INTERVAL '15 minutes'
               ELSE bloqueado_hasta 
             END
         WHERE usuario_id = $1`,
        [usuarioId]
      );
    } catch (error) {
      throw mapDatabaseError(error, 'Error al registrar intento fallido de autenticación');
    }
  }

  async resetearIntentosYAcceso(usuarioId, { client } = {}) {
    const executor = client || this.pool;
    try {
      await executor.query(
        `UPDATE usuarios 
         SET intentos_fallidos = 0,
             bloqueado_hasta = NULL,
             ultimo_acceso_en = NOW()
         WHERE usuario_id = $1`,
        [usuarioId]
      );
    } catch (error) {
      throw mapDatabaseError(error, 'Error al restablecer intentos de usuario');
    }
  }

  async cambiarEstado(usuarioId, estado, { client } = {}) {
    const executor = client || this.pool;
    try {
      await executor.query('UPDATE usuarios SET estado = $1 WHERE usuario_id = $2', [estado, usuarioId]);
    } catch (error) {
      throw mapDatabaseError(error, `Error al cambiar estado del usuario ${usuarioId}`);
    }
  }

  async revocarSesionesActivas(usuarioId, { client } = {}) {
    const executor = client || this.pool;
    try {
      const result = await executor.query(
        `UPDATE sesiones_usuarios
         SET revocada_en = NOW()
         WHERE usuario_id = $1 AND revocada_en IS NULL`,
        [usuarioId]
      );
      return result.rowCount;
    } catch (error) {
      throw mapDatabaseError(error, 'Error al revocar sesiones activas del usuario');
    }
  }
}
