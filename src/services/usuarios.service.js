/**
 * SmartBarber - Servicio de Usuarios del Backoffice (100% Producción Real)
 * Consulta cuentas con acceso al Backoffice desde /api/v1/usuarios.
 */

import { httpClient } from './http-client.js';

export const usuariosService = {
  /**
   * Lista los usuarios registrados para la sede activa.
   */
  async listUsuarios() {
    return await httpClient.get('/usuarios');
  }
};
