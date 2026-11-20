/**
 * @file RegistroCortePgRepository.js
 * @description Implementación en PostgreSQL del repositorio de Registro de Cortes y Caja.
 */
import { IRegistroCorteRepository } from './IRegistroCorteRepository.js';
import { CorteMapper } from '../mappers/corteMapper.js';
import { getDatabasePool } from '../../../shared/database/connection.js';
import { mapDatabaseError } from '../../../shared/database/errors.js';
import { runTransaction } from '../../../shared/database/transaction.js';

export class RegistroCortePgRepository extends IRegistroCorteRepository {
  constructor(pool = null) {
    super();
    this.pool = pool || getDatabasePool();
  }

  async findById(id, { client } = {}) {
    const executor = client || this.pool;
    try {
      const corteRes = await executor.query(
        'SELECT * FROM registros_cortes WHERE registro_corte_id = $1 LIMIT 1',
        [id]
      );
      if (corteRes.rows.length === 0) return null;

      const servRes = await executor.query(
        'SELECT * FROM registros_cortes_servicios WHERE registro_corte_id = $1',
        [id]
      );

      return CorteMapper.corteToDomain(corteRes.rows[0], servRes.rows);
    } catch (error) {
      throw mapDatabaseError(error, `Error al buscar registro de corte con ID ${id}`);
    }
  }

  async findByCitaId(citaId, { client } = {}) {
    const executor = client || this.pool;
    try {
      const corteRes = await executor.query(
        "SELECT * FROM registros_cortes WHERE cita_id = $1 AND estado = 'activo' LIMIT 1",
        [citaId]
      );
      if (corteRes.rows.length === 0) return null;

      const servRes = await executor.query(
        'SELECT * FROM registros_cortes_servicios WHERE registro_corte_id = $1',
        [corteRes.rows[0].registro_corte_id]
      );

      return CorteMapper.corteToDomain(corteRes.rows[0], servRes.rows);
    } catch (error) {
      throw mapDatabaseError(error, `Error al buscar registro de corte por cita ${citaId}`);
    }
  }

  async findHistorialDiario({ sedeId, fechaInicio, fechaFin, barberoId = null, estado = null }, { client } = {}) {
    const executor = client || this.pool;
    try {
      let query = `
        SELECT rc.*,
          COALESCE(
            json_agg(
              json_build_object(
                'registro_corte_servicio_id', rcs.registro_corte_servicio_id,
                'servicio_id', rcs.servicio_id,
                'nombre_servicio_snapshot', rcs.nombre_servicio_snapshot,
                'precio_cop_snapshot', rcs.precio_cop_snapshot
              )
            ) FILTER (WHERE rcs.registro_corte_servicio_id IS NOT NULL), '[]'
          ) as servicios_json
        FROM registros_cortes rc
        LEFT JOIN registros_cortes_servicios rcs ON rc.registro_corte_id = rcs.registro_corte_id
        WHERE rc.sede_id = $1 
          AND rc.fecha_hora_atencion >= $2::timestamptz 
          AND rc.fecha_hora_atencion <= $3::timestamptz
      `;
      const params = [sedeId, fechaInicio, fechaFin];
      let paramIndex = 4;

      if (barberoId) {
        query += ` AND rc.barbero_id = $${paramIndex++}`;
        params.push(barberoId);
      }
      if (estado) {
        query += ` AND rc.estado = $${paramIndex++}`;
        params.push(estado);
      }

      query += ' GROUP BY rc.registro_corte_id ORDER BY rc.fecha_hora_atencion DESC';

      const result = await executor.query(query, params);
      return result.rows.map((row) =>
        CorteMapper.corteToDomain(row, row.servicios_json || [])
      );
    } catch (error) {
      throw mapDatabaseError(error, 'Error al consultar historial diario de cortes');
    }
  }

  async createWithServices(corte, serviciosSnapshots, { client: providedClient } = {}) {
    const executeLogic = async (client) => {
      // 1. Inserción del registro de corte
      const corteRes = await client.query(
        `INSERT INTO registros_cortes (
          registro_corte_id,
          sede_id,
          cita_id,
          barbero_id,
          cliente_id,
          nombre_cliente_referencial,
          origen,
          fecha_hora_atencion,
          precio_calculado_cop,
          precio_cobrado_cop,
          metodo_pago,
          porcentaje_comision_snapshot,
          comision_calculada_cop,
          notas,
          estado,
          registrado_por_usuario_id
        ) VALUES (
          COALESCE($1, gen_random_uuid()), $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16
        )
        RETURNING *;`,
        [
          corte.registroCorteId || null,
          corte.sedeId,
          corte.citaId || null,
          corte.barberoId,
          corte.clienteId || null,
          corte.nombreClienteReferencial || null,
          corte.origen,
          corte.fechaHoraAtencion,
          corte.precioCalculadoCop,
          corte.precioCobradoCop,
          corte.metodoPago,
          corte.porcentajeComisionSnapshot,
          corte.comisionCalculadaCop,
          corte.notas || null,
          corte.estado,
          corte.registradoPorUsuarioId
        ]
      );

      const createdCorteRow = corteRes.rows[0];
      const corteId = createdCorteRow.registro_corte_id;

      // 2. Inserción de líneas de servicio
      const insertedServicios = [];
      for (const serv of serviciosSnapshots) {
        const servRes = await client.query(
          `INSERT INTO registros_cortes_servicios (
            registro_corte_id,
            servicio_id,
            nombre_servicio_snapshot,
            precio_cop_snapshot
          ) VALUES ($1, $2, $3, $4)
          RETURNING *;`,
          [
            corteId,
            serv.servicioId,
            serv.nombreServicioSnapshot,
            serv.precioCopSnapshot
          ]
        );
        insertedServicios.push(servRes.rows[0]);
      }

      return CorteMapper.corteToDomain(createdCorteRow, insertedServicios);
    };

    if (providedClient) {
      try {
        return await executeLogic(providedClient);
      } catch (err) {
        throw mapDatabaseError(err, 'Error al registrar corte en caja');
      }
    } else {
      return await runTransaction(executeLogic);
    }
  }

  async anular(registroCorteId, { motivoAnulacion, anuladoPorUsuarioId }, { client } = {}) {
    const executor = client || this.pool;
    try {
      const result = await executor.query(
        `UPDATE registros_cortes
         SET estado = 'anulado',
             motivo_anulacion = $1,
             anulado_por_usuario_id = $2,
             anulado_en = NOW()
         WHERE registro_corte_id = $3 AND estado = 'activo'
         RETURNING *;`,
        [motivoAnulacion, anuladoPorUsuarioId, registroCorteId]
      );

      if (result.rows.length === 0) {
        throw new Error(`Registro de corte ${registroCorteId} no encontrado o ya anulado`);
      }

      return CorteMapper.corteToDomain(result.rows[0]);
    } catch (error) {
      throw mapDatabaseError(error, `Error al anular registro de corte ${registroCorteId}`);
    }
  }

  async getResumenIngresos({ sedeId, fechaInicio, fechaFin, barberoId = null }, { client } = {}) {
    const executor = client || this.pool;
    try {
      let query = `
        SELECT 
          COUNT(*)::int as total_atenciones,
          COALESCE(SUM(precio_cobrado_cop), 0)::numeric as total_ingresos_cop,
          COALESCE(SUM(comision_calculada_cop), 0)::numeric as total_comisiones_cop,
          COALESCE(SUM(CASE WHEN metodo_pago = 'efectivo' THEN precio_cobrado_cop ELSE 0 END), 0)::numeric as total_efectivo_cop,
          COALESCE(SUM(CASE WHEN metodo_pago = 'transferencia_bancaria' THEN precio_cobrado_cop ELSE 0 END), 0)::numeric as total_transferencia_cop,
          COALESCE(SUM(CASE WHEN metodo_pago = 'tarjeta_debito_credito' THEN precio_cobrado_cop ELSE 0 END), 0)::numeric as total_tarjeta_cop,
          COALESCE(SUM(CASE WHEN metodo_pago = 'nequi' THEN precio_cobrado_cop ELSE 0 END), 0)::numeric as total_nequi_cop,
          COALESCE(SUM(CASE WHEN metodo_pago = 'daviplata' THEN precio_cobrado_cop ELSE 0 END), 0)::numeric as total_daviplata_cop
        FROM registros_cortes
        WHERE sede_id = $1 
          AND estado = 'activo'
          AND fecha_hora_atencion >= $2::timestamptz
          AND fecha_hora_atencion <= $3::timestamptz
      `;
      const params = [sedeId, fechaInicio, fechaFin];

      if (barberoId) {
        query += ' AND barbero_id = $4';
        params.push(barberoId);
      }

      const result = await executor.query(query, params);
      const row = result.rows[0];

      return {
        totalAtenciones: row.total_atenciones,
        totalIngresosCop: Number(row.total_ingresos_cop),
        totalComisionesCop: Number(row.total_comisiones_cop),
        desgloseMetodosPago: {
          efectivo: Number(row.total_efectivo_cop),
          transferenciaBancaria: Number(row.total_transferencia_cop),
          tarjetaDebitoCredito: Number(row.total_tarjeta_cop),
          nequi: Number(row.total_nequi_cop),
          daviplata: Number(row.total_daviplata_cop)
        }
      };
    } catch (error) {
      throw mapDatabaseError(error, 'Error al calcular resumen de ingresos de caja');
    }
  }
}
