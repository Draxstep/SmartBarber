/**
 * @file IUsuarioRepository.js
 * @description Contrato/Interfaz del repositorio para Usuarios y Sesiones.
 */

/**
 * @interface IUsuarioRepository
 */
export class IUsuarioRepository {
  /**
   * @param {string} id
   * @param {object} [options]
   * @returns {Promise<import('../domain/Usuario.js').Usuario | null>}
   */
  async findById(id, options = {}) {
    throw new Error('Método findById no implementado');
  }

  /**
   * @param {string} correo
   * @param {object} [options]
   * @returns {Promise<import('../domain/Usuario.js').Usuario | null>}
   */
  async findByCorreo(correo, options = {}) {
    throw new Error('Método findByCorreo no implementado');
  }

  /**
   * @param {import('../domain/Usuario.js').Usuario} usuario
   * @param {object} [options]
   * @returns {Promise<import('../domain/Usuario.js').Usuario>}
   */
  async save(usuario, options = {}) {
    throw new Error('Método save no implementado');
  }

  /**
   * Incrementa intentos fallidos y bloquea si llega a 5
   * @param {string} usuarioId
   * @param {object} [options]
   * @returns {Promise<void>}
   */
  async registrarIntentoFallido(usuarioId, options = {}) {
    throw new Error('Método registrarIntentoFallido no implementado');
  }

  /**
   * Restablece intentos fallidos y actualiza marca de último acceso
   * @param {string} usuarioId
   * @param {object} [options]
   * @returns {Promise<void>}
   */
  async resetearIntentosYAcceso(usuarioId, options = {}) {
    throw new Error('Método resetearIntentosYAcceso no implementado');
  }

  /**
   * Revoca todas las sesiones activas de un usuario (RF-BAR-02)
   * @param {string} usuarioId
   * @param {object} [options]
   * @returns {Promise<number>}
   */
  async revocarSesionesActivas(usuarioId, options = {}) {
    throw new Error('Método revocarSesionesActivas no implementado');
  }
}
