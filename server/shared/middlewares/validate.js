/**
 * @file validate.js
 * @description Middleware universal de validación de entradas HTTP con esquemas Zod (body, query, params).
 */
import { z } from 'zod';
import { ValidationError } from '../errors/domainErrors.js';

/**
 * Validador de solicitudes Express con esquemas Zod.
 * @param {Object} schemas
 * @param {z.ZodSchema} [schemas.body]
 * @param {z.ZodSchema} [schemas.query]
 * @param {z.ZodSchema} [schemas.params]
 */
export const validate = (schemas) => async (req, res, next) => {
  try {
    if (schemas.body) {
      req.body = await schemas.body.parseAsync(req.body);
    }
    if (schemas.query) {
      const parsedQuery = await schemas.query.parseAsync(req.query);
      for (const key of Object.keys(req.query)) {
        delete req.query[key];
      }
      Object.assign(req.query, parsedQuery);
    }
    if (schemas.params) {
      const parsedParams = await schemas.params.parseAsync(req.params);
      for (const key of Object.keys(req.params)) {
        delete req.params[key];
      }
      Object.assign(req.params, parsedParams);
    }
    next();
  } catch (err) {
    if (err instanceof z.ZodError) {
      const formatted = err.issues.map((issue) => ({
        field: issue.path.join('.'),
        message: issue.message,
        code: issue.code
      }));
      next(new ValidationError('Error de validación en la solicitud.', formatted));
    } else {
      next(err);
    }
  }
};
