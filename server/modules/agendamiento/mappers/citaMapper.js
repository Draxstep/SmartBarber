/**
 * @file citaMapper.js
 * @description Mapeador para las entidades del módulo de Agendamiento.
 */
import { Cita } from '../domain/Cita.js';
import { CitaServicio } from '../domain/CitaServicio.js';
import { HistorialEstadoCita } from '../domain/HistorialEstadoCita.js';
import { NotificacionCorreo } from '../domain/NotificacionCorreo.js';

export class CitaMapper {
  static citaToDomain(row, serviciosRows = []) {
    if (!row) return null;
    const servicios = serviciosRows.map(CitaMapper.servicioDetalleToDomain);
    return new Cita({
      citaId: row.cita_id,
      sedeId: row.sede_id,
      codigoReserva: row.codigo_reserva,
      clienteId: row.cliente_id,
      barberoId: row.barbero_id,
      barberoAsignadoAutomaticamente: row.barbero_asignado_automaticamente,
      fecha: row.fecha instanceof Date ? row.fecha.toISOString().split('T')[0] : row.fecha,
      horaInicio: row.hora_inicio,
      horaFin: row.hora_fin,
      inicioEn: row.inicio_en,
      finEn: row.fin_en,
      bloquesTotales: row.bloques_totales,
      precioEstimadoCop: row.precio_estimado_cop,
      estado: row.estado,
      notasCliente: row.notas_cliente,
      motivoCancelacion: row.motivo_cancelacion,
      origen: row.origen,
      creadoPorUsuarioId: row.creado_por_usuario_id,
      creadoEn: row.creado_en,
      actualizadoEn: row.actualizado_en,
      servicios,
      clienteNombre: row.cliente_nombre || row.nombre_completo || null,
      clienteTelefono: row.cliente_telefono || row.telefono_whatsapp || null,
      clienteCorreo: row.cliente_correo || row.correo || null,
      barberoNombre: row.barbero_nombre || null
    });
  }

  static servicioDetalleToDomain(row) {
    if (!row) return null;
    return new CitaServicio({
      citaServicioId: row.cita_servicio_id,
      citaId: row.cita_id,
      servicioId: row.servicio_id,
      nombreServicioSnapshot: row.nombre_servicio_snapshot,
      precioCopSnapshot: row.precio_cop_snapshot,
      duracionBloquesSnapshot: row.duracion_bloques_snapshot,
      creadoEn: row.creado_en
    });
  }

  static citaToDto(entity) {
    if (!entity) return null;
    return {
      citaId: entity.citaId,
      sedeId: entity.sedeId,
      codigoReserva: entity.codigoReserva,
      clienteId: entity.clienteId,
      barberoId: entity.barberoId,
      barberoAsignadoAutomaticamente: entity.barberoAsignadoAutomaticamente,
      fecha: entity.fecha,
      horaInicio: entity.horaInicio,
      horaFin: entity.horaFin,
      inicioEn: entity.inicioEn.toISOString(),
      finEn: entity.finEn.toISOString(),
      bloquesTotales: entity.bloquesTotales,
      precioEstimadoCop: entity.precioEstimadoCop,
      estado: entity.estado,
      notasCliente: entity.notasCliente,
      motivoCancelacion: entity.motivoCancelacion,
      origen: entity.origen,
      creadoPorUsuarioId: entity.creadoPorUsuarioId,
      creadoEn: entity.creadoEn.toISOString(),
      actualizadoEn: entity.actualizadoEn.toISOString(),
      clienteNombre: entity.clienteNombre || null,
      clienteTelefono: entity.clienteTelefono || null,
      clienteCorreo: entity.clienteCorreo || null,
      barberoNombre: entity.barberoNombre || null,
      servicios: entity.servicios.map((s) => ({
        citaServicioId: s.citaServicioId,
        servicioId: s.servicioId,
        nombreServicioSnapshot: s.nombreServicioSnapshot,
        precioCopSnapshot: s.precioCopSnapshot,
        duracionBloquesSnapshot: s.duracionBloquesSnapshot
      }))
    };
  }

  static historialToDomain(row) {
    if (!row) return null;
    return new HistorialEstadoCita({
      historialId: row.historial_id,
      citaId: row.cita_id,
      estadoAnterior: row.estado_anterior,
      estadoNuevo: row.estado_nuevo,
      observacion: row.observacion,
      cambiadoPorUsuarioId: row.cambiado_por_usuario_id,
      cambiadoEn: row.cambiado_en
    });
  }

  static notificacionToDomain(row) {
    if (!row) return null;
    return new NotificacionCorreo({
      notificacionId: row.notificacion_id,
      sedeId: row.sede_id,
      citaId: row.cita_id,
      correoDestino: row.correo_destino,
      asunto: row.asunto,
      estado: row.estado,
      intentos: row.intentos,
      ultimoError: row.ultimo_error,
      proximoReintentoEn: row.proximo_reintento_en,
      enviadaEn: row.enviada_en,
      creadoEn: row.creado_en,
      actualizadoEn: row.actualizado_en
    });
  }
}
