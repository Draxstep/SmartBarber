/**
 * @file MovimientoInventario.js
 * @description Registro estrictamente inmutable del Kardex de Inventario (RF-INV-05).
 */
export class MovimientoInventario {
  /**
   * @param {object} params
   * @param {string} params.movimientoId
   * @param {string} params.sedeId
   * @param {string} params.productoId
   * @param {string} params.tipo
   * @param {string} params.subtipo
   * @param {number} params.cantidad
   * @param {number} params.stockAnterior
   * @param {number} params.stockResultante
   * @param {number|null} [params.costoUnitarioCop=null]
   * @param {number|null} [params.precioUnitarioCop=null]
   * @param {number|null} [params.valorTotalCop=null]
   * @param {string|null} [params.metodoPago=null]
   * @param {string|null} [params.registroCorteId=null]
   * @param {string|null} [params.observacion=null]
   * @param {string} params.usuarioId
   * @param {Date} [params.creadoEn]
   */
  constructor({
    movimientoId,
    sedeId,
    productoId,
    tipo,
    subtipo,
    cantidad,
    stockAnterior,
    stockResultante,
    costoUnitarioCop = null,
    precioUnitarioCop = null,
    valorTotalCop = null,
    metodoPago = null,
    registroCorteId = null,
    observacion = null,
    usuarioId,
    creadoEn = new Date()
  }) {
    this.movimientoId = movimientoId;
    this.sedeId = sedeId;
    this.productoId = productoId;
    this.tipo = tipo;
    this.subtipo = subtipo;
    this.cantidad = Number(cantidad);
    this.stockAnterior = Number(stockAnterior);
    this.stockResultante = Number(stockResultante);
    this.costoUnitarioCop = costoUnitarioCop !== null ? Math.round(Number(costoUnitarioCop)) : null;
    this.precioUnitarioCop = precioUnitarioCop !== null ? Math.round(Number(precioUnitarioCop)) : null;
    this.valorTotalCop = valorTotalCop !== null ? Math.round(Number(valorTotalCop)) : null;
    this.metodoPago = metodoPago;
    this.registroCorteId = registroCorteId;
    this.observacion = observacion;
    this.usuarioId = usuarioId;
    this.creadoEn = creadoEn instanceof Date ? creadoEn : new Date(creadoEn);
  }
}
