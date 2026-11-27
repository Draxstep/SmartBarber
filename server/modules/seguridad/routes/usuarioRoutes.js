/**
 * @file usuarioRoutes.js
 * @description Rutas HTTP para administración de usuarios (CU-002, RBAC: Administrador).
 */
import { Router } from 'express';
import { UsuarioController } from '../controllers/UsuarioController.js';
import { AuthController } from '../controllers/AuthController.js';
import { authenticate } from '../../../shared/middlewares/authenticate.js';
import { authorize } from '../../../shared/middlewares/authorize.js';
import { validate } from '../../../shared/middlewares/validate.js';
import { createUsuarioSchema, updateUsuarioSchema, cambiarContrasenaSchema } from '../dto/seguridadDto.js';

export const usuarioRouter = Router();
const controller = new UsuarioController();
const authController = new AuthController();

// Todas las rutas de usuarios requieren autenticación y rol de administrador
usuarioRouter.use(authenticate);

usuarioRouter.get('/', authorize(['administrador']), controller.list);
usuarioRouter.get('/:id', authorize(['administrador']), controller.getById);
usuarioRouter.post('/', authorize(['administrador']), validate({ body: createUsuarioSchema }), controller.create);
usuarioRouter.put('/:id', authorize(['administrador']), validate({ body: updateUsuarioSchema }), controller.update);
usuarioRouter.post(
  '/:id/cambiar-contrasena',
  authorize(['administrador']),
  validate({ body: cambiarContrasenaSchema }),
  authController.cambiarContrasena
);
