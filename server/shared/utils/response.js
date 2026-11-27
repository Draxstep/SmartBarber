/**
 * @file response.js
 * @description Utilidades para formatear respuestas JSON consistentes según los lineamientos de la API.
 */

/**
 * Retorna una respuesta exitosa estandarizada.
 * @param {import('express').Response} res
 * @param {any} data
 * @param {number} [statusCode=200]
 * @param {object} [meta=null]
 */
export const sendSuccess = (res, data, statusCode = 200, meta = null) => {
  const payload = {
    success: true,
    data
  };

  if (meta !== null) {
    payload.meta = meta;
  }

  return res.status(statusCode).json(payload);
};
