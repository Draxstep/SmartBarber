import bcrypt from 'bcryptjs';
import { getDatabasePool, closeDatabasePool } from '../shared/database/connection.js';

async function main() {
  const hash = await bcrypt.hash('Admin123456!', 10);
  const pool = getDatabasePool();
  await pool.query('UPDATE usuarios SET contrasena_hash = $1, intentos_fallidos = 0, bloqueado_hasta = NULL WHERE correo = $2', [hash, 'admin@smartbarber.co']);
  console.log('✅ Admin password updated to Admin123456! with valid bcrypt hash');
  await closeDatabasePool();
}

main().catch(console.error);
