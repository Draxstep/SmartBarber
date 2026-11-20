/**
 * @file IInventarioRepository.js
 * @description Contrato/Interfaz del repositorio para Productos de Inventario y Kardex.
 */

/**
 * @interface IInventarioRepository
 */
export class IInventarioRepository {
  async findById(id, options = {}) {
    throw new Error('Método findById no implementado');
  }

  async findBySede(sedeId, { categoria = null, activosSolo = true } = {}, options = {}) {
    throw new Error('Método findBySede no implementado');
  }

  async findAlertasStock(sedeId, options = {}) {
    throw new Error('Método findAlertasStock no implementado');
  }

  async saveProducto(producto, options = {}) {
    throw new Error('Método saveProducto no implementado');
  }

  async registrarMovimiento(movimientoParams, options = {}) {
    throw new Error('Método registrarMovimiento no implementado');
  }

  async getKardexByProducto(productoId, options = {}) {
    throw new Error('Método getKardexByProducto no implementado');
  }
}
