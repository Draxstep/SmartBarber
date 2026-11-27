/**
 * @file permissions.js
 * @description Modelo declarativo de capacidades (PBAC sobre RBAC), compartido de forma isomórfica
 * entre frontend y backend. Centraliza roles, alias heredados y derivación contextual de permisos.
 */

import { RolUsuario } from './enums.js';

export const Capabilities = Object.freeze({
  // Módulos / Navegación
  DASHBOARD_VIEW: 'dashboard.view',
  BARBERS_MANAGE: 'barbers.manage',
  SERVICES_MANAGE: 'services.manage',
  SETTINGS_MANAGE: 'settings.manage',

  // Agenda y Citas
  APPOINTMENTS_VIEW_ALL: 'appointments.view.all',
  APPOINTMENTS_VIEW_OWN: 'appointments.view.own',
  APPOINTMENTS_CREATE_MANUAL: 'appointments.create.manual',
  APPOINTMENTS_COMPLETE: 'appointments.complete',
  APPOINTMENTS_CANCEL: 'appointments.cancel',

  // Cortes y Caja Diaria
  CUTS_VIEW_ALL: 'cuts.view.all',
  CUTS_VIEW_OWN: 'cuts.view.own',
  CUTS_ASSIGN_ANY_BARBER: 'cuts.assign_any_barber',
  CUTS_PRICE_OVERRIDE: 'cuts.price.override',
  CUTS_ANNUL: 'cuts.annul',
  CUTS_AUDIT_VIEW: 'cuts.audit.view',
  CASHREGISTER_VIEW_ALL: 'cashregister.view.all',
  CASHREGISTER_EXPORT: 'cashregister.export',
  POS_SALES_VIEW_ALL: 'pos.sales.view.all',

  // Inventario y Kardex
  INVENTORY_CATALOG_VIEW: 'inventory.catalog.view',
  INVENTORY_PRODUCT_MANAGE: 'inventory.product.manage',
  INVENTORY_ENTRY_CREATE: 'inventory.entry.create',
  INVENTORY_EXIT_CREATE: 'inventory.exit.create',
  INVENTORY_SHRINKAGE_CREATE: 'inventory.shrinkage.create',
  INVENTORY_KARDEX_READ: 'inventory.kardex.read',
  INVENTORY_COST_VIEW: 'inventory.cost.view',
  INVENTORY_ALERTS_VIEW: 'inventory.alerts.view',
  INVENTORY_ARCHIVED_VIEW: 'inventory.archived.view',

  // Comisiones y Reportes
  COMMISSIONS_VIEW_ALL: 'commissions.view.all',
  COMMISSIONS_VIEW_OWN: 'commissions.view.own',
  COMMISSIONS_VIEW_MARGIN: 'commissions.view.margin',
  COMMISSIONS_REPORT_PRINT: 'commissions.report.print',
  COMMISSIONS_EXPORT: 'commissions.export',

  // Filtros y listados auxiliares
  BARBERS_LIST_READ: 'barbers.list.read',
  BARBERS_FILTER: 'barbers.filter',

  // Perfil Operativo y Notificaciones Push
  BARBER_PROFILE_MANAGE_OWN: 'barber_profile.manage.own',
  PUSH_ALERTS_INVENTORY: 'push.alerts.inventory'
});

const ADMIN_CAPABILITIES = Object.freeze([
  Capabilities.DASHBOARD_VIEW,
  Capabilities.BARBERS_MANAGE,
  Capabilities.SERVICES_MANAGE,
  Capabilities.SETTINGS_MANAGE,
  Capabilities.APPOINTMENTS_VIEW_ALL,
  Capabilities.APPOINTMENTS_CREATE_MANUAL,
  Capabilities.APPOINTMENTS_COMPLETE,
  Capabilities.APPOINTMENTS_CANCEL,
  Capabilities.CUTS_VIEW_ALL,
  Capabilities.CUTS_ASSIGN_ANY_BARBER,
  Capabilities.CUTS_PRICE_OVERRIDE,
  Capabilities.CUTS_ANNUL,
  Capabilities.CUTS_AUDIT_VIEW,
  Capabilities.CASHREGISTER_VIEW_ALL,
  Capabilities.CASHREGISTER_EXPORT,
  Capabilities.POS_SALES_VIEW_ALL,
  Capabilities.INVENTORY_CATALOG_VIEW,
  Capabilities.INVENTORY_PRODUCT_MANAGE,
  Capabilities.INVENTORY_ENTRY_CREATE,
  Capabilities.INVENTORY_EXIT_CREATE,
  Capabilities.INVENTORY_SHRINKAGE_CREATE,
  Capabilities.INVENTORY_KARDEX_READ,
  Capabilities.INVENTORY_COST_VIEW,
  Capabilities.INVENTORY_ALERTS_VIEW,
  Capabilities.INVENTORY_ARCHIVED_VIEW,
  Capabilities.COMMISSIONS_VIEW_ALL,
  Capabilities.COMMISSIONS_VIEW_MARGIN,
  Capabilities.COMMISSIONS_REPORT_PRINT,
  Capabilities.COMMISSIONS_EXPORT,
  Capabilities.BARBERS_LIST_READ,
  Capabilities.BARBERS_FILTER,
  Capabilities.PUSH_ALERTS_INVENTORY
]);

const BARBERO_CAPABILITIES = Object.freeze([
  Capabilities.APPOINTMENTS_VIEW_OWN,
  Capabilities.APPOINTMENTS_COMPLETE,
  Capabilities.APPOINTMENTS_CANCEL,
  Capabilities.CUTS_VIEW_OWN,
  Capabilities.INVENTORY_CATALOG_VIEW,
  Capabilities.INVENTORY_EXIT_CREATE,
  Capabilities.COMMISSIONS_VIEW_OWN,
  Capabilities.COMMISSIONS_EXPORT,
  Capabilities.BARBER_PROFILE_MANAGE_OWN
]);

export const ROLE_CAPABILITIES = Object.freeze({
  [RolUsuario.ADMINISTRADOR]: ADMIN_CAPABILITIES,
  [RolUsuario.BARBERO]: BARBERO_CAPABILITIES
});

/**
 * Normaliza roles heredados (ej: 'admin' -> 'administrador').
 * @param {string|null|undefined} rawRole
 * @returns {string}
 */
export function normalizeRole(rawRole) {
  const value = String(rawRole || '').toLowerCase().trim();
  if (value === 'admin' || value === RolUsuario.ADMINISTRADOR) {
    return RolUsuario.ADMINISTRADOR;
  }
  if (value === RolUsuario.BARBERO) {
    return RolUsuario.BARBERO;
  }
  return '';
}

/**
 * Resuelve el conjunto efectivo de capacidades de un usuario autenticado,
 * combinando rol base y atributos contextuales (ej. Administrador que también opera sillón).
 * @param {object|null} user
 * @returns {Set<string>}
 */
export function resolveUserCapabilities(user) {
  if (!user) return new Set();
  const role = normalizeRole(user.rol ?? user.rawRole ?? user.role);
  const base = ROLE_CAPABILITIES[role] || [];
  const caps = new Set(base);

  if (Boolean(user.barberoId)) {
    caps.add(Capabilities.BARBER_PROFILE_MANAGE_OWN);
  } else if (role === RolUsuario.ADMINISTRADOR) {
    caps.delete(Capabilities.BARBER_PROFILE_MANAGE_OWN);
  }

  return caps;
}

/**
 * Verifica si el usuario posee una capacidad específica.
 * @param {object|null} user
 * @param {string} capability
 * @returns {boolean}
 */
export function hasCapability(user, capability) {
  if (!capability) return true;
  if (!user) return false;
  return resolveUserCapabilities(user).has(capability);
}

/**
 * Verifica si el usuario posee al menos una de las capacidades indicadas.
 * @param {object|null} user
 * @param {string[]} capabilities
 * @returns {boolean}
 */
export function hasAnyCapability(user, capabilities = []) {
  if (!Array.isArray(capabilities) || capabilities.length === 0) return true;
  const userCaps = resolveUserCapabilities(user);
  return capabilities.some((cap) => userCaps.has(cap));
}

/**
 * Determina la ruta inicial por defecto del Backoffice según capacidades del usuario.
 * @param {object|null} user
 * @returns {string}
 */
export function getDefaultBackofficeRoute(user) {
  return hasCapability(user, Capabilities.DASHBOARD_VIEW) ? 'dashboard' : 'agenda';
}
