/**
 * @file pushRoutes.js
 * @description Endpoints para gestión de suscripciones Web Push VAPID (/api/v1/push/*).
 */
import { Router } from 'express';
import { pushService } from '../../../services/push.service.js';
import { authenticate } from '../../../shared/middlewares/authenticate.js';

export const pushRouter = Router();

// 1. Obtener clave pública VAPID (Permite al cliente registrarse con el PushManager)
pushRouter.get('/clave-publica', (req, res) => {
  const publicKey = pushService.getClavePublica();
  res.json({
    success: true,
    data: {
      publicKey
    }
  });
});

// 2. Registrar suscripción de un dispositivo autenticado
pushRouter.post('/suscribir', authenticate, async (req, res, next) => {
  try {
    const { subscription } = req.body;
    if (!subscription) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_PAYLOAD', message: 'Se requiere el objeto subscription.' }
      });
    }

    const reg = await pushService.registrarSuscripcion(req.user.id, subscription);
    res.status(201).json({
      success: true,
      message: 'Suscripción Push registrada exitosamente.',
      data: reg
    });
  } catch (err) {
    next(err);
  }
});

// 3. Desuscribir dispositivo
pushRouter.delete('/desuscribir', authenticate, async (req, res, next) => {
  try {
    const endpoint = req.body?.endpoint || req.query?.endpoint;
    if (!endpoint) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_PAYLOAD', message: 'Se requiere el endpoint de la suscripción a eliminar.' }
      });
    }

    await pushService.eliminarSuscripcion(endpoint);
    res.json({
      success: true,
      message: 'Suscripción eliminada correctamente.'
    });
  } catch (err) {
    next(err);
  }
});
