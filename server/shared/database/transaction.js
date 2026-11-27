/**
 * @file transaction.js
 * @description Gestor de transacciones ACID (Transaction Runner / Unit of Work) para PostgreSQL.
 */
import { getDatabasePool } from './connection.js';
import { mapDatabaseError } from './errors.js';

/**
 * Niveles de aislamiento soportados en transacciones PostgreSQL
 * @readonly
 * @enum {string}
 */
export const IsolationLevel = Object.freeze({
  READ_COMMITTED: 'READ COMMITTED',
  REPEATABLE_READ: 'REPEATABLE READ',
  SERIALIZABLE: 'SERIALIZABLE'
});

/**
 * Ejecuta una operación atómica dentro de una transacción ACID gestionada.
 * Si la función callback se ejecuta exitosamente, confirma con COMMIT.
 * Ante cualquier excepción, ejecuta ROLLBACK y traduce el error a una excepción de dominio.
 *
 * @template T
 * @param {(client: import('pg').PoolClient) => Promise<T>} callback
 * @param {string} [isolationLevel=IsolationLevel.READ_COMMITTED]
 * @returns {Promise<T>}
 */
export async function runTransaction(callback, isolationLevel = IsolationLevel.READ_COMMITTED) {
  const pool = getDatabasePool();
  const client = await pool.connect();

  try {
    if (isolationLevel && isolationLevel !== IsolationLevel.READ_COMMITTED) {
      await client.query(`BEGIN TRANSACTION ISOLATION LEVEL ${isolationLevel}`);
    } else {
      await client.query('BEGIN');
    }

    const result = await callback(client);

    await client.query('COMMIT');
    return result;
  } catch (error) {
    try {
      await client.query('ROLLBACK');
    } catch (rollbackError) {
      console.error('⚠️ Error al revertir la transacción (ROLLBACK):', rollbackError.message);
    }
    throw mapDatabaseError(error, 'Fallo en transacción atómica');
  } finally {
    client.release();
  }
}
