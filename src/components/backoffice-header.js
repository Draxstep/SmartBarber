/**
 * @file backoffice-header.js
 * @description Encabezado superior fijo para el Backoffice con soporte PWA Offline-First (RF-PWA-07).
 * Incluye indicador de conectividad y cola Outbox, botón contextual de Push VAPID y drawer de conflictos.
 */

import { normalizeRole } from '../../shared/contracts/permissions.js';
import { RolUsuario } from '../../shared/contracts/enums.js';

export function renderBackofficeHeader({
  sedeName = 'SmartBarber Studio',
  userName = 'Administrador',
  userInitials = 'AD',
  userRole = 'Administrador',
  rawRole = 'administrador'
} = {}) {
  const isBarbero = normalizeRole(rawRole) === RolUsuario.BARBERO;
  const roleBadgeText = isBarbero ? 'Barbero' : 'Administrador';
  const roleBadgeClass = isBarbero
    ? 'bg-[#E4ECF5] text-[#1F3A5F] border-[#1F3A5F]/30'
    : 'bg-[#F2EBDD] text-[#8B1E1E] border-[#8B1E1E]/30';

  return `
    <header class="sticky top-0 z-30 h-16 w-full bg-[#F2EBDD]/95 backdrop-blur-md border-b border-[#D5CBB8] shadow-[0_1px_4px_rgba(28,28,28,0.05)] flex items-center justify-between px-4 sm:px-6 shrink-0">
      <!-- Sede Activa e Indicador PWA Offline -->
      <div class="flex items-center gap-3">
        <!-- Mobile Sidebar Toggle -->
        <button
          id="btn-toggle-sidebar"
          type="button"
          class="lg:hidden p-2 rounded-md text-[#4F4A42] hover:bg-[#E8DFCE] hover:text-[#1C1C1C] transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
          aria-label="Abrir menú de navegación"
        >
          <span class="material-symbols-outlined text-[24px]">menu</span>
        </button>

        <div class="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#FAF7F2] border border-[#D5CBB8] shadow-2xs">
          <span class="material-symbols-outlined text-[18px] text-[#1F3A5F]" aria-hidden="true">store</span>
          <span id="header-sede-name" class="font-sans text-xs font-semibold text-[#1C1C1C] truncate max-w-[150px] sm:max-w-[220px]">${sedeName}</span>
          <span class="inline-block w-2 h-2 rounded-full bg-[#235D3A]" title="Sede operativa"></span>
        </div>

        <!-- Indicador de Conectividad PWA Offline-First (RF-PWA-07) -->
        <div id="pwa-connectivity-pill" class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition-all">
          <span id="pwa-connectivity-icon" class="material-symbols-outlined text-[16px]">cloud_done</span>
          <span id="pwa-connectivity-text">Sincronizado</span>
        </div>
      </div>

      <!-- Identidad de Sesión y Acciones -->
      <div class="flex items-center gap-2 sm:gap-3">
        <button
          id="btn-instalar-app"
          type="button"
          style="display: none;"
          class="items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-[#FAF7F2] border border-[#D5CBB8] text-xs font-semibold text-[#1F3A5F] hover:bg-[#E8DFCE] transition-colors min-h-[36px]"
          title="Instalar SmartBarber como aplicación"
        >
          <span class="material-symbols-outlined text-[16px]">install_desktop</span>
          <span class="hidden md:inline">Instalar App</span>
        </button>

        <!-- Rol Autenticado Real (Badge Semántico) -->
        <div class="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold border ${roleBadgeClass}">
          <span class="material-symbols-outlined text-[16px]" aria-hidden="true">
            ${isBarbero ? 'content_cut' : 'admin_panel_settings'}
          </span>
          <span>${roleBadgeText}</span>
        </div>

        <!-- Botón Activar Notificaciones del Sistema -->
        <button
          id="btn-activate-push"
          type="button"
          class="touch-action p-2 rounded-md text-[#4F4A42] hover:bg-[#E8DFCE] hover:text-[#1C1C1C] transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center relative cursor-pointer"
          aria-label="Notificaciones del sistema"
          title="Consultar o activar alertas en este dispositivo"
        >
          <span id="btn-push-icon" class="material-symbols-outlined text-[20px]">notifications</span>
          <span id="push-status-dot" class="hidden absolute top-2 right-2 w-2 h-2 rounded-full bg-[#235D3A]"></span>
        </button>
      </div>
    </header>
  `;
}
