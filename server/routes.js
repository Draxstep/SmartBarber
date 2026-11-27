/**
 * @file routes.js
 * @description Enrutador central que agrupa las rutas de todos los módulos del Monolito Modular.
 */
import { Router } from 'express';
import { publicAgendamientoRouter } from './modules/agendamiento/routes/publicAgendamientoRoutes.js';
import { authRouter } from './modules/seguridad/routes/authRoutes.js';
import { usuarioRouter } from './modules/seguridad/routes/usuarioRoutes.js';
import { sedeRouter } from './modules/sedes/routes/sedeRoutes.js';
import { servicioRouter } from './modules/servicios/routes/servicioRoutes.js';
import { barberoRouter } from './modules/barberos/routes/barberoRoutes.js';
import { citaRouter } from './modules/agendamiento/routes/citaRoutes.js';
import { corteRouter } from './modules/cortes/routes/corteRoutes.js';
import { inventarioRouter } from './modules/inventario/routes/inventarioRoutes.js';
import { pushRouter } from './modules/seguridad/routes/pushRoutes.js';
import { syncRouter } from './modules/agendamiento/routes/syncRoutes.js';

export const apiRouter = Router();

// Verificación básica de operatividad
apiRouter.get('/ping', (req, res) => {
  res.json({ success: true, message: 'SmartBarber Modular API v1.0 operational' });
});

// Portal Público de Agendamiento y Landing Page (Sin autenticación: CU-020, CU-021, CU-025)
apiRouter.use('/public', publicAgendamientoRouter);

// Módulo 0: Seguridad, Usuarios y Sede (CU-001, CU-002, CU-003)
apiRouter.use('/auth', authRouter);
apiRouter.use('/usuarios', usuarioRouter);
apiRouter.use('/sedes', sedeRouter);

// Módulos 2 & 3: Personal y Catálogo (CU-009 a CU-015)
apiRouter.use('/servicios', servicioRouter);
apiRouter.use('/barberos', barberoRouter);

// Módulo 5: Citas en el Backoffice (CU-022, CU-023, CU-024)
apiRouter.use('/citas', citaRouter);

// Módulo 1: Caja y Registro de Cortes (CU-004 a CU-008)
apiRouter.use('/cortes', corteRouter);

// Módulo 4: Inventario y Kardex (CU-016 a CU-019)
apiRouter.use('/inventario', inventarioRouter);

// Capa PWA: Notificaciones Push VAPID y Sincronización Idempotente Outbox
apiRouter.use('/push', pushRouter);
apiRouter.use('/sync', syncRouter);
