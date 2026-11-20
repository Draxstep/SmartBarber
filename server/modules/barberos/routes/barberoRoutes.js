/**
 * @file barberoRoutes.js
 * @description Rutas HTTP para gestión de barberos, horarios, bloqueos y liquidaciones (CU-009 a CU-013).
 */
import { Router } from 'express';
import { BarberoController } from '../controllers/BarberoController.js';
import { authenticate } from '../../../shared/middlewares/authenticate.js';
import { authorize } from '../../../shared/middlewares/authorize.js';
import { validate } from '../../../shared/middlewares/validate.js';
import { createBarberoSchema, updateBarberoSchema, createBloqueoSchema } from '../dto/barberoDto.js';

export const barberoRouter = Router();
const controller = new BarberoController();

barberoRouter.use(authenticate);

// Listado y consulta individual
barberoRouter.get('/', controller.list);
barberoRouter.get('/liquidaciones', controller.getLiquidacion);
barberoRouter.get('/:id', controller.getById);

// Horarios y Bloqueos (Admin y Barbero propio)
barberoRouter.get('/:id/horarios', controller.getHorarios);
barberoRouter.post('/:id/horarios', authorize(['administrador', 'barbero']), controller.configurarHorarios);

barberoRouter.get('/:id/bloqueos', controller.getBloqueos);
barberoRouter.post(
  '/:id/bloqueos',
  authorize(['administrador', 'barbero']),
  validate({ body: createBloqueoSchema.partial({ sedeId: true, creadoPorUsuarioId: true }) }),
  controller.crearBloqueo
);
barberoRouter.delete(
  '/:id/bloqueos/:bloqueoId',
  authorize(['administrador', 'barbero']),
  controller.eliminarBloqueo
);

// Administración de perfiles (Exclusivo Administrador: CU-009, CU-010)
barberoRouter.post(
  '/',
  authorize(['administrador']),
  validate({ body: createBarberoSchema }),
  controller.create
);

barberoRouter.put(
  '/:id',
  authorize(['administrador']),
  validate({ body: updateBarberoSchema }),
  controller.update
);

barberoRouter.patch(
  '/:id/desactivar',
  authorize(['administrador']),
  controller.desactivar
);
