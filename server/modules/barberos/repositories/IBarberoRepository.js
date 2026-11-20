/**
 * @file IBarberoRepository.js
 * @description Contrato/Interfaz del repositorio para Barberos, Horarios y Bloqueos.
 */

/**
 * @interface IBarberoRepository
 */
export class IBarberoRepository {
  async findById(id, options = {}) {
    throw new Error('Método findById no implementado');
  }

  async findBySede(sedeId, { activosSolo = true } = {}, options = {}) {
    throw new Error('Método findBySede no implementado');
  }

  async save(barbero, options = {}) {
    throw new Error('Método save no implementado');
  }

  async getHorariosByBarbero(barberoId, options = {}) {
    throw new Error('Método getHorariosByBarbero no implementado');
  }

  async getBloqueosByFecha(barberoId, fecha, options = {}) {
    throw new Error('Método getBloqueosByFecha no implementado');
  }

  async saveBloqueo(bloqueo, options = {}) {
    throw new Error('Método saveBloqueo no implementado');
  }

  async desactivar(barberoId, options = {}) {
    throw new Error('Método desactivar no implementado');
  }
}
