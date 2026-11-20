/**
 * @file CitaPgRepository.js
 * @description Implementación en PostgreSQL del repositorio de Agendamiento.
 */
import { ICitaRepository } from './ICitaRepository.js';
import { CitaMapper } from '../mappers/citaMapper.js';
import { getDatabasePool } from '../../../shared/database/connection.js';
import { mapDatabaseError } from '../../../shared/database/errors.js';
import { runTransaction } from '../../../shared/database/transaction.js';

export class CitaPgRepository extends ICitaRepository {
  constructor(pool = null) {
    super();
    this.pool = pool || getDatabasePool();
  }

  async findById(id, { client } = {}) {
    const executor = client || this.pool;
    try {
      const citaRes = await executor.query(
        'SELECT * FROM citas WHERE cita_id = $1 LIMIT 1',
        [id]
      );
      if (citaRes.rows.length === 0) return null;

      const servRes = await executor.query(
        'SELECT * FROM citas_servicios WHERE cita_id = $1',
        [id]
      );

      return CitaMapper.citaToDomain(citaRes.rows[0], servRes.rows);
    } catch (error) {
      throw mapDatabaseError(error, `Error al buscar cita con ID ${id}`);
    }
  }

  async findByCodigo(codigo, { client } = {}) {
    const executor = client || this.pool;
    try {
      const citaRes = await executor.query(
        'SELECT * FROM citas WHERE codigo_reserva = $1 LIMIT 1',
        [codigo]
      );
      if (citaRes.rows.length === 0) return null;

      const servRes = await executor.query(
        'SELECT * FROM citas_servicios WHERE cita_id = $1',
        [citaRes.rows[0].cita_id]
      );

      return CitaMapper.citaToDomain(citaRes.rows[0], servRes.rows);
    } catch (error) {
      throw mapDatabaseError(error, `Error al buscar cita con código ${codigo}`);
    }
  }

  async findAgenda({ sedeId, fecha, barberoId = null }, { client } = {}) {
    const executor = client || this.pool;
    try {
      let query = `
        SELECT c.*, 
          COALESCE(
            json_agg(
              json_build_object(
                'cita_servicio_id', cs.cita_servicio_id,
                'servicio_id', cs.servicio_id,
                'nombre_servicio_snapshot', cs.nombre_servicio_snapshot,
                'precio_cop_snapshot', cs.precio_cop_snapshot,
                'duracion_bloques_snapshot', cs.duracion_bloques_snapshot
              )
            ) FILTER (WHERE cs.cita_servicio_id IS NOT NULL), '[]'
          ) as servicios_json
        FROM citas c
        LEFT JOIN citas_servicios cs ON c.cita_id = cs.cita_id
        WHERE c.sede_id = $1 AND c.fecha = $2
      `;
      const params = [sedeId, fecha];

      if (barberoId) {
        query += ' AND c.barbero_id = $3';
        params.push(barberoId);
      }

      query += ' GROUP BY c.cita_id ORDER BY c.hora_inicio ASC';

      const result = await executor.query(query, params);
      return result.rows.map((row) =>
        CitaMapper.citaToDomain(row, row.servicios_json || [])
      );
    } catch (error) {
      throw mapDatabaseError(error, 'Error al consultar la agenda de citas');
    }
  }

  async createWithServices(cita, serviciosSnapshots, { client: providedClient } = {}) {
    const executeLogic = async (client) => {
      // 1. Inserción de la cita con validación atómica GiST contra solapamientos
      const citaRes = await client.query(
        `INSERT INTO citas (
          cita_id,
          sede_id,
          codigo_reserva,
          cliente_id,
          barbero_id,
          barbero_asignado_automaticamente,
          fecha,
          hora_inicio,
          hora_fin,
          inicio_en,
          fin_en,
          bloques_totales,
          precio_estimado_cop,
          estado,
          notas_cliente,
          origen,
          creado_por_usuario_id
        ) VALUES (
          COALESCE($1, gen_random_uuid()), $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17
        )
        RETURNING *;`,
        [
          cita.citaId || null,
          cita.sedeId,
          cita.codigoReserva,
          cita.clienteId,
          cita.barberoId,
          Boolean(cita.barberoAsignadoAutomaticamente),
          cita.fecha,
          cita.horaInicio,
          cita.horaFin,
          cita.inicioEn,
          cita.finEn,
          cita.bloquesTotales,
          cita.precioEstimadoCop,
          cita.estado,
          cita.notasCliente || null,
          cita.origen,
          cita.creadoPorUsuarioId || null
        ]
      );

      const createdCitaRow = citaRes.rows[0];
      const citaId = createdCitaRow.cita_id;

      // 2. Inserción de snapshots de servicios asociados
      const insertedServicios = [];
      for (const serv of serviciosSnapshots) {
        const servRes = await client.query(
          `INSERT INTO citas_servicios (
            cita_id,
            servicio_id,
            nombre_servicio_snapshot,
            precio_cop_snapshot,
            duracion_bloques_snapshot
          ) VALUES ($1, $2, $3, $4, $5)
          RETURNING *;`,
          [
            citaId,
            serv.servicioId,
            serv.nombreServicioSnapshot,
            serv.precioCopSnapshot,
            serv.duracionBloquesSnapshot
          ]
        );
        insertedServicios.push(servRes.rows[0]);
      }

      // 3. Auditoría inicial de estado (RN-07)
      await client.query(
        `INSERT INTO historial_estados_citas (
          cita_id,
          estado_anterior,
          estado_nuevo,
          observacion,
          cambiado_por_usuario_id
        ) VALUES ($1, NULL, $2, 'Creación inicial de la cita', $3);`,
        [citaId, createdCitaRow.estado, cita.creadoPorUsuarioId]
      );

      // 4. Patrón Outbox para confirmación por correo (RF-AGE-06)
      const clienteRes = await client.query(
        'SELECT correo FROM clientes WHERE cliente_id = $1 LIMIT 1',
        [cita.clienteId]
      );

      if (clienteRes.rows.length > 0 && clienteRes.rows[0].correo) {
        await client.query(
          `INSERT INTO notificaciones_correo (
            sede_id,
            cita_id,
            correo_destino,
            asunto,
            estado
          ) VALUES ($1, $2, $3, $4, 'pendiente');`,
          [
            cita.sedeId,
            citaId,
            clienteRes.rows[0].correo,
            `Confirmación de Reserva SmartBarber - Código: ${cita.codigoReserva}`
          ]
        );
      }

      return CitaMapper.citaToDomain(createdCitaRow, insertedServicios);
    };

    if (providedClient) {
      try {
        return await executeLogic(providedClient);
      } catch (err) {
        throw mapDatabaseError(err, 'Error al crear la cita');
      }
    } else {
      return await runTransaction(executeLogic);
    }
  }

  async updateEstado(citaId, { nuevoEstado, observacion = null, motivoCancelacion = null, cambiadoPorUsuarioId = null }, { client: providedClient } = {}) {
    const executeLogic = async (client) => {
      // 1. Obtener estado previo
      const actualRes = await client.query(
        'SELECT estado FROM citas WHERE cita_id = $1 FOR UPDATE LIMIT 1',
        [citaId]
      );
      if (actualRes.rows.length === 0) {
        throw new Error(`Cita con ID ${citaId} no encontrada`);
      }
      const estadoAnterior = actualRes.rows[0].estado;

      // 2. Actualizar cita
      const updatedRes = await client.query(
        `UPDATE citas 
         SET estado = $1,
             motivo_cancelacion = COALESCE($2, motivo_cancelacion)
         WHERE cita_id = $3
         RETURNING *;`,
        [nuevoEstado, motivoCancelacion, citaId]
      );

      // 3. Registrar auditoría inmutable
      await client.query(
        `INSERT INTO historial_estados_citas (
          cita_id,
          estado_anterior,
          estado_nuevo,
          observacion,
          cambiado_por_usuario_id
        ) VALUES ($1, $2, $3, $4, $5);`,
        [citaId, estadoAnterior, nuevoEstado, observacion, cambiadoPorUsuarioId]
      );

      return CitaMapper.citaToDomain(updatedRes.rows[0]);
    };

    if (providedClient) {
      try {
        return await executeLogic(providedClient);
      } catch (err) {
        throw mapDatabaseError(err, 'Error al actualizar estado de la cita');
      }
    } else {
      return await runTransaction(executeLogic);
    }
  }

  async countCitasActivasClienteFecha(clienteId, fecha, { client } = {}) {
    const executor = client || this.pool;
    try {
      const result = await executor.query(
        `SELECT COUNT(*)::int as total
         FROM citas
         WHERE cliente_id = $1 AND fecha = $2 AND estado IN ('pendiente', 'confirmada')`,
        [clienteId, fecha]
      );
      return result.rows[0].total;
    } catch (error) {
      throw mapDatabaseError(error, 'Error al contar citas activas del cliente');
    }
  }

  async countCitasFuturasActivasCliente(clienteId, { client } = {}) {
    const executor = client || this.pool;
    try {
      const result = await executor.query(
        `SELECT COUNT(*)::int as total
         FROM citas
         WHERE cliente_id = $1 
           AND estado IN ('pendiente', 'confirmada')
           AND inicio_en >= NOW()`,
        [clienteId]
      );
      return result.rows[0].total;
    } catch (error) {
      throw mapDatabaseError(error, 'Error al contar citas futuras activas del cliente');
    }
  }
}
