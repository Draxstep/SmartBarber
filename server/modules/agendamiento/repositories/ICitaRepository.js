/**
 * @file ICitaRepository.js
 * @description Contrato/Interfaz del repositorio para Agendamiento de Citas.
 */

/**
 * @interface ICitaRepository
 */
export class ICitaRepository {
  async findById(id, options = {}) {
    throw new Error('Método findById no implementado');
  }

  async findByCodigo(codigo, options = {}) {
    throw new Error('Método findByCodigo no implementado');
  }

  async findAgenda({ sedeId, fecha, barberoId = null }, options = {}) {
    throw new Error('Método findAgenda no implementado');
  }

  async createWithServices(cita, serviciosSnapshots, options = {}) {
    throw new Error('Método createWithServices no implementado');
  }

  async updateEstado(citaId, { nuevoEstado, observacion = null, motivoCancelacion = null, cambiadoPorUsuarioId = null }, options = {}) {
    throw new Error('Método updateEstado no implementado');
  }

  async countCitasActivasClienteFecha(clienteId, fecha, options = {}) {
    throw new Error('Método countCitasActivasClienteFecha no implementado');
  }
}
