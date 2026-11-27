/**
 * Backoffice Error Pages (403 Forbidden & 404 Not Found)
 * Manejo accesible de acceso denegado por rol y rutas inexistentes.
 */

import { getDefaultBackofficeRoute, normalizeRole } from '../../../shared/contracts/permissions.js';
import { RolUsuario } from '../../../shared/contracts/enums.js';

export function renderForbiddenPage({ role = 'barbero', requestedRoute = '' } = {}) {
  const normalized = normalizeRole(role) || role;
  const homeRoute = getDefaultBackofficeRoute({ rol: normalized });
  const homeLabel = homeRoute === 'dashboard' ? 'Volver al Dashboard' : 'Volver a Mi Agenda';
  const roleLabel = normalized === RolUsuario.BARBERO ? 'Barbero' : normalized === RolUsuario.ADMINISTRADOR ? 'Administrador' : normalized;

  return `
    <div class="flex flex-col items-center justify-center p-8 sm:p-12 text-center max-w-lg mx-auto bg-[#FAF7F2] border border-[#D5CBB8] rounded-2xl shadow-sm my-8">
      <div class="w-16 h-16 rounded-full bg-[#FCE8E6] text-[#B3261E] flex items-center justify-center mb-4 shadow-2xs">
        <span class="material-symbols-outlined text-[36px]">shield_person</span>
      </div>

      <span class="font-sans text-xs uppercase tracking-widest text-[#B3261E] font-bold">Error 403 · Acceso Denegado</span>
      <h2 class="font-serif text-2xl font-bold text-[#1C1C1C] mt-1">
        Permisos Insuficientes
      </h2>

      <p class="font-sans text-xs sm:text-sm text-[#4F4A42] mt-2 leading-relaxed">
        El perfil activo con rol <strong>${roleLabel}</strong> no tiene autorización para acceder al módulo <code>#/${requestedRoute}</code>.
      </p>

      <div class="mt-6 flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
        <a
          href="#${homeRoute}"
          class="min-h-[44px] px-5 py-2.5 rounded-md bg-[#1F3A5F] hover:bg-[#162B47] text-white font-sans font-semibold text-xs transition-all flex items-center justify-center gap-2 shadow-xs"
        >
          <span class="material-symbols-outlined text-[18px]">${homeRoute === 'dashboard' ? 'dashboard' : 'calendar_month'}</span>
          <span>${homeLabel}</span>
        </a>
      </div>
    </div>
  `;
}

export function renderNotFoundPage({ route = '', defaultRoute = 'agenda' } = {}) {
  const homeLabel = defaultRoute === 'dashboard' ? 'Ir al Dashboard Principal' : 'Ir a la Agenda Principal';

  return `
    <div class="flex flex-col items-center justify-center p-8 sm:p-12 text-center max-w-lg mx-auto bg-[#FAF7F2] border border-[#D5CBB8] rounded-2xl shadow-sm my-8">
      <div class="w-16 h-16 rounded-full bg-[#E8DFCE] text-[#4F4A42] flex items-center justify-center mb-4 shadow-2xs">
        <span class="material-symbols-outlined text-[36px]">search_off</span>
      </div>

      <span class="font-sans text-xs uppercase tracking-widest text-[#6B645A] font-bold">Error 404</span>
      <h2 class="font-serif text-2xl font-bold text-[#1C1C1C] mt-1">
        Módulo No Encontrado
      </h2>

      <p class="font-sans text-xs sm:text-sm text-[#4F4A42] mt-2 leading-relaxed">
        La ruta <code>#/${route}</code> no corresponde a ningún módulo registrado en el panel administrativo.
      </p>

      <div class="mt-6">
        <a
          href="#${defaultRoute}"
          class="min-h-[44px] px-5 py-2.5 rounded-md bg-[#1F3A5F] hover:bg-[#162B47] text-white font-sans font-semibold text-xs transition-all inline-flex items-center gap-2 shadow-xs"
        >
          <span class="material-symbols-outlined text-[18px]">home</span>
          <span>${homeLabel}</span>
        </a>
      </div>
    </div>
  `;
}
