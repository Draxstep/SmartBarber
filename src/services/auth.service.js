/**
 * SmartBarber - Servicio de Autenticación & Autorización (100% Producción Real)
 * Login contra /api/v1/auth/login, gestión de token JWT y control de sesión estricto (CU-001, RNF-09, RNF-10).
 */

import { httpClient, UnauthorizedError } from './http-client.js';
import { limpiarDatosLocales } from '../pwa/db.js';

const USER_STORAGE_KEY = 'smartbarber_user';

export const authService = {
  /**
   * Autenticación contra el backend real de SmartBarber.
   * Envía { correo, contrasena } conforme a loginSchema.
   */
  async login({ email, password }) {
    const correo = (email || '').toLowerCase().trim();
    const contrasena = password || '';

    if (!correo || !contrasena) {
      throw new UnauthorizedError('Por favor ingrese su correo electrónico y contraseña.');
    }

    const response = await httpClient.post('/auth/login', { correo, contrasena });

    if (response?.data?.token) {
      const { token, usuario } = response.data;
      httpClient.setToken(token);

      // Normalizar datos de usuario para el frontend
      const normalizedUser = {
        id: usuario.id,
        correo: usuario.correo,
        email: usuario.correo,
        rol: usuario.rol, // 'administrador' | 'barbero'
        sedeId: usuario.sedeId,
        barberoId: usuario.barberoId || null,
        nombreCompleto: usuario.barberoNombre || (usuario.rol === 'administrador' ? 'Carlos Mendoza (Admin)' : 'Barbero'),
        ultimoAccesoEn: usuario.ultimoAccesoEn || new Date().toISOString()
      };

      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(normalizedUser));
      return { ok: true, success: true, data: { token, usuario: normalizedUser } };
    }

    return response;
  },

  async logout() {
    try {
      if (httpClient.getToken()) {
        await httpClient.post('/auth/logout', {});
      }
    } catch (_) {
      // Ignorar fallo de red en logout
    } finally {
      httpClient.setToken(null);
      try {
        localStorage.removeItem(USER_STORAGE_KEY);
      } catch (_) {}
      try {
        await limpiarDatosLocales();
      } catch (_) {}
    }
  },

  getCurrentUser() {
    try {
      const token = httpClient.getToken();
      if (!token) return null;

      const stored = localStorage.getItem(USER_STORAGE_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch (_) {
      return null;
    }
  },

  isAuthenticated() {
    return Boolean(httpClient.getToken() && this.getCurrentUser());
  }
};
