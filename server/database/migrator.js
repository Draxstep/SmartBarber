/**
 * @file migrator.js
 * @description Ejecutor de migraciones de base de datos para PostgreSQL.
 * Ejecuta todos los scripts SQL de migrations/ en orden alfanumérico.
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
    const migrationsDir = path.join(__dirname, 'migrations');
    const files = await fs.readdir(migrationsDir);
    const sqlFiles = files.filter((f) => f.endsWith('.sql')).sort();

    console.log(`📂 Archivos de migración encontrados: ${sqlFiles.length}`);

    for (const file of sqlFiles) {
      const filePath = path.join(migrationsDir, file);
      console.log(`📄 Ejecutando migración: ${file}...`);
      const sql = await fs.readFile(filePath, 'utf-8');
      await client.query(sql);
      console.log(`✅ Migración ${file} completada con éxito.`);
    }

    console.log('🔍 Verificando tablas creadas en el esquema public...');
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
