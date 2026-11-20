/**
 * @file app.js
 * @description Configuración central de la aplicación Express y registro de middlewares globales.
 */
import express from 'express';
import cors from 'cors';
import { env } from './config/env.js';
import { checkDatabaseHealth } from './shared/database/health.js';
import { errorHandler } from './shared/middlewares/errorHandler.js';
import { apiRouter } from './routes.js';
import { publicAgendamientoRouter } from './modules/agendamiento/routes/publicAgendamientoRoutes.js';

export const app = express();

// Middlewares base de seguridad y parsing
app.use(
  cors({
    origin: env.CORS_ORIGIN === '*' ? '*' : env.CORS_ORIGIN.split(',').map((o) => o.trim()),
    credentials: true
  })
);
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true }));

// Endpoint de salud del sistema (RNF-13)
app.get('/api/health', async (req, res) => {
  const health = await checkDatabaseHealth();
  const isUp = health.ok === true;
  res.status(isUp ? 200 : 503).json({
    success: isUp,
    status: isUp ? 'UP' : 'DOWN',
    timestamp: new Date().toISOString(),
    service: 'SmartBarber Modular Monolith Backend',
    database: {
      ...health,
      status: isUp ? 'UP' : 'DOWN'
    }
  });
});

// Rutas públicas directas (/api/public/* según SMARTBARBER_TECH_SPEC.md)
app.use('/api/public', publicAgendamientoRouter);

// Enrutador principal de la API (/api/v1/*)
app.use('/api/v1', apiRouter);

// Manejo de rutas inexistentes (404)
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'ROUTE_NOT_FOUND',
      message: `La ruta solicitada '${req.method} ${req.originalUrl}' no existe en este servidor.`
    }
  });
});

// Manejador centralizado de errores
app.use(errorHandler);
