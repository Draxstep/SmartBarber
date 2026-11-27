/**
 * @file env.js
 * @description Esquema de validación y carga fail-fast de variables de entorno para el backend.
 */
import dotenv from 'dotenv';
import { z } from 'zod';

// Carga el archivo .env si existe en el entorno de ejecución
dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().positive().default(3001),
  TZ: z.string().default('America/Bogota'),

  // Conexión obligatoria a PostgreSQL con formato URI
  DATABASE_URL: z
    .string({
      required_error: 'DATABASE_URL es obligatoria en las variables de entorno'
    })
    .url('DATABASE_URL debe ser una URL válida (ej: postgres://user:pass@host:5432/db)'),

  // Configuración de SSL para la base de datos
  DB_SSL: z
    .string()
    .transform((val) => val === 'true' || val === '1')
    .default('true'),

  DB_SSL_REJECT_UNAUTHORIZED: z
    .string()
    .transform((val) => val === 'true' || val === '1')
    .default('false'),

  // Configuración del Pool
  DB_POOL_MIN: z.coerce.number().int().nonnegative().default(2),
  DB_POOL_MAX: z.coerce.number().int().positive().default(20),
  DB_CONNECTION_TIMEOUT_MS: z.coerce.number().int().positive().default(10000),
  DB_IDLE_TIMEOUT_MS: z.coerce.number().int().positive().default(30000),

  // Configuración de Seguridad y JWT (RNF-09, RNF-10)
  JWT_SECRET: z.string().min(16).default('smartbarber_jwt_secret_super_secure_key_2026_dev_mvp_key!#$'),
  JWT_EXPIRES_IN: z.string().default('8h'),
  CORS_ORIGIN: z.string().default('*'),

  // Configuración opcional Web Push VAPID (RFC 8292)
  VAPID_PUBLIC_KEY: z.string().optional(),
  VAPID_PRIVATE_KEY: z.string().optional(),
  VAPID_SUBJECT: z.string().default('mailto:soporte@smartbarber.co')
});

let parsedEnv;

try {
  parsedEnv = envSchema.parse(process.env);
} catch (error) {
  if (error instanceof z.ZodError) {
    const errorDetails = error.issues
      .map((issue) => `  - [${issue.path.join('.')}] ${issue.message}`)
      .join('\n');
    console.error('❌ ERROR FATAL: Validación de variables de entorno falló al arranque:\n' + errorDetails);
  } else {
    console.error('❌ ERROR FATAL inesperado cargando variables de entorno:', error);
  }
  process.exit(1);
}

export const env = Object.freeze(parsedEnv);
