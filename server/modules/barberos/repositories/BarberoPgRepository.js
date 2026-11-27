/**
 * @file BarberoPgRepository.js
 * @description Implementación en PostgreSQL del repositorio de Barberos, Horarios y Bloqueos.
 */
import { IBarberoRepository } from './IBarberoRepository.js';
import { BarberoMapper } from '../mappers/barberoMapper.js';
import { getDatabasePool } from '../../../shared/database/connection.js';
import { mapDatabaseError } from '../../../shared/database/errors.js';

export class BarberoPgRepository extends IBarberoRepository {
  constructor(pool = null) {
    super();
    this.pool = pool || getDatabasePool();
  }

  async findById(id, { client } = {}) {
    const executor = client || this.pool;
    try {
      const result = await executor.query(
        'SELECT * FROM barberos WHERE barbero_id = $1 LIMIT 1',
        [id]
      );
      return BarberoMapper.barberoToDomain(result.rows[0]);
    } catch (error) {
      throw mapDatabaseError(error, `Error al buscar barbero con ID ${id}`);
    }
  }

  async findByUsuarioId(usuarioId, { client } = {}) {
    const executor = client || this.pool;
    try {
      const result = await executor.query(
        'SELECT * FROM barberos WHERE usuario_id = $1 LIMIT 1',
        [usuarioId]
      );
      return BarberoMapper.barberoToDomain(result.rows[0]);
    } catch (error) {
      throw mapDatabaseError(error, `Error al buscar barbero con usuario ID ${usuarioId}`);
    }
  }

  async findBySede(sedeId, { activosSolo = true } = {}, { client } = {}) {
    const executor = client || this.pool;
    try {
      let query = 'SELECT * FROM barberos WHERE sede_id = $1';
      const params = [sedeId];

      if (activosSolo) {
        query += " AND estado = 'activo'";
      }
      query += ' ORDER BY nombre_completo ASC';

      const result = await executor.query(query, params);
      return result.rows.map(BarberoMapper.barberoToDomain);
    } catch (error) {
      throw mapDatabaseError(error, `Error al listar barberos de la sede ${sedeId}`);
    }
  }

  async save(barbero, { client } = {}) {
    const executor = client || this.pool;
    try {
      const result = await executor.query(
        `INSERT INTO barberos (
          barbero_id,
          sede_id,
          usuario_id,
          nombre_completo,
          nombre_publico,
          telefono,
          correo,
          foto_url,
          biografia_breve,
          porcentaje_comision,
          estado
        ) VALUES (
          COALESCE($1, gen_random_uuid()), $2, $3, $4, $5, $6, LOWER(TRIM($7)), $8, $9, $10, $11
        )
        ON CONFLICT (barbero_id) DO UPDATE SET
          usuario_id = EXCLUDED.usuario_id,
          nombre_completo = EXCLUDED.nombre_completo,
          nombre_publico = EXCLUDED.nombre_publico,
          telefono = EXCLUDED.telefono,
          correo = EXCLUDED.correo,
          foto_url = EXCLUDED.foto_url,
          biografia_breve = EXCLUDED.biografia_breve,
          porcentaje_comision = EXCLUDED.porcentaje_comision,
          estado = EXCLUDED.estado
        RETURNING *;`,
        [
          barbero.barberoId || null,
          barbero.sedeId,
          barbero.usuarioId || null,
          barbero.nombreCompleto,
          barbero.nombrePublico,
          barbero.telefono,
          barbero.correo,
          barbero.fotoUrl,
          barbero.biografiaBreve,
          barbero.porcentajeComision,
          barbero.estado
        ]
      );
      return BarberoMapper.barberoToDomain(result.rows[0]);
    } catch (error) {
      throw mapDatabaseError(error, 'Error al guardar perfil de barbero');
    }
  }

  async getHorariosByBarbero(barberoId, { client } = {}) {
    const executor = client || this.pool;
    try {
      const result = await executor.query(
        'SELECT * FROM horarios_barberos WHERE barbero_id = $1 ORDER BY dia_semana ASC, numero_franja ASC',
        [barberoId]
      );
      return result.rows.map(BarberoMapper.horarioToDomain);
    } catch (error) {
      throw mapDatabaseError(error, `Error al obtener horarios del barbero ${barberoId}`);
    }
  }

  async getBloqueosByFecha(barberoId, fecha, { client } = {}) {
    const executor = client || this.pool;
    try {
      const result = await executor.query(
        'SELECT * FROM bloqueos_horarios WHERE barbero_id = $1 AND fecha = $2 AND activo = true ORDER BY inicio_en ASC',
        [barberoId, fecha]
      );
      return result.rows.map(BarberoMapper.bloqueoToDomain);
    } catch (error) {
      throw mapDatabaseError(error, `Error al consultar bloqueos del barbero ${barberoId}`);
    }
  }

  async saveBloqueo(bloqueo, { client } = {}) {
    const executor = client || this.pool;
    try {
      const result = await executor.query(
        `INSERT INTO bloqueos_horarios (
          bloqueo_id,
          sede_id,
          barbero_id,
          fecha,
          dia_completo,
          hora_inicio,
          hora_fin,
          inicio_en,
          fin_en,
          motivo,
          activo,
          creado_por_usuario_id
        ) VALUES (
          COALESCE($1, gen_random_uuid()), $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12
        )
        RETURNING *;`,
        [
          bloqueo.bloqueoId || null,
          bloqueo.sedeId,
          bloqueo.barberoId,
          bloqueo.fecha,
          bloqueo.diaCompleto,
          bloqueo.horaInicio,
          bloqueo.horaFin,
          bloqueo.inicioEn,
          bloqueo.finEn,
          bloqueo.motivo,
          bloqueo.activo,
          bloqueo.creadoPorUsuarioId
        ]
      );
      return BarberoMapper.bloqueoToDomain(result.rows[0]);
    } catch (error) {
      throw mapDatabaseError(error, 'Error al guardar bloqueo de horario');
    }
  }

  async desactivar(barberoId, { client } = {}) {
    const executor = client || this.pool;
    try {
      const result = await executor.query(
        "UPDATE barberos SET estado = 'inactivo' WHERE barbero_id = $1 RETURNING *",
        [barberoId]
      );
      return BarberoMapper.barberoToDomain(result.rows[0]);
    } catch (error) {
      throw mapDatabaseError(error, `Error al desactivar al barbero ${barberoId}`);
    }
  }

  async activar(barberoId, { client } = {}) {
    const executor = client || this.pool;
    try {
      const result = await executor.query(
        "UPDATE barberos SET estado = 'activo' WHERE barbero_id = $1 RETURNING *",
        [barberoId]
      );
      return BarberoMapper.barberoToDomain(result.rows[0]);
    } catch (error) {
      throw mapDatabaseError(error, `Error al activar al barbero ${barberoId}`);
    }
  }

  async saveHorarios(barberoId, horarios, { client } = {}) {
    const executor = client || this.pool;
    try {
      await executor.query('DELETE FROM horarios_barberos WHERE barbero_id = $1', [barberoId]);

      const inserted = [];
      for (const h of horarios) {
        const res = await executor.query(
          `INSERT INTO horarios_barberos (
            barbero_id, dia_semana, numero_franja, es_descanso, hora_inicio, hora_fin
          ) VALUES ($1, $2, $3, $4, $5, $6)
          RETURNING *;`,
          [
            barberoId,
            h.diaSemana,
            h.numeroFranja || 1,
            Boolean(h.esDescanso),
            h.esDescanso ? null : h.horaInicio,
            h.esDescanso ? null : h.horaFin
          ]
        );
        inserted.push(BarberoMapper.horarioToDomain(res.rows[0]));
      }
      return inserted;
    } catch (error) {
      throw mapDatabaseError(error, `Error al guardar plantilla de horarios del barbero ${barberoId}`);
    }
  }

  async deleteBloqueo(bloqueoId, { client } = {}) {
    const executor = client || this.pool;
    try {
      const result = await executor.query(
        'UPDATE bloqueos_horarios SET activo = false WHERE bloqueo_id = $1 RETURNING *',
        [bloqueoId]
      );
      return result.rowCount > 0;
    } catch (error) {
      throw mapDatabaseError(error, `Error al cancelar bloqueo de horario ${bloqueoId}`);
    }
  }

  async findCitasFuturasActivas(barberoId, { client } = {}) {
    const executor = client || this.pool;
    try {
      const result = await executor.query(
        `SELECT cita_id, codigo_reserva, fecha, hora_inicio, hora_fin, estado
         FROM citas
         WHERE barbero_id = $1 
           AND estado IN ('pendiente', 'confirmada')
           AND inicio_en >= NOW()
         ORDER BY inicio_en ASC`,
        [barberoId]
      );
      return result.rows;
    } catch (error) {
      throw mapDatabaseError(error, `Error al consultar citas futuras activas del barbero ${barberoId}`);
    }
  }
}
