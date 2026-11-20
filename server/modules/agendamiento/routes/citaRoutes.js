/**
 * @file citaRoutes.js
 * @description Rutas HTTP autenticadas para gestión de agenda y citas en el Backoffice (CU-022, CU-023, CU-024).
 */
import { Router } from 'express';
import { CitaController } from '../controllers/CitaController.js';
import { authenticate } from '../../../shared/middlewares/authenticate.js';
import { authorize } from '../../../shared/middlewares/authorize.js';
import { validate } from '../../../shared/middlewares/validate.js';
import { createCitaManualSchema, cambiarEstadoCitaSchema } from '../dto/citaDto.js';

export const citaRouter = Router();
const controller = new CitaController();

citaRouter.use(authenticate);

// Consulta de agenda diaria/semanal (CU-022, RBAC: 'P' barbero, 'G' admin)
citaRouter.get('/agenda', controller.getAgenda);

// Detalle de cita por ID
citaRouter.get('/:id', controller.getById);

// Registro manual de cita (CU-024, exclusivo Administrador)
citaRouter.post(
  '/manual',
  authorize(['administrador']),
  validate({ body: createCitaManualSchema }),
  controller.crearManual
);

// Cambio de estado de la cita (CU-023, ciclo de vida)
citaRouter.patch(
  '/:id/estado',
  validate({ body: cambiarEstadoCitaSchema }),
  controller.cambiarEstado
);
