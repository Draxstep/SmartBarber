/**
 * @file corteMapper.js
 * @description Mapeador para las entidades del módulo de Registro de Cortes (Caja).
 */
import { RegistroCorte } from '../domain/RegistroCorte.js';
import { RegistroCorteServicio } from '../domain/RegistroCorteServicio.js';

export class CorteMapper {
  static corteToDomain(row, serviciosRows = []) {
    if (!row) return null;
    const servicios = serviciosRows.map(CorteMapper.servicioDetalleToDomain);
    return new RegistroCorte({
      registroCorteId: row.registro_corte_id,
      sedeId: row.sede_id,
      citaId: row.cita_id,
      barberoId: row.barbero_id,
      clienteId: row.cliente_id,
      nombreClienteReferencial: row.nombre_cliente_referencial,
      origen: row.origen,
      fechaHoraAtencion: row.fecha_hora_atencion,
      precioCalculadoCop: row.precio_calculado_cop,
      precioCobradoCop: row.precio_cobrado_cop,
      metodoPago: row.metodo_pago,
      porcentajeComisionSnapshot: row.porcentaje_comision_snapshot,
      comisionCalculadaCop: row.comision_calculada_cop,
      notas: row.notas,
      estado: row.estado,
      motivoAnulacion: row.motivo_anulacion,
      anuladoPorUsuarioId: row.anulado_por_usuario_id,
      anuladoEn: row.anulado_en,
      registradoPorUsuarioId: row.registrado_por_usuario_id,
      creadoEn: row.creado_en,
      actualizadoEn: row.actualizado_en,
      servicios
    });
  }

  static servicioDetalleToDomain(row) {
    if (!row) return null;
    return new RegistroCorteServicio({
      registroCorteServicioId: row.registro_corte_servicio_id,
      registroCorteId: row.registro_corte_id,
      servicioId: row.servicio_id,
      nombreServicioSnapshot: row.nombre_servicio_snapshot,
      precioCopSnapshot: row.precio_cop_snapshot,
      creadoEn: row.creado_en
    });
  }

  static corteToDto(entity) {
    if (!entity) return null;
    return {
      registroCorteId: entity.registroCorteId,
      sedeId: entity.sedeId,
      citaId: entity.citaId,
      barberoId: entity.barberoId,
      clienteId: entity.clienteId,
      nombreClienteReferencial: entity.nombreClienteReferencial,
      origen: entity.origen,
      fechaHoraAtencion: entity.fechaHoraAtencion.toISOString(),
      precioCalculadoCop: entity.precioCalculadoCop,
      precioCobradoCop: entity.precioCobradoCop,
      metodoPago: entity.metodoPago,
      porcentajeComisionSnapshot: entity.porcentajeComisionSnapshot,
      comisionCalculadaCop: entity.comisionCalculadaCop,
      notas: entity.notas,
      estado: entity.estado,
      motivoAnulacion: entity.motivoAnulacion,
      anuladoPorUsuarioId: entity.anuladoPorUsuarioId,
      anuladoEn: entity.anuladoEn ? entity.anuladoEn.toISOString() : null,
      registradoPorUsuarioId: entity.registradoPorUsuarioId,
      creadoEn: entity.creadoEn.toISOString(),
      actualizadoEn: entity.actualizadoEn.toISOString(),
      servicios: entity.servicios.map((s) => ({
        registroCorteServicioId: s.registroCorteServicioId,
        servicioId: s.servicioId,
        nombreServicioSnapshot: s.nombreServicioSnapshot,
        precioCopSnapshot: s.precioCopSnapshot
      }))
    };
  }
}
