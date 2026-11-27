/**
 * BackofficeSidebar Component
 * Barra lateral fija de 240px en Carbon Black (#1C1C1C).
 * Conforme a DESIGN.md: WCAG 2.1 AA, borde azul activo (#7BA3D4), badge alerta (#E07A7A).
 * Filtrado dinámico según rol de usuario (Admin vs. Barbero).
 */

import { Capabilities, hasCapability, normalizeRole } from '../../shared/contracts/permissions.js';
import { RolUsuario } from '../../shared/contracts/enums.js';
import { renderUserAvatar } from './user-avatar.js';

export const ALL_NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard Ejecutivo', icon: 'dashboard', path: '#dashboard', capability: Capabilities.DASHBOARD_VIEW },
  { id: 'agenda', label: 'Agenda y Turnos', icon: 'calendar_month', path: '#agenda', capability: null, barberLabel: 'Mi Agenda' },
  { id: 'cortes', label: 'Historial y Caja', icon: 'point_of_sale', path: '#cortes', capability: null, barberLabel: 'Mis Cortes' },
  { id: 'barberos', label: 'Equipo de Barberos', icon: 'badge', path: '#barberos', capability: Capabilities.BARBERS_MANAGE },
  { id: 'servicios', label: 'Servicios y Tarifas', icon: 'content_cut', path: '#servicios', capability: Capabilities.SERVICES_MANAGE },
  { id: 'inventario', label: 'Inventario', icon: 'inventory_2', path: '#inventario', hasBadge: true, badgeCapability: Capabilities.INVENTORY_ALERTS_VIEW, capability: Capabilities.INVENTORY_CATALOG_VIEW, barberLabel: 'Venta Mostrador' },
  { id: 'comisiones', label: 'Liquidación Comisiones', icon: 'percent', path: '#comisiones', capability: null, barberLabel: 'Mis Comisiones' },
  { id: 'configuracion', label: 'Configuración', icon: 'settings', path: '#configuracion', capability: Capabilities.SETTINGS_MANAGE },
  { id: 'perfil', label: 'Mi Perfil', icon: 'account_circle', path: '#perfil', capability: null, barberLabel: 'Mi Perfil' }
];

/**
 * Renderiza la barra lateral del panel administrativo.
 * @param {Object} options
 * @param {string} [options.activeRoute='agenda'] - Ruta activa (ej: 'agenda', 'cortes', 'inventario')
 * @param {number} [options.inventoryAlerts] - Conteo de alertas de stock bajo/agotado
 * @param {number} [options.inventoryAlertCount] - Alias retrocompatible de inventoryAlerts
 * @param {Object} [options.user] - Datos de usuario autenticado
 * @param {string} [options.userRole] - Alias retrocompatible de user.rawRole
 * @returns {string} HTML string
 */
export function renderBackofficeSidebar({
  activeRoute = 'agenda',
  inventoryAlerts = null,
  inventoryAlertCount = null,
  user = null,
  userRole = null
} = {}) {
  const alerts = inventoryAlerts ?? inventoryAlertCount ?? 0;
  const rawRole = user?.rawRole || user?.rol || userRole || RolUsuario.ADMINISTRADOR;
  const currentRole = normalizeRole(rawRole) || RolUsuario.ADMINISTRADOR;
  const effectiveUser = { ...(user || {}), rol: currentRole };
  const userName = user?.nombreCompleto || user?.nombre || user?.name || (currentRole === RolUsuario.BARBERO ? 'Barbero' : 'Administrador');
  const userDisplayRole = user?.role || (currentRole === RolUsuario.BARBERO ? 'Barbero' : 'Administrador');

  const visibleItems = ALL_NAV_ITEMS.filter((item) => hasCapability(effectiveUser, item.capability));

  const itemsHtml = visibleItems.map(item => {
    const isActive = item.id === activeRoute;
    const label = currentRole === RolUsuario.BARBERO && item.barberLabel ? item.barberLabel : item.label;

    const baseClasses = 'flex items-center justify-between h-[44px] px-3 rounded-lg transition-all duration-150 font-sans text-sm font-medium';
    const activeClasses = isActive
      ? 'bg-[#2A2A2A] text-[#F2EBDD] border-l-[3px] border-[#7BA3D4] font-semibold'
      : 'text-[#BDB4A5] hover:bg-[#2A2A2A] hover:text-[#F2EBDD]';

    const iconColor = isActive ? 'text-[#7BA3D4]' : 'text-[#BDB4A5]';

    const canSeeAlerts = !item.badgeCapability || hasCapability(effectiveUser, item.badgeCapability);
    const badgeHtml = item.hasBadge && alerts > 0 && canSeeAlerts
      ? `<span class="pointer-events-none flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-[#E07A7A] text-[#1C1C1C] font-mono text-[11px] font-bold leading-none shadow-xs" title="${alerts} alertas de reposición">
           ${alerts}
         </span>`
      : '';

    return `
      <a
        href="${item.path}"
        data-route="${item.id}"
        class="${baseClasses} ${activeClasses}"
        aria-current="${isActive ? 'page' : 'false'}"
      >
        <div class="flex items-center gap-3">
          <span class="material-symbols-outlined text-[20px] ${iconColor}" aria-hidden="true">${item.icon}</span>
          <span>${label}</span>
        </div>
        ${badgeHtml}
      </a>
    `;
  }).join('');

  return `
    <aside
      id="backoffice-sidebar"
      class="fixed left-0 top-0 h-full w-[240px] bg-[#1C1C1C] z-50 flex-col justify-between select-none shadow-[2px_0_12px_rgba(0,0,0,0.25)] hidden lg:flex"
      aria-label="Navegación principal Backoffice"
    >
      <div class="flex flex-col">
        <!-- Logo / Marca Heritage -->
        <div class="pt-6 pb-6 px-5 border-b border-white/10 flex items-center justify-between">
          <a href="/backoffice.html#agenda" class="flex items-center gap-2.5 group">
            <div class="w-8 h-8 rounded-md bg-[#8B1E1E] flex items-center justify-center text-[#F2EBDD] font-bold shadow-xs">
              <span class="material-symbols-outlined text-[18px]">content_cut</span>
            </div>
            <div>
              <span class="block font-serif text-xl font-bold text-[#F2EBDD] tracking-tight leading-none group-hover:text-white transition-colors">SmartBarber</span>
              <span class="block font-sans text-[10px] text-[#BDB4A5] mt-1 uppercase tracking-wider font-semibold">Panel Administrativo</span>
            </div>
          </a>
          <button
            type="button"
            id="btn-close-sidebar-mobile"
            class="lg:hidden p-1 rounded-md text-[#BDB4A5] hover:text-[#F2EBDD] hover:bg-white/10 transition-colors min-h-[40px] min-w-[40px] flex items-center justify-center"
            aria-label="Cerrar menú"
          >
            <span class="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        <!-- Enlaces de Navegación -->
        <nav class="flex flex-col gap-1 py-4 px-2" aria-label="Menú de módulos">
          ${itemsHtml}
        </nav>
      </div>

      <!-- Perfil de usuario y Logout -->
      <div class="p-3 border-t border-white/10 bg-[#161616]">
        <div class="flex items-center justify-between gap-2 p-2 rounded-lg bg-[#2A2A2A]">
          <div class="flex items-center gap-2.5 min-w-0">
            ${renderUserAvatar({
              name: userName,
              sizeClass: 'w-8 h-8',
              textClass: 'text-xs',
              borderClass: 'border border-white/20'
            })}
            <div class="flex flex-col min-w-0">
              <span class="font-sans text-xs text-[#F2EBDD] font-semibold truncate leading-tight">${userName}</span>
              <span class="font-sans text-[11px] text-[#BDB4A5] truncate leading-tight">${userDisplayRole}</span>
            </div>
          </div>
          <button
            type="button"
            id="btn-sidebar-logout"
            aria-label="Cerrar sesión"
            class="touch-action min-w-[36px] min-h-[36px] flex items-center justify-center rounded-md text-[#BDB4A5] hover:text-[#F2EBDD] hover:bg-white/10 transition-colors cursor-pointer"
            title="Cerrar sesión"
          >
            <span class="material-symbols-outlined text-[18px]" aria-hidden="true">logout</span>
          </button>
        </div>
      </div>
    </aside>
  `;
}
