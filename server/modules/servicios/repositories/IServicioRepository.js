/**
 * @file IServicioRepository.js
 * @description Contrato/Interfaz del repositorio para el catálogo de Servicios.
 */

/**
 * @interface IServicioRepository
 */
export class IServicioRepository {
  async findById(id, options = {}) {
    throw new Error('Método findById no implementado');
  }

  async findByIds(ids, options = {}) {
    throw new Error('Método findByIds no implementado');
  }

  async findBySede(sedeId, { activosSolo = true, visiblePublicoSolo = false } = {}, options = {}) {
    throw new Error('Método findBySede no implementado');
  }

  async save(servicio, options = {}) {
    throw new Error('Método save no implementado');
  }

  async desactivar(servicioId, options = {}) {
    throw new Error('Método desactivar no implementado');
  }
}
