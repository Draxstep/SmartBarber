/**
 * @file push.service.js
 * @description Servicio central de Notificaciones Push VAPID (RFC 8292).
 * Gestiona suscripciones, envío cifrado y depuración automática de suscripciones muertas (404/410).
 */
import { getDatabasePool } from '../shared/database/connection.js';
import { webpush, vapidKeys } from '../config/vapid.js';

export class PushService {
  constructor(webpushClient = null) {
    this.pool = getDatabasePool();
    this.webpush = webpushClient || webpush;
  }

  /**
   * Obtiene la clave pública VAPID para el registro en el cliente.
   */
  getClavePublica() {
    return vapidKeys.publicKey;
  }

  /**
   * Guarda o actualiza una suscripción Push vinculada a un usuario.
   * @param {string} usuarioId
   * @param {object} subscription - { endpoint, keys: { p256dh, auth } }
   * @param {object} [metadata] - { rol, sedeId }
   */
  async registrarSuscripcion(usuarioId, subscription, { rol = null, sedeId = null } = {}) {
    if (!subscription || !subscription.endpoint || !subscription.keys?.p256dh || !subscription.keys?.auth) {
      throw new Error('Formato de suscripción Push inválido.');
    }

    const { endpoint, keys } = subscription;
    const client = await this.pool.connect();
    try {
      const query = `
        INSERT INTO push_suscripciones (usuario_id, endpoint, p256dh, auth, rol, sede_id, actualizado_en)
        VALUES ($1, $2, $3, $4, $5, $6, NOW())
        ON CONFLICT (endpoint) 
        DO UPDATE SET 
          usuario_id = EXCLUDED.usuario_id,
          p256dh = EXCLUDED.p256dh,
          auth = EXCLUDED.auth,
          rol = COALESCE(EXCLUDED.rol, push_suscripciones.rol),
          sede_id = COALESCE(EXCLUDED.sede_id, push_suscripciones.sede_id),
          actualizado_en = NOW()
        RETURNING suscripcion_id, endpoint, rol, sede_id;
      `;
      const result = await client.query(query, [usuarioId, endpoint, keys.p256dh, keys.auth, rol, sedeId]);
      return result.rows[0];
    } finally {
      client.release();
    }
  }

  /**
   * Elimina una suscripción Push por su endpoint (validando propiedad si se indica usuarioId).
   * @param {string} endpoint
   * @param {string|null} [usuarioId]
   */
  async eliminarSuscripcion(endpoint, usuarioId = null) {
    const client = await this.pool.connect();
    try {
      if (usuarioId) {
        await client.query('DELETE FROM push_suscripciones WHERE endpoint = $1 AND usuario_id = $2', [endpoint, usuarioId]);
      } else {
        await client.query('DELETE FROM push_suscripciones WHERE endpoint = $1', [endpoint]);
      }
    } finally {
      client.release();
    }
  }

  /**
   * Envía una notificación Push de prueba al usuario especificado.
   * @param {string} usuarioId
   */
  async enviarPushDePrueba(usuarioId) {
    return await this.enviarPushAUsuarios([usuarioId], {
      titulo: 'SmartBarber · Notificación de Prueba',
      cuerpo: '¡El canal Web Push VAPID está activo y funcionando en tiempo real!',
      tag: `test-push-${Date.now()}`,
      url: '/backoffice.html#agenda'
    });
  }

  /**
   * Envía una notificación Push a los usuarios indicados.
   * Depura automáticamente suscripciones muertas ante respuesta 404/410.
   * @param {string[]} usuarioIds
   * @param {object} payload - { titulo, cuerpo, tag, url }
   */
  async enviarPushAUsuarios(usuarioIds, payload) {
    if (!Array.isArray(usuarioIds) || usuarioIds.length === 0) return { enviados: 0, fallidos: 0 };

    const client = await this.pool.connect();
    let suscripciones = [];
    try {
      const res = await client.query(
        'SELECT suscripcion_id, endpoint, p256dh, auth FROM push_suscripciones WHERE usuario_id = ANY($1::uuid[])',
        [usuarioIds]
      );
      suscripciones = res.rows;
    } finally {
      client.release();
    }

    if (suscripciones.length === 0) return { enviados: 0, fallidos: 0 };

    const payloadString = JSON.stringify({
      titulo: payload.titulo || 'SmartBarber',
      cuerpo: payload.cuerpo || 'Novedad operativa en tu barbería.',
      tag: payload.tag || 'smartbarber-aviso',
      url: payload.url || '/backoffice.html#agenda'
    });

    let enviados = 0;
    let fallidos = 0;

    for (const sub of suscripciones) {
      const pushConfig = {
        endpoint: sub.endpoint,
        keys: {
          p256dh: sub.p256dh,
          auth: sub.auth
        }
      };

      try {
        await this.webpush.sendNotification(pushConfig, payloadString);
        enviados++;
      } catch (err) {
        fallidos++;
        // Depuración automática de suscripciones caducadas / revocadas (RF-PWA-06)
        if (err.statusCode === 404 || err.statusCode === 410) {
          console.warn(`🧹 Eliminando suscripción Push caducada (${err.statusCode}): ${sub.endpoint.substring(0, 30)}...`);
          await this.eliminarSuscripcion(sub.endpoint).catch(() => {});
        } else {
          console.error(`⚠️ Error al enviar Push a ${sub.endpoint.substring(0, 30)}...:`, err.message);
        }
      }
    }

    return { enviados, fallidos };
  }

  /**
   * Dispara alerta de nueva reserva pública (CU-021)
   * Notifica a todos los administradores y al barbero asignado.
   */
  async notificarNuevaCita({ cita, barberoId, clienteNombre, servicioNombre, horaFormateada, fecha }) {
    try {
      const client = await this.pool.connect();
      let destinatarios = [];
      try {
        // 1. Obtener usuario_id de todos los administradores
        const adminRes = await client.query(
          "SELECT usuario_id FROM usuarios WHERE rol = 'administrador' AND estado = 'activo'"
        );
        const adminIds = adminRes.rows.map((r) => r.usuario_id);

        // 2. Obtener usuario_id del barbero asignado
        let barberoUsuarioId = null;
        if (barberoId) {
          const barbRes = await client.query(
            'SELECT usuario_id FROM barberos WHERE barbero_id = $1 LIMIT 1',
            [barberoId]
          );
          if (barbRes.rows.length > 0) {
            barberoUsuarioId = barbRes.rows[0].usuario_id;
          }
        }

        destinatarios = Array.from(new Set([...adminIds, ...(barberoUsuarioId ? [barberoUsuarioId] : [])]));
      } finally {
        client.release();
      }

      if (destinatarios.length === 0) return;

      const payload = {
        titulo: `Nueva cita · ${cita.codigoReserva || cita.codigo_reserva}`,
        cuerpo: `${clienteNombre || 'Cliente'} · ${servicioNombre || 'Servicio'} (${horaFormateada || 'Por definir'})`,
        tag: `cita-${cita.codigoReserva || cita.codigo_reserva}`,
        url: `/backoffice.html#agenda?fecha=${fecha || new Date().toISOString().split('T')[0]}`
      };

      await this.enviarPushAUsuarios(destinatarios, payload);
    } catch (err) {
      console.error('⚠️ Error no bloqueante al despachar Push de nueva cita:', err.message);
    }
  }

  /**
   * Dispara alerta de inventario (RN-11 / CU-018)
   * Notifica a todos los administradores cuando un producto queda en stock bajo o agotado.
   */
  async notificarAlertaInventario({ productoId, nombre, stockActual, stockMinimo, agotado }) {
    try {
      const client = await this.pool.connect();
      let adminIds = [];
      try {
        const adminRes = await client.query(
          "SELECT usuario_id FROM usuarios WHERE rol = 'administrador' AND estado = 'activo'"
        );
        adminIds = adminRes.rows.map((r) => r.usuario_id);
      } finally {
        client.release();
      }

      if (adminIds.length === 0) return;

      const titulo = agotado
        ? 'Alerta de inventario · Agotado'
        : 'Alerta de inventario · Stock bajo';
      const cuerpo = agotado
        ? `${nombre} se ha agotado por completo (0 unidades).`
        : `${nombre} quedó con ${stockActual} unidades (mínimo: ${stockMinimo}).`;

      const payload = {
        titulo,
        cuerpo,
        tag: `inv-alerta-${productoId}`,
        url: '/backoffice.html#inventario?filtro=alertas'
      };

      await this.enviarPushAUsuarios(adminIds, payload);
    } catch (err) {
      console.error('⚠️ Error no bloqueante al despachar Push de alerta de inventario:', err.message);
    }
  }
}

export const pushService = new PushService();
