/**
 * @file rateLimiter.js
 * @description Middleware de limitación de tasa (Rate Limiting) para protección anti-bots (RNF-11).
 */
import { TooManyRequestsError } from '../errors/domainErrors.js';

/**
 * Crea un middleware de Rate Limiting en memoria.
 * @param {Object} options
 * @param {number} options.windowMs - Ventana de tiempo en milisegundos (defecto: 15 minutos).
 * @param {number} options.max - Cantidad máxima de solicitudes por IP dentro de la ventana (defecto: 10).
 * @param {string} [options.message] - Mensaje de error al superar el límite.
 */
export const createRateLimiter = ({
  windowMs = 15 * 60 * 1000,
  max = 10,
  message = 'Límite de solicitudes de reserva excedido. Máximo 10 solicitudes por cada 15 minutos.'
} = {}) => {
  const requestsMap = new Map();

  // Limpieza periódica cada 5 minutos para evitar fugas de memoria
  setInterval(() => {
    const now = Date.now();
    for (const [ip, record] of requestsMap.entries()) {
      if (now - record.startTime > windowMs) {
        requestsMap.delete(ip);
      }
    }
  }, 5 * 60 * 1000).unref();

  return (req, res, next) => {
    const clientIp =
      req.ip ||
      req.headers['x-forwarded-for']?.split(',')[0].trim() ||
      req.socket.remoteAddress ||
      'unknown-ip';

    const now = Date.now();
    const clientRecord = requestsMap.get(clientIp);

    if (!clientRecord) {
      requestsMap.set(clientIp, {
        startTime: now,
        count: 1
      });
      return next();
    }

    if (now - clientRecord.startTime > windowMs) {
      // Reiniciar ventana
      clientRecord.startTime = now;
      clientRecord.count = 1;
      return next();
    }

    clientRecord.count += 1;

    if (clientRecord.count > max) {
      const remainingMs = windowMs - (now - clientRecord.startTime);
      const remainingMinutes = Math.ceil(remainingMs / 60000);

      res.setHeader('Retry-After', Math.ceil(remainingMs / 1000));
      return next(
        new TooManyRequestsError(
          `${message} Intente nuevamente en aproximadamente ${remainingMinutes} minuto(s).`
        )
      );
    }

    next();
  };
};

// Rate limiter específico para creación de reservas públicas (RNF-11: 10 req / 15 min)
export const bookingRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: 'Demasiadas solicitudes de agendamiento desde esta dirección IP.'
});
