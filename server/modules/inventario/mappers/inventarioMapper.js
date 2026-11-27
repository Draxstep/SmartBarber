/**
 * @file inventarioMapper.js
 * @description Mapeador para las entidades del módulo de Inventario y Kardex.
 */
import { ProductoInventario } from '../domain/ProductoInventario.js';
import { MovimientoInventario } from '../domain/MovimientoInventario.js';

export class InventarioMapper {
  static productoToDomain(row) {
    if (!row) return null;
    return new ProductoInventario({
      productoId: row.producto_id,
      sedeId: row.sede_id,
      sku: row.sku,
      nombre: row.nombre,
      categoria: row.categoria,
      precioVentaCop: row.precio_venta_cop,
      costoUnitarioCop: row.costo_unitario_cop,
      stockActual: row.stock_actual,
      stockMinimo: row.stock_minimo,
      estado: row.estado,
      creadoEn: row.creado_en,
      actualizadoEn: row.actualizado_en
    });
  }

  static productoToDto(entity) {
    if (!entity) return null;
    return {
      productoId: entity.productoId,
      sedeId: entity.sedeId,
      sku: entity.sku,
      nombre: entity.nombre,
      categoria: entity.categoria,
      precioVentaCop: entity.precioVentaCop,
      costoUnitarioCop: entity.costoUnitarioCop,
      stockActual: entity.stockActual,
      stockMinimo: entity.stockMinimo,
      isAgotado: entity.isAgotado(),
      isBajoStock: entity.isBajoStock(),
      estado: entity.estado,
      creadoEn: entity.creadoEn.toISOString(),
      actualizadoEn: entity.actualizadoEn.toISOString()
    };
  }

  static movimientoToDomain(row) {
    if (!row) return null;
    return new MovimientoInventario({
      movimientoId: row.movimiento_id,
      sedeId: row.sede_id,
      productoId: row.producto_id,
      tipo: row.tipo,
      subtipo: row.subtipo,
      cantidad: row.cantidad,
      stockAnterior: row.stock_anterior,
      stockResultante: row.stock_resultante,
      costoUnitarioCop: row.costo_unitario_cop,
      precioUnitarioCop: row.precio_unitario_cop,
      valorTotalCop: row.valor_total_cop,
      metodoPago: row.metodo_pago,
      registroCorteId: row.registro_corte_id,
      observacion: row.observacion,
      usuarioId: row.usuario_id,
      creadoEn: row.creado_en
    });
  }

  static movimientoToDto(entity) {
    if (!entity) return null;
    return {
      movimientoId: entity.movimientoId,
      sedeId: entity.sedeId,
      productoId: entity.productoId,
      tipo: entity.tipo,
      subtipo: entity.subtipo,
      cantidad: entity.cantidad,
      stockAnterior: entity.stockAnterior,
      stockResultante: entity.stockResultante,
      costoUnitarioCop: entity.costoUnitarioCop,
      precioUnitarioCop: entity.precioUnitarioCop,
      valorTotalCop: entity.valorTotalCop,
      metodoPago: entity.metodoPago,
      registroCorteId: entity.registroCorteId,
      observacion: entity.observacion,
      usuarioId: entity.usuarioId,
      creadoEn: entity.creadoEn.toISOString()
    };
  }
}
