/**
 * @file servicioRoutes.js
 * @description Rutas HTTP para catálogo de servicios (CU-014, CU-015).
 */
import { Router } from 'express';
import { ServicioController } from '../controllers/ServicioController.js';
import { authenticate } from '../../../shared/middlewares/authenticate.js';
import { authorize } from '../../../shared/middlewares/authorize.js';
import { validate } from '../../../shared/middlewares/validate.js';
import { createServicioSchema, updateServicioSchema } from '../dto/servicioDto.js';

export const servicioRouter = Router();
const controller = new ServicioController();

// Consulta pública o autenticada de catálogo
servicioRouter.get('/', authenticate, controller.list);
servicioRouter.get('/:id', authenticate, controller.getById);

// Operaciones exclusivas del Administrador (CU-014, RNF-10)
servicioRouter.post(
  '/',
  authenticate,
  authorize(['administrador']),
  validate({ body: createServicioSchema }),
  controller.create
);

servicioRouter.put(
  '/:id',
  authenticate,
  authorize(['administrador']),
  validate({ body: updateServicioSchema }),
  controller.update
);

servicioRouter.patch(
  '/:id/estado',
  authenticate,
  authorize(['administrador']),
  controller.toggleEstado
);
