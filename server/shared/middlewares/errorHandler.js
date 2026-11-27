/**
 * @file errorHandler.js
 * @description Middleware centralizado de manejo y formateo de errores HTTP para Express.
 */
import { DomainError } from '../errors/domainErrors.js';
import { env } from '../../config/env.js';

export const errorHandler = (err, req, res, next) => {
  // Errores de dominio conocidos
  if (err instanceof DomainError) {
    return res.status(err.statusCode).json({
      success: false,
      error: {
        code: err.code,
        message: err.message,
        details: err.details || null
      }
    });
  }

  // Error de sintaxis JSON en el cuerpo de la petición
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'INVALID_JSON_BODY',
        message: 'El cuerpo de la solicitud no contiene un JSON sintácticamente válido.'
      }
    });
  }

  // Log detallado de errores 500 no controlados
  console.error('🔥 [ERROR INTERNO NO CONTROLADO]:', {
    url: req.originalUrl,
    method: req.method,
    message: err.message,
    stack: err.stack
  });

  const isDev = env.NODE_ENV === 'development';

  return res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Ocurrió un error interno en el servidor. Por favor intente más tarde.',
      ...(isDev && { originalError: err.message, stack: err.stack })
    }
  });
};
