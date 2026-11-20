/**
 * @file InventarioPgRepository.js
 * @description Implementación en PostgreSQL del repositorio de Inventario y Kardex.
 */
import { IInventarioRepository } from './IInventarioRepository.js';
import { InventarioMapper } from '../mappers/inventarioMapper.js';
import { getDatabasePool } from '../../../shared/database/connection.js';
import { mapDatabaseError } from '../../../shared/database/errors.js';
import { runTransaction } from '../../../shared/database/transaction.js';
import { InsufficientStockError } from '../../../shared/errors/domainErrors.js';

export class InventarioPgRepository extends IInventarioRepository {
  constructor(pool = null) {
    super();
    this.pool = pool || getDatabasePool();
  }

  async findById(id, { client } = {}) {
    const executor = client || this.pool;
    try {
      const result = await executor.query(
        'SELECT * FROM productos_inventario WHERE producto_id = $1 LIMIT 1',
        [id]
      );
      return InventarioMapper.productoToDomain(result.rows[0]);
    } catch (error) {
      throw mapDatabaseError(error, `Error al buscar producto con ID ${id}`);
    }
  }

  async findBySede(sedeId, { categoria = null, activosSolo = true } = {}, { client } = {}) {
    const executor = client || this.pool;
    try {
      let query = 'SELECT * FROM productos_inventario WHERE sede_id = $1';
      const params = [sedeId];
      let paramIndex = 2;

      if (activosSolo) {
        query += " AND estado = 'activo'";
      }
      if (categoria) {
        query += ` AND categoria = $${paramIndex++}`;
        params.push(categoria);
      }

      query += ' ORDER BY nombre ASC';

      const result = await executor.query(query, params);
      return result.rows.map(InventarioMapper.productoToDomain);
    } catch (error) {
      throw mapDatabaseError(error, `Error al listar productos de la sede ${sedeId}`);
    }
  }

  async findAlertasStock(sedeId, { client } = {}) {
    const executor = client || this.pool;
    try {
      // RN-11: Consulta directa optimizada mediante índice parcial idx_productos_inventario_alerta_stock
      const result = await executor.query(
        `SELECT * FROM productos_inventario
         WHERE sede_id = $1 
           AND estado = 'activo' 
           AND stock_actual <= stock_minimo
         ORDER BY stock_actual ASC, nombre ASC`,
        [sedeId]
      );
      return result.rows.map(InventarioMapper.productoToDomain);
    } catch (error) {
      throw mapDatabaseError(error, 'Error al consultar alertas de stock bajo');
    }
  }

  async saveProducto(producto, { client } = {}) {
    const executor = client || this.pool;
    try {
      const result = await executor.query(
        `INSERT INTO productos_inventario (
          producto_id,
          sede_id,
          sku,
          nombre,
          categoria,
          precio_venta_cop,
          costo_unitario_cop,
          stock_actual,
          stock_minimo,
          estado
        ) VALUES (
          COALESCE($1, gen_random_uuid()), $2, $3, $4, $5, $6, $7, $8, $9, $10
        )
        ON CONFLICT (producto_id) DO UPDATE SET
          sku = EXCLUDED.sku,
          nombre = EXCLUDED.nombre,
          categoria = EXCLUDED.categoria,
          precio_venta_cop = EXCLUDED.precio_venta_cop,
          costo_unitario_cop = EXCLUDED.costo_unitario_cop,
          stock_minimo = EXCLUDED.stock_minimo,
          estado = EXCLUDED.estado
        RETURNING *;`,
        [
          producto.productoId || null,
          producto.sedeId,
          producto.sku,
          producto.nombre,
          producto.categoria,
          producto.precioVentaCop,
          producto.costoUnitarioCop,
          producto.stockActual,
          producto.stockMinimo,
          producto.estado
        ]
      );
      return InventarioMapper.productoToDomain(result.rows[0]);
    } catch (error) {
      throw mapDatabaseError(error, 'Error al guardar producto');
    }
  }

  async registrarMovimiento(params, { client: providedClient } = {}) {
    const executeLogic = async (client) => {
      const {
        sedeId,
        productoId,
        tipo,
        subtipo,
        cantidad,
        costoUnitarioCop = null,
        precioUnitarioCop = null,
        metodoPago = null,
        registroCorteId = null,
        observacion = null,
        usuarioId
      } = params;

      // 1. Bloqueo pesimista de fila para prevenir condiciones de carrera (RN-10)
      const prodRes = await client.query(
        'SELECT stock_actual, precio_venta_cop FROM productos_inventario WHERE producto_id = $1 FOR UPDATE LIMIT 1',
        [productoId]
      );

      if (prodRes.rows.length === 0) {
        throw new Error(`Producto con ID ${productoId} no encontrado`);
      }

      const stockAnterior = prodRes.rows[0].stock_actual;
      let stockResultante = stockAnterior;

      if (tipo === 'entrada') {
        stockResultante = stockAnterior + cantidad;
      } else if (tipo === 'salida') {
        if (stockAnterior < cantidad) {
          throw new InsufficientStockError(productoId, stockAnterior, cantidad);
        }
        stockResultante = stockAnterior - cantidad;
      }

      // 2. Calcular valoración del movimiento
      let valorTotalCop = null;
      if (subtipo === 'venta_publico' && precioUnitarioCop) {
        valorTotalCop = Math.round(precioUnitarioCop * cantidad);
      } else if (costoUnitarioCop) {
        valorTotalCop = Math.round(costoUnitarioCop * cantidad);
      }

      // 3. Actualizar existencia en productos_inventario
      const updatedProdRes = await client.query(
        'UPDATE productos_inventario SET stock_actual = $1 WHERE producto_id = $2 RETURNING *',
        [stockResultante, productoId]
      );

      // 4. Insertar registro strictly append-only en movimientos_inventario (Kardex)
      const movRes = await client.query(
        `INSERT INTO movimientos_inventario (
          sede_id,
          producto_id,
          tipo,
          subtipo,
          cantidad,
          stock_anterior,
          stock_resultante,
          costo_unitario_cop,
          precio_unitario_cop,
          valor_total_cop,
          metodo_pago,
          registro_corte_id,
          observacion,
          usuario_id
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14
        ) RETURNING *;`,
        [
          sedeId,
          productoId,
          tipo,
          subtipo,
          cantidad,
          stockAnterior,
          stockResultante,
          costoUnitarioCop,
          precioUnitarioCop,
          valorTotalCop,
          metodoPago,
          registroCorteId,
          observacion,
          usuarioId
        ]
      );

      return {
        producto: InventarioMapper.productoToDomain(updatedProdRes.rows[0]),
        movimiento: InventarioMapper.movimientoToDomain(movRes.rows[0])
      };
    };

    if (providedClient) {
      try {
        return await executeLogic(providedClient);
      } catch (err) {
        throw mapDatabaseError(err, 'Error al registrar movimiento de Kardex');
      }
    } else {
      return await runTransaction(executeLogic);
    }
  }

  async getKardexByProducto(productoId, { client } = {}) {
    const executor = client || this.pool;
    try {
      const result = await executor.query(
        'SELECT * FROM movimientos_inventario WHERE producto_id = $1 ORDER BY creado_en DESC',
        [productoId]
      );
      return result.rows.map(InventarioMapper.movimientoToDomain);
    } catch (error) {
      throw mapDatabaseError(error, `Error al obtener Kardex del producto ${productoId}`);
    }
  }
}
