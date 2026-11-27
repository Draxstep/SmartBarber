/**
 * @file health-check.js
 * @description Script ejecutable CLI para verificar la salud de la base de datos PostgreSQL.
 */
import { checkDatabaseHealth } from '../shared/database/health.js';
import { closeDatabasePool } from '../shared/database/connection.js';

async function run() {
  console.log('🔍 Consultando estado de salud de PostgreSQL RDS...');
  const health = await checkDatabaseHealth();
  console.log('\n--- Reporte de Salud ---');
  console.log('Estado:', health.ok ? '🟢 SALUDABLE' : '🔴 ERROR');
  console.log('Latencia:', health.latencyMs, 'ms');
  if (health.ok) {
    console.log('Hora Servidor (UTC):', health.serverTime);
    console.log('Zona Horaria:', health.configuredTimezone);
    console.log('Versión:', health.version);
    console.log('Pool de Conexiones:', health.pool);
  } else {
    console.error('Detalle del Error:', health.error);
  }
  await closeDatabasePool();
  process.exit(health.ok ? 0 : 1);
}

run();
