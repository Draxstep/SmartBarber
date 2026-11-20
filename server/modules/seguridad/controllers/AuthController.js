/**
 * @file AuthController.js
 * @description Controlador HTTP para endpoints de autenticación y sesión (CU-001).
 */
import { AuthService } from '../services/AuthService.js';
import { sendSuccess } from '../../../shared/utils/response.js';

export class AuthController {
  constructor(authService = null) {
    this.authService = authService || new AuthService();
  }

  login = async (req, res, next) => {
    try {
      const { correo, contrasena } = req.body;
      const clientIp = req.ip || req.headers['x-forwarded-for']?.split(',')[0].trim() || req.socket.remoteAddress;
      const userAgent = req.headers['user-agent'] || null;
      const resultado = await this.authService.login(correo, contrasena, { ip: clientIp, userAgent });
      return sendSuccess(res, resultado, 200);
    } catch (error) {
      next(error);
    }
  };

  logout = async (req, res, next) => {
    try {
      const resultado = await this.authService.logout(req.user.id);
      return sendSuccess(res, resultado, 200);
    } catch (error) {
      next(error);
    }
  };

  me = async (req, res, next) => {
    try {
      return sendSuccess(res, { usuario: req.user }, 200);
    } catch (error) {
      next(error);
    }
  };

  cambiarContrasena = async (req, res, next) => {
    try {
      const usuarioId = req.params.id || req.user.id;
      const { contrasenaActual, nuevaContrasena } = req.body;
      const resultado = await this.authService.cambiarContrasena(
        usuarioId,
        { contrasenaActual, nuevaContrasena },
        req.user
      );
      return sendSuccess(res, resultado, 200);
    } catch (error) {
      next(error);
    }
  };
}
