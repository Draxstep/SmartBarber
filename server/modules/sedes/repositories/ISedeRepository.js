/**
 * @file ISedeRepository.js
 * @description Contrato/Interfaz del repositorio para la entidad Sede.
 */

/**
 * @interface ISedeRepository
 */
export class ISedeRepository {
  /**
   * @param {string} id
   * @param {object} [options]
   * @param {import('pg').PoolClient} [options.client]
   * @returns {Promise<import('../domain/Sede.js').Sede | null>}
   */
  async findById(id, options = {}) {
    throw new Error('Método findById no implementado');
  }

  /**
   * @param {object} [options]
   * @param {import('pg').PoolClient} [options.client]
   * @returns {Promise<import('../domain/Sede.js').Sede | null>}
   */
  async findPrincipal(options = {}) {
    throw new Error('Método findPrincipal no implementado');
  }

  /**
   * @param {import('../domain/Sede.js').Sede} sede
   * @param {object} [options]
   * @param {import('pg').PoolClient} [options.client]
   * @returns {Promise<import('../domain/Sede.js').Sede>}
   */
  async save(sede, options = {}) {
    throw new Error('Método save no implementado');
  }
}
