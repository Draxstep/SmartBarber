/**
 * @file migrator.js
 * @description Ejecutor de migraciones de base de datos para PostgreSQL.
 */
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { getDatabasePool, closeDatabasePool } from '../shared/database/connection.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function runMigrations() {
  console.log('🚀 Iniciando ejecución de migraciones de base de datos...');
  const pool = getDatabasePool();
  const client = await pool.connect();

  try {
    const migrationPath = path.join(__dirname, 'migrations', '001_initial_schema.sql');
    console.log(`📄 Leyendo script DDL: ${migrationPath}`);
    const sql = await fs.readFile(migrationPath, 'utf-8');

    console.log('⏳ Ejecutando DDL en PostgreSQL RDS...');
    await client.query(sql);

    console.log('✅ Migración ejecutada con éxito. Verificando tablas creadas...');
    const result = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `);

    console.log(`📊 Total de tablas en el esquema 'public': ${result.rows.length}`);
    result.rows.forEach((r, idx) => {
      console.log(`   ${idx + 1}. ${r.table_name}`);
    });

    return result.rows.map((r) => r.table_name);
  } catch (error) {
    console.error('❌ Error fatal al ejecutar las migraciones:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Ejecución directa si se invoca desde la línea de comandos
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  runMigrations()
    .then(async () => {
      console.log('🏁 Proceso de migración completado satisfactoriamente.');
      await closeDatabasePool();
      process.exit(0);
    })
    .catch(async (err) => {
      console.error('💥 Falló el proceso de migración:', err.message);
      await closeDatabasePool();
      process.exit(1);
    });
}
