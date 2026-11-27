/**
 * @file EmailService.js
 * @description Proveedor de correo transaccional para confirmación de citas (CU-021, RF-AGE-06, ACT-04).
 */
import { getDatabasePool } from '../../../shared/database/connection.js';

export class EmailService {
  constructor(pool = null) {
    this.pool = pool || getDatabasePool();
  }

  /**
   * Despacha el correo de confirmación de reserva (asíncrono, no bloqueante).
   * @param {Object} params
   * @param {string} params.correoDestino
   * @param {string} params.nombreCliente
   * @param {string} params.codigoReserva
   * @param {string} params.fecha
   * @param {string} params.horaInicio
   * @param {string} params.horaFin
   * @param {string} params.barberoNombre
   * @param {Array} params.servicios
   * @param {number} params.precioTotalCop
   * @param {string} params.direccionSede
   */
  async enviarConfirmacionReserva({
    correoDestino,
    nombreCliente,
    codigoReserva,
    fecha,
    horaInicio,
    horaFin,
    barberoNombre,
    servicios,
    precioTotalCop,
    direccionSede
  }) {
    const asunto = `💈 Confirmación de tu Reserva en SmartBarber - ${codigoReserva}`;
    const serviciosTexto = servicios.map((s) => `- ${s.nombreServicioSnapshot} ($ ${Number(s.precioCopSnapshot).toLocaleString('es-CO')} COP)`).join('\n');

    const cuerpoTexto = `
¡Hola, ${nombreCliente}!

Tu cita en SmartBarber ha sido confirmada con éxito.

📋 DETALLES DE TU RESERVA:
- Código Único de Reserva: ${codigoReserva}
- Fecha: ${fecha}
- Horario: ${horaInicio} - ${horaFin}
- Barbero: ${barberoNombre}
- Dirección: ${direccionSede || 'Sede Principal SmartBarber'}

SERVICIOS:
${serviciosTexto}
Total estimado: $ ${Number(precioTotalCop).toLocaleString('es-CO')} COP

POLÍTICA DE CANCELACIÓN:
Si necesitas cancelar o reprogramar, por favor notifícanos con al menos 2 horas de antelación comunicándote con nosotros e indicando tu código de reserva ${codigoReserva}.

¡Te esperamos!
SmartBarber Team
    `.trim();

    // Log estructurado del despacho (simulador / adaptador de desarrollo)
    console.log(`📨 [CORREO DESPACHADO]: Para ${correoDestino} | Asunto: "${asunto}" | Código: ${codigoReserva}`);

    try {
      await this.pool.query(
        `UPDATE notificaciones_correo
         SET estado = 'enviada',
             enviada_en = NOW()
         WHERE correo_destino = $1 AND asunto LIKE $2 AND estado = 'pendiente'`,
        [correoDestino, `%${codigoReserva}%`]
      );
    } catch (err) {
      console.warn('⚠️ No se pudo actualizar estado en notificaciones_correo:', err.message);
    }

    return { enviado: true, codigoReserva };
  }
}
