/**
 * @file authRoutes.js
 * @description Rutas HTTP para autenticación, sesión y cambio de contraseña (CU-001).
 */
import { Router } from 'express';
import { AuthController } from '../controllers/AuthController.js';
import { validate } from '../../../shared/middlewares/validate.js';
import { authenticate } from '../../../shared/middlewares/authenticate.js';
import { loginSchema, cambiarContrasenaSchema } from '../dto/seguridadDto.js';

export const authRouter = Router();
const controller = new AuthController();

// Login público de usuarios del Backoffice (CU-001)
authRouter.post('/login', validate({ body: loginSchema }), controller.login);

// Rutas protegidas por JWT
authRouter.get('/me', authenticate, controller.me);
authRouter.post('/logout', authenticate, controller.logout);
authRouter.post(
  '/cambiar-contrasena',
  authenticate,
  validate({ body: cambiarContrasenaSchema }),
  controller.cambiarContrasena
);
