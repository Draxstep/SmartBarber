/**
 * @file IRegistroCorteRepository.js
 * @description Contrato/Interfaz del repositorio para Registro de Cortes y Caja.
 */

/**
 * @interface IRegistroCorteRepository
 */
export class IRegistroCorteRepository {
  async findById(id, options = {}) {
    throw new Error('Método findById no implementado');
  }

  async findByCitaId(citaId, options = {}) {
    throw new Error('Método findByCitaId no implementado');
  }

  async findHistorialDiario({ sedeId, fechaInicio, fechaFin, barberoId = null, estado = null }, options = {}) {
    throw new Error('Método findHistorialDiario no implementado');
  }

  async createWithServices(corte, serviciosSnapshots, options = {}) {
    throw new Error('Método createWithServices no implementado');
  }

  async anular(registroCorteId, { motivoAnulacion, anuladoPorUsuarioId }, options = {}) {
    throw new Error('Método anular no implementado');
  }

  async getResumenIngresos({ sedeId, fechaInicio, fechaFin, barberoId = null }, options = {}) {
    throw new Error('Método getResumenIngresos no implementado');
  }
}
