/**
 * @file ProductoInventario.js
 * @description Entidad de Dominio que representa un Producto de Inventario en SmartBarber.
 */
import { EstadoRegistro } from '../../../../shared/contracts/enums.js';

export class ProductoInventario {
  /**
   * @param {object} params
   * @param {string} params.productoId
   * @param {string} params.sedeId
   * @param {string|null} [params.sku=null]
   * @param {string} params.nombre
   * @param {string} params.categoria
   * @param {number} params.precioVentaCop
   * @param {number|null} [params.costoUnitarioCop=null]
   * @param {number} [params.stockActual=0]
   * @param {number} [params.stockMinimo=0]
   * @param {string} [params.estado=EstadoRegistro.ACTIVO]
   * @param {Date} [params.creadoEn]
   * @param {Date} [params.actualizadoEn]
   */
  constructor({
    productoId,
    sedeId,
    sku = null,
    nombre,
    categoria,
    precioVentaCop,
    costoUnitarioCop = null,
    stockActual = 0,
    stockMinimo = 0,
    estado = EstadoRegistro.ACTIVO,
    creadoEn = new Date(),
    actualizadoEn = new Date()
  }) {
    this.productoId = productoId;
    this.sedeId = sedeId;
    this.sku = sku;
    this.nombre = nombre;
    this.categoria = categoria;
    this.precioVentaCop = Math.round(Number(precioVentaCop));
    this.costoUnitarioCop = costoUnitarioCop !== null ? Math.round(Number(costoUnitarioCop)) : null;
    this.stockActual = Number(stockActual);
    this.stockMinimo = Number(stockMinimo);
    this.estado = estado;
    this.creadoEn = creadoEn instanceof Date ? creadoEn : new Date(creadoEn);
    this.actualizadoEn = actualizadoEn instanceof Date ? actualizadoEn : new Date(actualizadoEn);
  }

  isActivo() {
    return this.estado === EstadoRegistro.ACTIVO;
  }

  isAgotado() {
    return this.stockActual === 0;
  }

  isBajoStock() {
    return this.stockActual > 0 && this.stockActual <= this.stockMinimo;
  }
}
