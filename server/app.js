/**
 * @file app.js
 * @description Configuración central de la aplicación Express y registro de middlewares globales.
 */
import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { env } from './config/env.js';
import { checkDatabaseHealth } from './shared/database/health.js';
import { errorHandler } from './shared/middlewares/errorHandler.js';
import { apiRouter } from './routes.js';
import { publicAgendamientoRouter } from './modules/agendamiento/routes/publicAgendamientoRoutes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distPath = path.resolve(__dirname, '../dist');

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

// Servir frontend de producción (Portal Público + Backoffice + PWA) desde dist/
if (fs.existsSync(distPath)) {
  // 1. Service Worker con cabeceras de alcance raíz y sin caché HTTP
  app.get('/sw.js', (req, res, next) => {
    const swFile = path.join(distPath, 'sw.js');
    if (fs.existsSync(swFile)) {
      res.setHeader('Content-Type', 'application/javascript');
      res.setHeader('Service-Worker-Allowed', '/');
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      return res.sendFile(swFile);
    }
    next();
  });

  // 2. Archivos estáticos de dist (JS, CSS, imágenes, manifiesto, iconos, librerías)
  app.use(express.static(distPath, { index: false }));

  // 3. Rutas directas a las vistas HTML
  app.get('/backoffice', (req, res) => res.sendFile(path.join(distPath, 'backoffice.html')));
  app.get('/backoffice.html', (req, res) => res.sendFile(path.join(distPath, 'backoffice.html')));
  app.get('/styleguide', (req, res) => res.sendFile(path.join(distPath, 'styleguide.html')));
  app.get('/styleguide.html', (req, res) => res.sendFile(path.join(distPath, 'styleguide.html')));
  app.get('/offline.html', (req, res) => res.sendFile(path.join(distPath, 'offline.html')));
  app.get('/', (req, res) => res.sendFile(path.join(distPath, 'index.html')));

  // 4. Fallback SPA para rutas que no correspondan a la API
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) {
      return next();
    }
    if (req.path.startsWith('/backoffice')) {
      return res.sendFile(path.join(distPath, 'backoffice.html'));
    }
    return res.sendFile(path.join(distPath, 'index.html'));
  });
}

// Manejo de rutas API inexistentes (404)
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
