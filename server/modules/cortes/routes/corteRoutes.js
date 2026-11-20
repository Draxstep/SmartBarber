/**
 * @file corteRoutes.js
 * @description Rutas HTTP para operaciones de caja y registro de cortes (CU-004 a CU-008).
 */
import { Router } from 'express';
import { CorteController } from '../controllers/CorteController.js';
import { authenticate } from '../../../shared/middlewares/authenticate.js';
import { authorize } from '../../../shared/middlewares/authorize.js';
import { validate } from '../../../shared/middlewares/validate.js';
import { walkInSchema, convertirCitaSchema, anularCorteSchema } from '../dto/corteDto.js';

export const corteRouter = Router();
const controller = new CorteController();

corteRouter.use(authenticate);

// 1. Consulta de historial de cortes y resumen diario (CU-006, CU-007)
corteRouter.get('/historial', controller.getHistorial);
corteRouter.get('/resumen', controller.getResumenIngresos);

// 2. Registro de corte sin cita (Walk-in) (CU-004, RF-COR-01)
corteRouter.post(
  '/walk-in',
  validate({ body: walkInSchema }),
  controller.registrarWalkIn
);

// 3. Conversión de cita a registro de corte (CU-005, RF-COR-02)
corteRouter.post(
  '/convertir-cita/:citaId',
  validate({ body: convertirCitaSchema }),
  controller.convertirCita
);

// 4. Anulación auditada de registro de corte (CU-008, RF-COR-05, exclusivo Administrador)
corteRouter.patch(
  '/:id/anular',
  authorize(['administrador']),
  validate({ body: anularCorteSchema }),
  controller.anularCorte
);
