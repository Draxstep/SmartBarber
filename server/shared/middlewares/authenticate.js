/**
 * @file authenticate.js
 * @description Middleware de autenticación JWT y verificación de estado de cuenta/sesión.
 */
import jwt from 'jsonwebtoken';
import { env } from '../../config/env.js';
import { UnauthorizedError } from '../errors/domainErrors.js';
import { UsuarioPgRepository } from '../../modules/seguridad/repositories/UsuarioPgRepository.js';

const usuarioRepo = new UsuarioPgRepository();

/**
 * Middleware para validar el Bearer JWT en solicitudes autenticadas.
 */
export const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedError('Token de autorización no proporcionado o formato inválido.');
    }

    const token = authHeader.split(' ')[1];
    let decoded;

    try {
      decoded = jwt.verify(token, env.JWT_SECRET);
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        throw new UnauthorizedError('La sesión ha expirado. Por favor inicie sesión nuevamente.');
      }
      throw new UnauthorizedError('Token de sesión inválido.');
    }

    // Verificar en BD que el usuario siga activo y no esté bloqueado
    const usuario = await usuarioRepo.findById(decoded.id);
    if (!usuario) {
      throw new UnauthorizedError('El usuario asociado al token no existe.');
    }

    if (usuario.estado !== 'activo') {
      throw new UnauthorizedError('La cuenta de usuario se encuentra inactiva.');
    }

    if (usuario.bloqueadoHasta && new Date(usuario.bloqueadoHasta) > new Date()) {
      throw new UnauthorizedError('La cuenta se encuentra temporalmente bloqueada por intentos fallidos.');
    }

    // Adjuntar usuario verificado a la solicitud
    req.user = {
      id: usuario.usuarioId,
      correo: usuario.correo,
      rol: usuario.rol,
      sedeId: usuario.sedeId,
      barberoId: decoded.barberoId || null
    };

    next();
  } catch (error) {
    next(error);
  }
};
