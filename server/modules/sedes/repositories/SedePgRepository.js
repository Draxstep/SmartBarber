/**
 * @file SedePgRepository.js
 * @description Implementación en PostgreSQL del repositorio de Sedes.
 */
import { ISedeRepository } from './ISedeRepository.js';
import { SedeMapper } from '../mappers/sedeMapper.js';
import { getDatabasePool } from '../../../shared/database/connection.js';
import { mapDatabaseError } from '../../../shared/database/errors.js';

export class SedePgRepository extends ISedeRepository {
  constructor(pool = null) {
    super();
    this.pool = pool || getDatabasePool();
  }

  async findById(id, { client } = {}) {
    const executor = client || this.pool;
    try {
      const result = await executor.query(
        'SELECT * FROM sedes WHERE sede_id = $1 LIMIT 1',
        [id]
      );
      return SedeMapper.toDomain(result.rows[0]);
    } catch (error) {
      throw mapDatabaseError(error, `Error al buscar sede con ID ${id}`);
    }
  }

  async findPrincipal({ client } = {}) {
    const executor = client || this.pool;
    try {
      const result = await executor.query(
        "SELECT * FROM sedes WHERE estado = 'activo' ORDER BY creado_en ASC LIMIT 1"
      );
      return SedeMapper.toDomain(result.rows[0]);
    } catch (error) {
      throw mapDatabaseError(error, 'Error al buscar la sede principal activa');
    }
  }

  async save(sede, { client } = {}) {
    const executor = client || this.pool;
    try {
      const result = await executor.query(
        `INSERT INTO sedes (
          sede_id,
          nombre_comercial,
          eslogan,
          logo_url,
          direccion_fisica,
          enlace_mapa_url,
          telefono_contacto,
          correo_contacto,
          horario_general_texto,
          zona_horaria,
          dias_max_anticipacion,
          minutos_min_anticipacion,
          estado_inicial_cita,
          politica_datos_url,
          estado
        ) VALUES (
          COALESCE($1, gen_random_uuid()), $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15
        )
        ON CONFLICT (sede_id) DO UPDATE SET
          nombre_comercial = EXCLUDED.nombre_comercial,
          eslogan = EXCLUDED.eslogan,
          logo_url = EXCLUDED.logo_url,
          direccion_fisica = EXCLUDED.direccion_fisica,
          enlace_mapa_url = EXCLUDED.enlace_mapa_url,
          telefono_contacto = EXCLUDED.telefono_contacto,
          correo_contacto = EXCLUDED.correo_contacto,
          horario_general_texto = EXCLUDED.horario_general_texto,
          zona_horaria = EXCLUDED.zona_horaria,
          dias_max_anticipacion = EXCLUDED.dias_max_anticipacion,
          minutos_min_anticipacion = EXCLUDED.minutos_min_anticipacion,
          estado_inicial_cita = EXCLUDED.estado_inicial_cita,
          politica_datos_url = EXCLUDED.politica_datos_url,
          estado = EXCLUDED.estado
        RETURNING *;`,
        [
          sede.sedeId || null,
          sede.nombreComercial,
          sede.eslogan,
          sede.logoUrl,
          sede.direccionFisica,
          sede.enlaceMapaUrl,
          sede.telefonoContacto,
          sede.correoContacto,
          sede.horarioGeneralTexto,
          sede.zonaHoraria,
          sede.diasMaxAnticipacion,
          sede.minutosMinAnticipacion,
          sede.estadoInicialCita,
          sede.politicaDatosUrl,
          sede.estado
        ]
      );
      return SedeMapper.toDomain(result.rows[0]);
    } catch (error) {
      throw mapDatabaseError(error, 'Error al guardar la sede');
    }
  }
}
