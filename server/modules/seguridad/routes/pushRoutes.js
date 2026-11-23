/**
 * @file pushRoutes.js
 * @description Endpoints para gestión de suscripciones Web Push VAPID (/api/v1/push/*).
 */
import { Router } from 'express';
import { pushService } from '../../../services/push.service.js';
import { authenticate } from '../../../shared/middlewares/authenticate.js';

export const pushRouter = Router();

// 1. Obtener clave pública VAPID (GET /api/v1/push/vapid-public-key y alias /clave-publica)
const handlePublicKey = (req, res) => {
  const publicKey = pushService.getClavePublica();
  res.json({
    success: true,
    data: {
      publicKey
    }
  });
};
pushRouter.get('/vapid-public-key', handlePublicKey);
pushRouter.get('/clave-publica', handlePublicKey);

// 2. Registrar suscripción de un dispositivo autenticado (POST /api/v1/push/subscribe y alias /suscribir)
const handleSubscribe = async (req, res, next) => {
  try {
    const { subscription, rol, sedeId } = req.body;
    if (!subscription) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_PAYLOAD', message: 'Se requiere el objeto subscription.' }
      });
    }

    const userRol = rol || req.user?.rol || 'administrador';
    const userSedeId = sedeId || req.user?.sedeId || null;

    const reg = await pushService.registrarSuscripcion(req.user.id, subscription, {
      rol: userRol,
      sedeId: userSedeId
    });

    res.status(201).json({
      success: true,
      message: 'Suscripción Push registrada exitosamente.',
      data: reg
    });
  } catch (err) {
    next(err);
  }
};
pushRouter.post('/subscribe', authenticate, handleSubscribe);
pushRouter.post('/suscribir', authenticate, handleSubscribe);

// 3. Desuscribir dispositivo (DELETE /api/v1/push/unsubscribe y alias /desuscribir)
const handleUnsubscribe = async (req, res, next) => {
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
};
pushRouter.delete('/unsubscribe', authenticate, handleUnsubscribe);
pushRouter.delete('/desuscribir', authenticate, handleUnsubscribe);

// 4. Enviar notificación push de prueba en vivo (POST /api/v1/push/test y alias /probar)
const handleTestPush = async (req, res, next) => {
  try {
    const resultado = await pushService.enviarPushDePrueba(req.user.id);
    if (resultado.enviados === 0) {
      return res.status(200).json({
        success: true,
        message: 'No se encontraron dispositivos activos suscritos para tu usuario. Activa las notificaciones en este navegador primero.',
        data: resultado
      });
    }

    res.status(200).json({
      success: true,
      message: 'Notificación de prueba enviada exitosamente.',
      data: resultado
    });
  } catch (err) {
    next(err);
  }
};
pushRouter.post('/test', authenticate, handleTestPush);
pushRouter.post('/probar', authenticate, handleTestPush);
