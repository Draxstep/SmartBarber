/**
 * @file IClienteRepository.js
 * @description Contrato/Interfaz del repositorio para Clientes.
 */

/**
 * @interface IClienteRepository
 */
export class IClienteRepository {
  async findById(id, options = {}) {
    throw new Error('Método findById no implementado');
  }

  async findByCorreo(sedeId, correo, options = {}) {
    throw new Error('Método findByCorreo no implementado');
  }

  async findByTelefono(sedeId, telefono, options = {}) {
    throw new Error('Método findByTelefono no implementado');
  }

  async upsert(cliente, options = {}) {
    throw new Error('Método upsert no implementado');
  }
}
