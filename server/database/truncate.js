/**
 * @file truncate.js
 * @description Vaciado completo de tablas para preparar la base de datos para producción.
 * Ejecuta TRUNCATE TABLE ... RESTART IDENTITY CASCADE sobre las 18 tablas del sistema.
 */
import { getDatabasePool, closeDatabasePool } from '../shared/database/connection.js';

export async function truncateAllTables() {
  console.log('🧹 Vaciando todas las tablas de la base de datos SmartBarber...');
  const pool = getDatabasePool();
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    await client.query(`
      TRUNCATE TABLE 
        registros_cortes_servicios,
        registros_cortes,
        citas_servicios,
        historial_estados_citas,
        citas,
        bloqueos_horarios,
        horarios_barberos,
        barberos,
        sesiones_usuarios,
        notificaciones_correo,
        sync_idempotencia,
        push_suscripciones,
        movimientos_inventario,
        productos_inventario,
        servicios,
        clientes,
        usuarios,
        sedes
      RESTART IDENTITY CASCADE;
    `);
    await client.query('COMMIT');
    console.log('✅ Base de datos vaciada exitosamente. 0 registros restantes.');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error al vaciar las tablas:', error.message);
    throw error;
  } finally {
    client.release();
  }
}

if (process.argv[1] && process.argv[1].endsWith('truncate.js')) {
  truncateAllTables()
    .then(async () => {
      await closeDatabasePool();
      process.exit(0);
    })
    .catch(async () => {
      await closeDatabasePool();
      process.exit(1);
    });
}
