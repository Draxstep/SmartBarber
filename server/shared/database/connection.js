/**
 * @file connection.js
 * @description Gestión centralizada y patrón Singleton del Pool de conexiones PostgreSQL.
 */
import pg from 'pg';
import { env } from '../../config/env.js';

const { Pool } = pg;

/**
 * Instancia única del Pool de conexiones
 * @type {pg.Pool | null}
 */
let poolInstance = null;
let isShuttingDown = false;

/**
 * Obtiene o inicializa la instancia Singleton del Pool de conexiones
 * @returns {pg.Pool}
 */
export function getDatabasePool() {
  if (poolInstance) {
    return poolInstance;
  }

  const poolConfig = {
    connectionString: env.DATABASE_URL,
    min: env.DB_POOL_MIN,
    max: env.DB_POOL_MAX,
    connectionTimeoutMillis: env.DB_CONNECTION_TIMEOUT_MS,
    idleTimeoutMillis: env.DB_IDLE_TIMEOUT_MS,
    // Garantiza que cada conexión opere estrictamente en UTC a nivel de protocolo de arranque
    options: '-c timezone=UTC',
    ssl: env.DB_SSL
      ? {
          rejectUnauthorized: env.DB_SSL_REJECT_UNAUTHORIZED
        }
      : false
  };

  poolInstance = new Pool(poolConfig);

  poolInstance.on('error', (err, client) => {
    console.error('❌ Error inesperado en el cliente inactivo del pool de PostgreSQL:', err.message);
  });

  return poolInstance;
}

/**
 * Cierre controlado (Graceful Shutdown) del pool de base de datos
 * @returns {Promise<void>}
 */
export async function closeDatabasePool() {
  if (isShuttingDown || !poolInstance) {
    return;
  }

  isShuttingDown = true;
  console.log('🔄 Cerrando el pool de conexiones de PostgreSQL...');

  try {
    await poolInstance.end();
    console.log('✅ Pool de conexiones de PostgreSQL cerrado correctamente.');
  } catch (error) {
    console.error('⚠️ Error al cerrar el pool de conexiones:', error.message);
  } finally {
    poolInstance = null;
    isShuttingDown = false;
  }
}

// Registro automático de manejadores de apagado del proceso
const handleShutdown = async (signal) => {
  console.log(`\n🛑 Señal recibida (${signal}). Iniciando apagado controlado...`);
  await closeDatabasePool();
  process.exit(0);
};

process.once('SIGINT', () => handleShutdown('SIGINT'));
process.once('SIGTERM', () => handleShutdown('SIGTERM'));
