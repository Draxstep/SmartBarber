/**
 * @file ServicioPgRepository.js
 * @description Implementación en PostgreSQL del repositorio de Servicios.
 */
import { IServicioRepository } from './IServicioRepository.js';
import { ServicioMapper } from '../mappers/servicioMapper.js';
import { getDatabasePool } from '../../../shared/database/connection.js';
import { mapDatabaseError } from '../../../shared/database/errors.js';

export class ServicioPgRepository extends IServicioRepository {
  constructor(pool = null) {
    super();
    this.pool = pool || getDatabasePool();
  }

  async findById(id, { client } = {}) {
    const executor = client || this.pool;
    try {
      const result = await executor.query(
        'SELECT * FROM servicios WHERE servicio_id = $1 LIMIT 1',
        [id]
      );
      return ServicioMapper.toDomain(result.rows[0]);
    } catch (error) {
      throw mapDatabaseError(error, `Error al buscar servicio con ID ${id}`);
    }
  }

  async findByIds(ids, { client } = {}) {
    if (!ids || ids.length === 0) return [];
    const executor = client || this.pool;
    try {
      const result = await executor.query(
        'SELECT * FROM servicios WHERE servicio_id = ANY($1::uuid[])',
        [ids]
      );
      return result.rows.map(ServicioMapper.toDomain);
    } catch (error) {
      throw mapDatabaseError(error, 'Error al buscar servicios por lista de IDs');
    }
  }

  async findBySede(sedeId, { activosSolo = true, visiblePublicoSolo = false } = {}, { client } = {}) {
    const executor = client || this.pool;
    try {
      let query = 'SELECT * FROM servicios WHERE sede_id = $1';
      const params = [sedeId];

      if (activosSolo) {
        query += " AND estado = 'activo'";
      }
      if (visiblePublicoSolo) {
        query += ' AND visible_publico = true';
      }
      query += ' ORDER BY orden_visual ASC, nombre ASC';

      const result = await executor.query(query, params);
      return result.rows.map(ServicioMapper.toDomain);
    } catch (error) {
      throw mapDatabaseError(error, `Error al listar servicios de la sede ${sedeId}`);
    }
  }

  async save(servicio, { client } = {}) {
    const executor = client || this.pool;
    try {
      const result = await executor.query(
        `INSERT INTO servicios (
          servicio_id,
          sede_id,
          nombre,
          descripcion_breve,
          precio_cop,
          duracion_bloques,
          visible_publico,
          estado,
          orden_visual
        ) VALUES (
          COALESCE($1, gen_random_uuid()), $2, $3, $4, $5, $6, $7, $8, $9
        )
        ON CONFLICT (servicio_id) DO UPDATE SET
          nombre = EXCLUDED.nombre,
          descripcion_breve = EXCLUDED.descripcion_breve,
          precio_cop = EXCLUDED.precio_cop,
          duracion_bloques = EXCLUDED.duracion_bloques,
          visible_publico = EXCLUDED.visible_publico,
          estado = EXCLUDED.estado,
          orden_visual = EXCLUDED.orden_visual
        RETURNING *;`,
        [
          servicio.servicioId || null,
          servicio.sedeId,
          servicio.nombre,
          servicio.descripcionBreve,
          servicio.precioCop,
          servicio.duracionBloques,
          servicio.visiblePublico,
          servicio.estado,
          servicio.ordenVisual
        ]
      );
      return ServicioMapper.toDomain(result.rows[0]);
    } catch (error) {
      throw mapDatabaseError(error, 'Error al guardar servicio');
    }
  }

  async desactivar(servicioId, { client } = {}) {
    const executor = client || this.pool;
    try {
      const result = await executor.query(
        "UPDATE servicios SET estado = 'inactivo' WHERE servicio_id = $1 RETURNING *",
        [servicioId]
      );
      return ServicioMapper.toDomain(result.rows[0]);
    } catch (error) {
      throw mapDatabaseError(error, `Error al desactivar servicio ${servicioId}`);
    }
  }
}
