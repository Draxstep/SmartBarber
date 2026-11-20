/**
 * @file health.js
 * @description Utilidad de verificación de salud y conectividad real contra PostgreSQL.
 */
import { getDatabasePool } from './connection.js';

/**
 * @typedef {object} DatabaseHealthResult
 * @property {boolean} ok
 * @property {number} latencyMs
 * @property {string} [serverTime]
 * @property {string} [version]
 * @property {object} pool
 * @property {number} pool.totalCount
 * @property {number} pool.idleCount
 * @property {number} pool.waitingCount
 * @property {string} [error]
 */

/**
 * Realiza un chequeo activo de salud contra la base de datos configurada en DATABASE_URL
 * @returns {Promise<DatabaseHealthResult>}
 */
export async function checkDatabaseHealth() {
  const pool = getDatabasePool();
  const start = Date.now();

  try {
    const result = await pool.query(`
      SELECT 
        1 AS alive, 
        NOW() AS server_time, 
        version() AS server_version,
        current_setting('TIMEZONE') AS configured_timezone;
    `);

    const latencyMs = Date.now() - start;
    const row = result.rows[0];

    return {
      ok: true,
      latencyMs,
      serverTime: row.server_time.toISOString(),
      configuredTimezone: row.configured_timezone,
      version: row.server_version,
      pool: {
        totalCount: pool.totalCount,
        idleCount: pool.idleCount,
        waitingCount: pool.waitingCount
      }
    };
  } catch (error) {
    const latencyMs = Date.now() - start;
    return {
      ok: false,
      latencyMs,
      error: error.message,
      pool: {
        totalCount: pool.totalCount,
        idleCount: pool.idleCount,
        waitingCount: pool.waitingCount
      }
    };
  }
}
