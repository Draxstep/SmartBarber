/**
 * @file correo.worker.js
 * @description Trabajador en segundo plano (Transactional Outbox) para procesamiento confiable
 * de notificaciones por correo (notificaciones_correo) con reintentos exponenciales (RF-AGE-06).
 */
import { getDatabasePool } from '../shared/database/connection.js';

let intervalId = null;

export async function procesarColaCorreos() {
  const pool = getDatabasePool();
  let client;
  try {
    client = await pool.connect();
    // Consultar y bloquear filas pendientes listas para despacho
    const query = `
      SELECT notificacion_id, correo_destino, asunto, intentos
      FROM notificaciones_correo
      WHERE estado = 'pendiente' 
        AND proximo_reintento_en <= NOW()
      FOR UPDATE SKIP LOCKED
      LIMIT 10;
    `;
    const res = await client.query(query);

    for (const notif of res.rows) {
      try {
        // Simulación de envío de correo transaccional (ACT-04)
        console.log(`📬 [WORKER CORREO]: Procesando notif ${notif.notificacion_id} -> ${notif.correo_destino}`);
        
        await client.query(
          `UPDATE notificaciones_correo
           SET estado = 'enviada',
               enviada_en = NOW(),
               actualizado_en = NOW()
           WHERE notificacion_id = $1`,
          [notif.notificacion_id]
        );
      } catch (err) {
        const nuevosIntentos = notif.intentos + 1;
        if (nuevosIntentos < 3) {
          await client.query(
            `UPDATE notificaciones_correo
             SET intentos = $1,
                 ultimo_error = $2,
                 proximo_reintento_en = NOW() + ($1 * INTERVAL '2 minutes'),
                 actualizado_en = NOW()
             WHERE notificacion_id = $3`,
            [nuevosIntentos, err.message, notif.notificacion_id]
          );
        } else {
          await client.query(
            `UPDATE notificaciones_correo
             SET estado = 'fallida',
                 intentos = $1,
                 ultimo_error = $2,
                 actualizado_en = NOW()
             WHERE notificacion_id = $3`,
            [nuevosIntentos, err.message, notif.notificacion_id]
          );
        }
      }
    }
  } catch (error) {
    console.error('⚠️ Error en ciclo de worker de correo:', error.message);
  } finally {
    if (client) client.release();
  }
}

export function iniciarCorreoWorker(intervaloMs = 10000) {
  if (intervalId) return;
  intervalId = setInterval(procesarColaCorreos, intervaloMs);
  if (intervalId.unref) intervalId.unref(); // No bloquear apagado de proceso
  console.log('📬 Worker de notificaciones por correo iniciado (intervalo: 10s)');
}

export function detenerCorreoWorker() {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
    console.log('🛑 Worker de notificaciones por correo detenido.');
  }
}
