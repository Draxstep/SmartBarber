/**
 * @file ClientePgRepository.js
 * @description Implementación en PostgreSQL del repositorio de Clientes.
 */
import { IClienteRepository } from './IClienteRepository.js';
import { ClienteMapper } from '../mappers/clienteMapper.js';
import { getDatabasePool } from '../../../shared/database/connection.js';
import { mapDatabaseError } from '../../../shared/database/errors.js';

export class ClientePgRepository extends IClienteRepository {
  constructor(pool = null) {
    super();
    this.pool = pool || getDatabasePool();
  }

  async findById(id, { client } = {}) {
    const executor = client || this.pool;
    try {
      const result = await executor.query(
        'SELECT * FROM clientes WHERE cliente_id = $1 LIMIT 1',
        [id]
      );
      return ClienteMapper.toDomain(result.rows[0]);
    } catch (error) {
      throw mapDatabaseError(error, `Error al buscar cliente con ID ${id}`);
    }
  }

  async findByCorreo(sedeId, correo, { client } = {}) {
    const executor = client || this.pool;
    try {
      const result = await executor.query(
        'SELECT * FROM clientes WHERE sede_id = $1 AND correo = LOWER(TRIM($2)) LIMIT 1',
        [sedeId, correo]
      );
      return ClienteMapper.toDomain(result.rows[0]);
    } catch (error) {
      throw mapDatabaseError(error, `Error al buscar cliente por correo ${correo}`);
    }
  }

  async findByTelefono(sedeId, telefono, { client } = {}) {
    const executor = client || this.pool;
    try {
      const result = await executor.query(
        'SELECT * FROM clientes WHERE sede_id = $1 AND telefono_whatsapp = $2 LIMIT 1',
        [sedeId, telefono]
      );
      return ClienteMapper.toDomain(result.rows[0]);
    } catch (error) {
      throw mapDatabaseError(error, `Error al buscar cliente por teléfono ${telefono}`);
    }
  }

  async upsert(cliente, { client } = {}) {
    const executor = client || this.pool;
    try {
      const result = await executor.query(
        `INSERT INTO clientes (
          cliente_id,
          sede_id,
          nombre_completo,
          telefono_whatsapp,
          correo,
          acepto_politica_datos_en
        ) VALUES (
          COALESCE($1, gen_random_uuid()), $2, $3, $4, LOWER(TRIM($5)), $6
        )
        ON CONFLICT (sede_id, correo) DO UPDATE SET
          nombre_completo = EXCLUDED.nombre_completo,
          telefono_whatsapp = EXCLUDED.telefono_whatsapp,
          acepto_politica_datos_en = COALESCE(EXCLUDED.acepto_politica_datos_en, clientes.acepto_politica_datos_en)
        RETURNING *;`,
        [
          cliente.clienteId || null,
          cliente.sedeId,
          cliente.nombreCompleto,
          cliente.telefonoWhatsapp,
          cliente.correo,
          cliente.aceptoPoliticaDatosEn
        ]
      );
      return ClienteMapper.toDomain(result.rows[0]);
    } catch (error) {
      throw mapDatabaseError(error, 'Error al guardar o actualizar cliente');
    }
  }
}
