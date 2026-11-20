/**
 * @file server.js
 * @description Punto de entrada y arranque del servidor HTTP con verificación de salud y apagado elegante.
 */
import { app } from './app.js';
import { env } from './config/env.js';
import { checkDatabaseHealth } from './shared/database/health.js';
import { closeDatabasePool } from './shared/database/connection.js';
import { iniciarCorreoWorker, detenerCorreoWorker } from './services/correo.worker.js';

async function bootstrap() {
  console.log('🚀 Iniciando backend de SmartBarber (Modular Monolith)...');

  // Verificación inicial de conectividad a BD
  const health = await checkDatabaseHealth();
  if (!health.ok) {
    console.error('❌ ERROR FATAL: No se pudo establecer conexión con PostgreSQL:', health.error);
    process.exit(1);
  }

  console.log(`✅ Base de datos conectada en ${health.latencyMs}ms (${health.database} en ${health.host})`);

  const server = app.listen(env.PORT, () => {
    console.log(`💈 Servidor SmartBarber escuchando en puerto ${env.PORT} [${env.NODE_ENV}]`);
    console.log(`🩺 Endpoint de salud: http://localhost:${env.PORT}/api/health`);
    console.log(`📡 Base API: http://localhost:${env.PORT}/api/v1`);
    iniciarCorreoWorker();
  });

  // Apagado controlado (Graceful Shutdown)
  const shutdown = async (signal) => {
    console.log(`\n🛑 Señal ${signal} recibida. Cerrando conexiones activas...`);
    detenerCorreoWorker();
    server.close(async () => {
      console.log('🚪 Servidor HTTP cerrado.');
      await closeDatabasePool();
      console.log('🏊 Pool de base de datos liberado.');
      process.exit(0);
    });

    // Forzar salida si tarda más de 10 segundos
    setTimeout(() => {
      console.error('⚠️ Apagado forzado por timeout.');
      process.exit(1);
    }, 10000).unref();
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

bootstrap().catch((err) => {
  console.error('❌ Error inesperado durante el arranque del servidor:', err);
  process.exit(1);
});
