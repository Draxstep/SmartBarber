/**
 * @file authorize.js
 * @description Middleware de autorización y control de acceso basado en roles (RBAC).
 */
import { ForbiddenError, UnauthorizedError } from '../errors/domainErrors.js';

/**
 * Middleware generador para restringir acceso por roles permitidos.
 * @param {string[]} allowedRoles - Lista de roles autorizados (ej: ['administrador', 'barbero'])
 */
export const authorize = (allowedRoles = []) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(new UnauthorizedError('Usuario no autenticado para verificar permisos.'));
    }

    if (allowedRoles.length > 0 && !allowedRoles.includes(req.user.rol)) {
      return next(
        new ForbiddenError(
          `Acceso denegado. Se requiere uno de los siguientes roles: [${allowedRoles.join(', ')}].`
        )
      );
    }

    next();
  };
};

/**
 * Validador para asegurar que un barbero solo opere sobre sus propios registros ('P'),
 * mientras que el administrador mantiene acceso global ('G').
 * @param {Function} resourceOwnerGetter - Función sincrónica (req) => barberoId esperado
 */
export const requireSelfOrAdmin = (resourceOwnerGetter) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(new UnauthorizedError());
    }

    if (req.user.rol === 'administrador') {
      return next(); // Administrador tiene acceso global
    }

    const expectedBarberoId = resourceOwnerGetter(req);
    if (!expectedBarberoId || req.user.barberoId !== expectedBarberoId) {
      return next(
        new ForbiddenError('Operación restringida: solo puede consultar o modificar sus propios registros.')
      );
    }

    next();
  };
};
