/**
 * @file access-control.js
 * @description Helpers declarativos de visibilidad PBAC para el frontend Vanilla JS.
 */

import { authService } from '../services/auth.service.js';
import {
  Capabilities,
  normalizeRole,
  hasCapability,
  hasAnyCapability,
  getDefaultBackofficeRoute
} from '../../shared/contracts/permissions.js';
import { RolUsuario } from '../../shared/contracts/enums.js';

export { Capabilities, normalizeRole };

/**
 * Obtiene el usuario autenticado actual de forma segura.
 * @returns {object|null}
 */
export function getCurrentUserSafe() {
  return authService.getCurrentUser();
}

/**
 * Evalúa si el usuario actual (o uno provisto) tiene una capacidad.
 * @param {string} capability
 * @param {object|null} [user]
 * @returns {boolean}
 */
export function can(capability, user = null) {
  return hasCapability(user ?? getCurrentUserSafe(), capability);
}

/**
 * Evalúa si el usuario actual (o uno provisto) posee al menos una capacidad.
 * @param {string[]} capabilities
 * @param {object|null} [user]
 * @returns {boolean}
 */
export function canAny(capabilities, user = null) {
  return hasAnyCapability(user ?? getCurrentUserSafe(), capabilities);
}

/**
 * Renderizado declarativo condicional: evita inyectar HTML muerto en el DOM
 * si el usuario carece de la capacidad requerida.
 * @param {string} capability
 * @param {Function|string} renderWhenAllowed
 * @param {Function|string} [renderFallback='']
 * @param {object|null} [user]
 * @returns {string}
 */
export function whenCan(capability, renderWhenAllowed, renderFallback = '', user = null) {
  const allowed = can(capability, user);
  const target = allowed ? renderWhenAllowed : renderFallback;
  return typeof target === 'function' ? target() : (target ?? '');
}

/**
 * Indica si el rol efectivo corresponde exclusivamente a Barbero operativo.
 * @param {object|null} [user]
 * @returns {boolean}
 */
export function isBarberoRole(user = null) {
  const u = user ?? getCurrentUserSafe();
  return normalizeRole(u?.rol ?? u?.rawRole) === RolUsuario.BARBERO;
}

/**
 * Retorna el slug de la ruta inicial del Backoffice para el usuario.
 * @param {object|null} [user]
 * @returns {string}
 */
export function getDefaultRoute(user = null) {
  return getDefaultBackofficeRoute(user ?? getCurrentUserSafe());
}
