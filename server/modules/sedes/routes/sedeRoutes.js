/**
 * @file sedeRoutes.js
 * @description Rutas HTTP para configuración de la sede (CU-003).
 */
import { Router } from 'express';
import { SedeController } from '../controllers/SedeController.js';
import { authenticate } from '../../../shared/middlewares/authenticate.js';
import { authorize } from '../../../shared/middlewares/authorize.js';
import { validate } from '../../../shared/middlewares/validate.js';
import { updateSedeSchema } from '../dto/sedeDto.js';

export const sedeRouter = Router();
const controller = new SedeController();

// Consulta de sede principal (permitida a usuarios autenticados)
sedeRouter.get('/principal', authenticate, controller.getPrincipal);
sedeRouter.get('/:id', authenticate, controller.getById);

// Edición de parámetros de sede (exclusivo Administrador: CU-003, RNF-10)
sedeRouter.put(
  '/:id',
  authenticate,
  authorize(['administrador']),
  validate({ body: updateSedeSchema }),
  controller.update
);
