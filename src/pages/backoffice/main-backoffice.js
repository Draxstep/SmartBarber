/**
 * @file main-backoffice.js
 * @description Orquestador VanillaJS para el Backoffice con soporte PWA Offline-First (RF-PWA-07, RF-PWA-08).
 * Administra Route Guards (RBAC), registro declarativo de vistas (SOLID / OCP), ciclo de vida del Service Worker,
 * indicador de conectividad, sincronización de Outbox, Push Notifications VAPID y resolución de conflictos.
 */

import { renderBackofficeSidebar } from '../../components/backoffice-sidebar.js';
import { renderBackofficeHeader } from '../../components/backoffice-header.js';
import { renderLoginPage, attachLoginListeners } from './login.page.js';
import { renderForbiddenPage, renderNotFoundPage } from './error.page.js';
import { authService, inventarioService, cameraService, sedesService } from '../../services/index.js';
import { openDialog } from '../../components/ui-dialog.js';
import { backofficeStore } from './backoffice-state.js';
import { onDataMutation } from '../../utils/event-bus.js';
import { Capabilities, can, getDefaultRoute, normalizeRole } from '../../utils/access-control.js';

// Módulos PWA Offline-First
import { registrarServiceWorker, inicializarEventosConectividad } from '../../pwa/sw-register.js';
import { inicializarInstaladorPWA, sincronizarBotonInstalacion } from '../../pwa/install-prompt.js';
import { suscribirAPush, desuscribirDePush, enviarNotificacionPrueba, obtenerEstadoNotificaciones } from '../../pwa/notificaciones.js';
import { obtenerEstadoOutbox, descartarCambio, pedirSincronizacion } from '../../pwa/sync.js';
import { abrirBaseDeDatos, limpiarDatosLocales } from '../../pwa/db.js';

const appRoot = document.getElementById('app');
const routeModuleCache = new Map();

async function loadRouteModule(routeConfig) {
  if (routeModuleCache.has(routeConfig.id)) {
    return routeModuleCache.get(routeConfig.id);
  }
  const mod = await routeConfig.loadModule();
  routeModuleCache.set(routeConfig.id, mod);
  return mod;
}

/**
 * Registro Declarativo de Vistas del Backoffice con Code-Splitting (Open-Closed Principle / SOLID)
 * Cada módulo se carga bajo demanda mediante dynamic import() y define sus permisos RBAC, loader y eventos.
 */
export const BACKOFFICE_ROUTES = {
  dashboard: {
    id: 'dashboard',
    title: 'Dashboard Ejecutivo',
    capability: Capabilities.DASHBOARD_VIEW,
    loadModule: () => import('./dashboard.page.js'),
    loader: async (user, mod) => await mod.loadDashboardData(),
    render: (user, mod) => mod.renderDashboardPage(),
    attachListeners: (refresh, user, mod) => mod.attachDashboardListeners(refresh)
  },
  agenda: {
    id: 'agenda',
    title: 'Agenda y Turnos',
    capability: null,
    loadModule: () => import('./agenda.page.js'),
    loader: async () => await backofficeStore.loadAgendaData(),
    render: (user, mod) => mod.renderAgendaPage(),
    attachListeners: (refresh, user, mod) => mod.attachAgendaListeners(refresh)
  },
  cortes: {
    id: 'cortes',
    title: 'Historial y Caja',
    capability: null,
    loadModule: () => import('./cortes.page.js'),
    loader: async (user, mod) => await mod.loadCortesData(),
    render: (user, mod) => mod.renderCortesPage(),
    attachListeners: (refresh, user, mod) => mod.attachCortesListeners(refresh)
  },
  barberos: {
    id: 'barberos',
    title: 'Barberos y Horarios',
    capability: Capabilities.BARBERS_MANAGE,
    loadModule: () => import('./barberos.page.js'),
    loader: async (user, mod) => await mod.loadBarberosData(),
    render: (user, mod) => mod.renderBarberosPage(),
    attachListeners: (refresh, user, mod) => mod.attachBarberosListeners(refresh)
  },
  servicios: {
    id: 'servicios',
    title: 'Servicios y Tarifas',
    capability: Capabilities.SERVICES_MANAGE,
    loadModule: () => import('./servicios.page.js'),
    loader: async (user, mod) => await mod.loadServiciosData(),
    render: (user, mod) => mod.renderServiciosPage(),
    attachListeners: (refresh, user, mod) => mod.attachServiciosListeners(refresh)
  },
  inventario: {
    id: 'inventario',
    title: 'Inventario & Ventas',
    capability: Capabilities.INVENTORY_CATALOG_VIEW,
    loadModule: () => import('./inventory.page.js'),
    loader: async (user, mod) => await mod.loadInventoryKardexData(normalizeRole(user.rol)),
    render: (user, mod) => mod.renderInventoryPage({ userRole: normalizeRole(user.rol), user }),
    attachListeners: (refresh, user, mod) => mod.attachInventoryListeners(refresh, normalizeRole(user.rol), user)
  },
  comisiones: {
    id: 'comisiones',
    title: 'Liquidación Comisiones',
    capability: null,
    loadModule: () => import('./comisiones.page.js'),
    loader: async (user, mod) => await mod.loadComisionesData(),
    render: (user, mod) => mod.renderComisionesPage(),
    attachListeners: (refresh, user, mod) => mod.attachComisionesListeners(refresh)
  },
  configuracion: {
    id: 'configuracion',
    title: 'Configuración',
    capability: Capabilities.SETTINGS_MANAGE,
    loadModule: () => import('./configuracion.page.js'),
    loader: async (user, mod) => await mod.loadConfiguracionData(),
    render: (user, mod) => mod.renderConfiguracionPage(),
    attachListeners: (refresh, user, mod) => mod.attachConfiguracionListeners(refresh)
  },
  perfil: {
    id: 'perfil',
    title: 'Mi Perfil',
    capability: null,
    loadModule: () => import('./perfil.page.js'),
    loader: async (user, mod) => await mod.loadPerfilData(),
    render: (user, mod) => mod.renderPerfilPage(),
    attachListeners: (refresh, user, mod) => mod.attachPerfilListeners(refresh)
  }
};

let sedeActivaNombre = 'SmartBarber Studio';
let sedeCargada = false;
let totalAlertasInventario = 0;
let alertasCargadas = false;
let mountedShellUserKey = null;
let renderSequence = 0;
let refreshScheduled = false;

function scheduleBackofficeRefresh() {
  if (refreshScheduled) return;
  refreshScheduled = true;
  queueMicrotask(() => {
    refreshScheduled = false;
    renderBackoffice();
  });
}

function getActiveRoute(user = null) {
  const hash = window.location.hash.toLowerCase().replace('#', '').trim();
  if (!hash) {
    return getDefaultRoute(user);
  }
  return hash.split('?')[0];
}

export async function renderBackoffice() {
  if (!appRoot) return;
  const seq = ++renderSequence;

  // Liberación preventiva obligatoria de hardware (cámara) al navegar entre vistas
  try {
    cameraService.stopAllCameras();
  } catch (_) {}

  // 1. Guard de Autenticación Estricto
  const currentUser = authService.getCurrentUser();
  if (!currentUser || !authService.isAuthenticated()) {
    mountedShellUserKey = null;
    alertasCargadas = false;
    sedeCargada = false;
    totalAlertasInventario = 0;
    appRoot.innerHTML = renderLoginPage();
    attachLoginListeners(async (user) => {
      await abrirBaseDeDatos().catch(() => {});
      await backofficeStore.ensureInitialized(true);
      window.location.hash = `#${getDefaultRoute(user)}`;
      renderBackoffice();
    });
    return;
  }

  await backofficeStore.ensureInitialized();
  if (seq !== renderSequence) return;

  const currentRoute = getActiveRoute(currentUser);
  const currentRole = normalizeRole(currentUser.rol) || 'barbero';
  const routeConfig = BACKOFFICE_ROUTES[currentRoute];

  // 2. Guard de Ruta Desconocida (404)
  if (!routeConfig) {
    renderWithLayout(currentRoute, currentUser, renderNotFoundPage({ route: currentRoute, defaultRoute: getDefaultRoute(currentUser) }));
    return;
  }

  // 3. Guard de Permisos PBAC Declarativo (403)
  if (routeConfig.capability && !can(routeConfig.capability, currentUser)) {
    renderWithLayout(currentRoute, currentUser, renderForbiddenPage({ role: currentRole, requestedRoute: currentRoute }));
    return;
  }

  // 4. Cargar alertas de reposición y sede activa una sola vez por sesión (condicional por capacidad)
  try {
    if (!sedeCargada && navigator.onLine) {
      sedeCargada = true;
      const sedeRes = await sedesService.getSedeActiva().catch(() => null);
      if (sedeRes?.data?.nombreComercial) {
        sedeActivaNombre = sedeRes.data.nombreComercial;
      }
    }
    if (!alertasCargadas && can(Capabilities.INVENTORY_ALERTS_VIEW, currentUser) && navigator.onLine) {
      alertasCargadas = true;
      const alertasRes = await inventarioService.getAlertas();
      if (alertasRes?.data) {
        totalAlertasInventario = alertasRes.data.totalAlertas || 0;
      }
    }
  } catch (_) {}

  // 5. Carga diferida del módulo de vista + pre-carga de datos
  const routeModule = await loadRouteModule(routeConfig);
  if (seq !== renderSequence) return;

  try {
    if (routeConfig.loader) {
      await routeConfig.loader(currentUser, routeModule);
    }
  } catch (err) {
    console.warn(`⚠️ Precarga de datos para '${currentRoute}' delegada a caché/offline:`, err.message);
  }
  if (seq !== renderSequence) return;

  // 6. Actualizar únicamente #backoffice-main-content si el App Shell ya está montado
  const viewHtml = routeConfig.render(currentUser, routeModule);
  renderWithLayout(currentRoute, currentUser, viewHtml);
  if (routeConfig.attachListeners) {
    routeConfig.attachListeners(() => scheduleBackofficeRefresh(), currentUser, routeModule);
  }
  actualizarPillConectividad();
  sincronizarBotonInstalacion();
}

function actualizarSidebarActiva(activeRoute) {
  const sidebar = document.getElementById('backoffice-sidebar');
  if (!sidebar) return;

  sidebar.querySelectorAll('a[data-route]').forEach((link) => {
    const isActive = link.getAttribute('data-route') === activeRoute;
    link.setAttribute('aria-current', isActive ? 'page' : 'false');
    link.className = `flex items-center justify-between h-[44px] px-3 rounded-lg transition-all duration-150 font-sans text-sm font-medium ${
      isActive
        ? 'bg-[#2A2A2A] text-[#F2EBDD] border-l-[3px] border-[#7BA3D4] font-semibold'
        : 'text-[#BDB4A5] hover:bg-[#2A2A2A] hover:text-[#F2EBDD]'
    }`;
    const icon = link.querySelector('.material-symbols-outlined');
    if (icon) {
      icon.classList.toggle('text-[#7BA3D4]', isActive);
      icon.classList.toggle('text-[#BDB4A5]', !isActive);
    }
  });
}

function renderWithLayout(activeRoute, user, contentHtml) {
  const userKey = `${user.id || user.correo}:${user.rol || 'barbero'}`;
  const mainContainer = document.getElementById('backoffice-main-content');

  // App Shell persistente: evita destruir Sidebar, Header y <dialog> al navegar entre vistas
  if (mountedShellUserKey === userKey && mainContainer) {
    const headerSedeEl = document.getElementById('header-sede-name');
    if (headerSedeEl) headerSedeEl.textContent = sedeActivaNombre;
    mainContainer.innerHTML = contentHtml;
    actualizarSidebarActiva(activeRoute);
    return;
  }

  mountedShellUserKey = userKey;

  const userInitials = (user.nombreCompleto || user.nombre || user.correo || 'AD')
    .split(' ')
    .map((w) => w[0])
    .join('')
    .substring(0, 2)
    .toUpperCase();

  const userDisplayName = user.nombreCompleto || user.nombre || user.correo?.split('@')[0] || 'Usuario';
  const roleDisplay = user.rol === 'administrador' ? 'Administrador' : 'Barbero';

  appRoot.innerHTML = `
    <div class="min-h-screen bg-[#F2EBDD] flex relative">
      <!-- Sidebar Backdrop para Móvil -->
      <div id="sidebar-backdrop" class="fixed inset-0 bg-black/60 z-40 hidden lg:hidden backdrop-blur-xs transition-opacity" aria-hidden="true"></div>

      <!-- Sidebar -->
      ${renderBackofficeSidebar({
        activeRoute,
        user: { ...user, rawRole: user.rol, role: roleDisplay, name: userDisplayName },
        userRole: user.rol,
        inventoryAlerts: totalAlertasInventario,
        inventoryAlertCount: totalAlertasInventario
      })}

      <!-- Main Panel Wrapper -->
      <div class="flex-1 flex flex-col lg:pl-[240px] min-w-0 min-h-screen">
        <!-- Header -->
        ${renderBackofficeHeader({
          sedeName: sedeActivaNombre,
          userName: userDisplayName,
          userInitials,
          userRole: roleDisplay,
          rawRole: user.rol
        })}

        <!-- Main Content -->
        <main id="backoffice-main-content" class="flex-1 p-4 sm:p-6 lg:p-8 max-w-[1600px] w-full mx-auto">
          ${contentHtml}
        </main>
      </div>

      <!-- Drawer de Conflictos Offline (Oculto por defecto) -->
      <dialog id="drawer-conflictos" class="m-auto p-0 rounded-xl border border-[#D5CBB8] shadow-2xl backdrop:bg-black/40 max-w-lg w-full">
        <div class="p-6 bg-[#FAF7F2] flex flex-col gap-4">
          <div class="flex items-center justify-between border-b border-[#D5CBB8] pb-3">
            <div class="flex items-center gap-2 text-[#B3261E]">
              <span class="material-symbols-outlined">warning</span>
              <h3 class="font-bold text-base text-[#1C1C1C]">Cambios Offline con Conflicto</h3>
            </div>
            <button id="btn-cerrar-drawer-conflictos" class="text-[#6B645A] hover:text-[#1C1C1C] min-h-[44px] min-w-[44px] flex items-center justify-center">✕</button>
          </div>
          <p class="text-xs text-[#4F4A42]">
            Las siguientes operaciones realizadas sin red no pudieron aplicarse automáticamente debido a que los datos en el servidor cambiaron mientras estabas desconectado.
          </p>
          <div id="lista-conflictos-items" class="flex flex-col gap-3 max-h-60 overflow-y-auto">
            <!-- Dinámico -->
          </div>
          <div class="flex justify-end pt-2">
            <button id="btn-cerrar-conflictos-bottom" class="px-4 py-2 bg-[#E8DFCE] text-[#1C1C1C] rounded-md text-xs font-semibold hover:bg-[#D5CBB8] min-h-[44px]">
              Cerrar
            </button>
          </div>
        </div>
      </dialog>
    </div>
  `;

  attachBackofficeCommonListeners();
}

/**
 * Actualiza el indicador visual de conectividad y cola Outbox (RF-PWA-07)
 */
async function actualizarPillConectividad() {
  const pill = document.getElementById('pwa-connectivity-pill');
  const icon = document.getElementById('pwa-connectivity-icon');
  const text = document.getElementById('pwa-connectivity-text');
  if (!pill || !icon || !text) return;

  const estado = await obtenerEstadoOutbox();
  const online = navigator.onLine;

  pill.className = 'inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition-all';

  if (!online) {
    pill.classList.add('bg-[#FDF1DC]', 'text-[#8A5300]', 'border', 'border-[#8A5300]/30');
    icon.textContent = 'cloud_off';
    text.textContent = `Modo sin conexión · ${estado.pendientes} cambio(s) pendiente(s)`;
    pill.onclick = null;
  } else if (estado.conflictos > 0) {
    pill.classList.add('bg-[#FCE8E6]', 'text-[#B3261E]', 'border', 'border-[#B3261E]/40', 'cursor-pointer');
    icon.textContent = 'warning';
    text.textContent = `${estado.conflictos} conflicto(s) pendiente(s)`;
    pill.onclick = () => abrirDrawerConflictos(estado.items.filter((i) => i.estadoSync === 'conflicto'));
  } else if (estado.pendientes > 0) {
    pill.classList.add('bg-[#FDF1DC]', 'text-[#8A5300]', 'border', 'border-[#8A5300]/20');
    icon.textContent = 'sync';
    text.textContent = `Sincronizando ${estado.pendientes} cambio(s)...`;
    pill.onclick = null;
    pedirSincronizacion().catch(() => {});
  } else {
    pill.classList.add('bg-[#E3EFE7]', 'text-[#235D3A]', 'border', 'border-[#235D3A]/20');
    icon.textContent = 'cloud_done';
    text.textContent = 'Sincronizado';
    pill.onclick = null;
  }
}

function abrirDrawerConflictos(conflictos) {
  const dialog = document.getElementById('drawer-conflictos');
  const lista = document.getElementById('lista-conflictos-items');
  if (!dialog || !lista) return;

  lista.innerHTML = conflictos
    .map(
      (c) => `
    <div class="p-3 bg-white rounded-lg border border-[#D5CBB8] flex flex-col gap-1 text-xs">
      <div class="flex items-center justify-between font-bold text-[#1C1C1C]">
        <span>Operación: ${c.tipo}</span>
        <button data-discard-id="${c.idCambio}" class="text-[#8B1E1E] hover:underline btn-discard-conflict min-h-[32px] px-2 font-medium">
          Descartar
        </button>
      </div>
      <div class="text-[#8B1E1E]">
        Motivo: ${c.errorConflicto?.message || 'Conflicto con datos concurrentes del servidor.'}
      </div>
      <div class="text-[10px] text-[#6B645A]">
        Registrado: ${new Date(c.creadoEn).toLocaleTimeString('es-CO')}
      </div>
    </div>
  `
    )
    .join('');

  // Eventos para descartar
  lista.querySelectorAll('.btn-discard-conflict').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const id = btn.getAttribute('data-discard-id');
      if (id) {
        await descartarCambio(id);
        const estado = await obtenerEstadoOutbox();
        const restantes = estado.items.filter((i) => i.estadoSync === 'conflicto');
        if (restantes.length === 0) {
          dialog.close();
        } else {
          abrirDrawerConflictos(restantes);
        }
        actualizarPillConectividad();
      }
    });
  });

  const cerrar = () => dialog.close();
  document.getElementById('btn-cerrar-drawer-conflictos')?.addEventListener('click', cerrar, { once: true });
  document.getElementById('btn-cerrar-conflictos-bottom')?.addEventListener('click', cerrar, { once: true });

  dialog.showModal();
}

function attachBackofficeCommonListeners() {
  // Mobile sidebar toggle & backdrop
  const toggleBtn = document.getElementById('btn-toggle-sidebar');
  const closeSidebarBtn = document.getElementById('btn-close-sidebar-mobile');
  const sidebar = document.getElementById('backoffice-sidebar');
  const backdrop = document.getElementById('sidebar-backdrop');

  const openSidebar = () => {
    if (sidebar) {
      sidebar.classList.remove('hidden');
      sidebar.classList.add('flex');
    }
    if (backdrop) backdrop.classList.remove('hidden');
  };

  const closeSidebar = () => {
    if (sidebar) {
      sidebar.classList.add('hidden');
      sidebar.classList.remove('flex');
    }
    if (backdrop) backdrop.classList.add('hidden');
  };

  if (toggleBtn) toggleBtn.addEventListener('click', openSidebar);
  if (closeSidebarBtn) closeSidebarBtn.addEventListener('click', closeSidebar);
  if (backdrop) backdrop.addEventListener('click', closeSidebar);

  // Manejo de navegación en enlaces del sidebar
  if (sidebar) {
    sidebar.querySelectorAll('a[data-route]').forEach((link) => {
      link.addEventListener('click', (e) => {
        const targetRoute = link.getAttribute('data-route');
        if (window.innerWidth < 1024) {
          closeSidebar();
        }
        // Si el hash ya coincide, forzar renderizado para retroalimentación instantánea
        if (targetRoute && getActiveRoute() === targetRoute) {
          e.preventDefault();
          renderBackoffice();
        }
      });
    });
  }

  // Logout
  const logoutBtn = document.getElementById('btn-sidebar-logout');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
      await authService.logout();
      backofficeStore.reset();
      mountedShellUserKey = null;
      alertasCargadas = false;
      totalAlertasInventario = 0;
      await limpiarDatosLocales().catch(() => {});
      window.location.hash = '';
      renderBackoffice();
    });
  }

  // Botón y Control Integral de Notificaciones Push VAPID
  const btnPush = document.getElementById('btn-activate-push');
  if (btnPush) {
    const actualizarIconoCampana = async () => {
      const iconEl = document.getElementById('btn-push-icon') || btnPush.querySelector('span');
      const dotEl = document.getElementById('push-status-dot');
      const estado = await obtenerEstadoNotificaciones();

      if (!estado.soportado) {
        if (iconEl) {
          iconEl.textContent = 'notifications_off';
          iconEl.className = 'material-symbols-outlined text-[20px] text-[#8C8272] opacity-60';
        }
        btnPush.title = 'Este navegador no soporta Notificaciones Push.';
        if (dotEl) dotEl.classList.add('hidden');
      } else if (estado.permiso === 'denied') {
        if (iconEl) {
          iconEl.textContent = 'notifications_off';
          iconEl.className = 'material-symbols-outlined text-[20px] text-[#8B1E1E]';
        }
        btnPush.title = 'Notificaciones bloqueadas por permisos del navegador.';
        if (dotEl) {
          dotEl.className = 'absolute top-2 right-2 w-2 h-2 rounded-full bg-[#8B1E1E]';
          dotEl.classList.remove('hidden');
        }
      } else if (estado.activa) {
        if (iconEl) {
          iconEl.textContent = 'notifications_active';
          iconEl.className = 'material-symbols-outlined text-[20px] text-[#235D3A]';
        }
        btnPush.title = 'Notificaciones Push activadas y sincronizadas.';
        if (dotEl) {
          dotEl.className = 'absolute top-2 right-2 w-2 h-2 rounded-full bg-[#235D3A] animate-pulse';
          dotEl.classList.remove('hidden');
        }
      } else {
        if (iconEl) {
          iconEl.textContent = 'notifications';
          iconEl.className = 'material-symbols-outlined text-[20px] text-[#4F4A42]';
        }
        btnPush.title = 'Activar notificaciones Push';
        if (dotEl) dotEl.classList.add('hidden');
      }
      return estado;
    };

    actualizarIconoCampana();

    btnPush.addEventListener('click', async () => {
      const estado = await obtenerEstadoNotificaciones();

      if (!estado.soportado) {
        openDialog({
          title: 'Notificaciones No Soportadas',
          description: 'Tu navegador actual no cuenta con soporte para Web Push API o Service Workers.',
          confirmLabel: 'Entendido',
          isAlertOnly: true
        });
        return;
      }

      if (estado.permiso === 'denied') {
        openDialog({
          title: 'Notificaciones Bloqueadas',
          description: 'Las notificaciones están bloqueadas en tu navegador para este sitio. Para habilitarlas, haz clic en el icono del candado en la barra de direcciones de tu navegador y cambia Notificaciones a "Permitir".',
          confirmLabel: 'Entendido',
          isAlertOnly: true
        });
        return;
      }

      const canReceiveStockAlerts = can(Capabilities.PUSH_ALERTS_INVENTORY);
      const pushScopeSummary = canReceiveStockAlerts
        ? '<strong>nuevas reservas online</strong> y <strong>quiebres de stock en inventario</strong>'
        : '<strong>nuevas reservas asignadas</strong> y <strong>novedades de tu agenda</strong>';

      if (estado.activa) {
        // Modal de gestión interactiva cuando ya están activas
        openDialog({
          title: 'Notificaciones en este dispositivo',
          subtitle: 'Alertas en tiempo real del navegador',
          contentHtml: `
            <div class="flex flex-col gap-4 text-xs">
              <div class="flex items-center gap-2 p-3 rounded-lg bg-[#E3EFE7] text-[#235D3A] border border-[#235D3A]/20">
                <span class="material-symbols-outlined text-[20px]" aria-hidden="true">check_circle</span>
                <span class="font-semibold">Notificaciones activas y sincronizadas en este dispositivo</span>
              </div>
              <p class="text-[#4F4A42] leading-relaxed">
                Este navegador está autorizado para recibir alertas directas de ${pushScopeSummary}.
              </p>
              <div class="flex flex-col sm:flex-row gap-2 pt-2 border-t border-[#D5CBB8]">
                <button
                  type="button"
                  id="btn-modal-test-push"
                  class="min-h-[40px] px-4 py-2 rounded-lg bg-[#1F3A5F] hover:bg-[#162B47] text-white font-semibold flex items-center justify-center gap-2 transition-colors shadow-xs cursor-pointer"
                >
                  <span class="material-symbols-outlined text-[18px]" aria-hidden="true">send</span>
                  <span>Enviar Notificación de Prueba</span>
                </button>
                <button
                  type="button"
                  id="btn-modal-desuscribir-push"
                  class="min-h-[40px] px-4 py-2 rounded-lg bg-white border border-[#8C8272] hover:bg-[#FCE8E6] text-[#B3261E] font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer"
                >
                  <span class="material-symbols-outlined text-[18px]" aria-hidden="true">notifications_off</span>
                  <span>Desactivar en este equipo</span>
                </button>
              </div>
              <div id="modal-push-feedback" class="hidden p-2.5 rounded-lg text-xs font-semibold"></div>
            </div>
          `,
          cancelText: 'Cerrar',
          confirmText: ''
        });

        setTimeout(() => {
          const btnTest = document.getElementById('btn-modal-test-push');
          const btnDesub = document.getElementById('btn-modal-desuscribir-push');
          const feedback = document.getElementById('modal-push-feedback');

          if (btnTest) {
            btnTest.addEventListener('click', async () => {
              btnTest.disabled = true;
              btnTest.innerHTML = '<span class="material-symbols-outlined text-[18px] animate-spin">refresh</span><span>Enviando prueba...</span>';
              try {
                const res = await enviarNotificacionPrueba();
                if (feedback) {
                  feedback.className = 'p-2.5 rounded-lg text-xs font-semibold bg-[#E3EFE7] text-[#235D3A] border border-[#235D3A]/20';
                  feedback.textContent = res.message || 'Notificación de prueba enviada con éxito.';
                  feedback.classList.remove('hidden');
                }
              } catch (err) {
                if (feedback) {
                  feedback.className = 'p-2.5 rounded-lg text-xs font-semibold bg-[#FCE8E6] text-[#8B1E1E] border border-[#8B1E1E]/20';
                  feedback.textContent = err.message;
                  feedback.classList.remove('hidden');
                }
              } finally {
                btnTest.disabled = false;
                btnTest.innerHTML = '<span class="material-symbols-outlined text-[18px]">send</span><span>Enviar Notificación de Prueba</span>';
              }
            });
          }

          if (btnDesub) {
            btnDesub.addEventListener('click', async () => {
              btnDesub.disabled = true;
              try {
                await desuscribirDePush();
                await actualizarIconoCampana();
                if (feedback) {
                  feedback.className = 'p-2.5 rounded-lg text-xs font-semibold bg-[#F2EBDD] text-[#4F4A42] border border-[#D5CBB8]';
                  feedback.textContent = 'Notificaciones desactivadas para este navegador.';
                  feedback.classList.remove('hidden');
                }
                setTimeout(() => {
                  const dialogEl = document.querySelector('dialog.ui-modal');
                  if (dialogEl) dialogEl.close();
                }, 1000);
              } catch (err) {
                alert(err.message);
                btnDesub.disabled = false;
              }
            });
          }
        }, 50);
        return;
      }

      // Si está en estado 'default' o sin suscripción activa: solicitar en contexto de clic
      try {
        const res = await suscribirAPush();
        if (res.ok) {
          await actualizarIconoCampana();
          openDialog({
            title: 'Notificaciones Activadas',
            description: canReceiveStockAlerts
              ? 'Recibirás avisos instantáneos de nuevas reservas de clientes y alertas de existencias bajas de inventario. Haz clic en la campana en cualquier momento para enviar una prueba.'
              : 'Recibirás avisos instantáneos de nuevas citas asignadas y actualizaciones de tu agenda. Haz clic en la campana en cualquier momento para enviar una prueba.',
            confirmLabel: 'Entendido',
            isAlertOnly: true
          });
        } else {
          openDialog({
            title: 'Notificaciones no activadas',
            description: res.mensaje || 'Puedes habilitar las notificaciones en cualquier momento desde los permisos de tu navegador.',
            confirmLabel: 'Entendido',
            isAlertOnly: true
          });
        }
      } catch (err) {
        openDialog({
          title: 'Aviso',
          description: err.message,
          confirmLabel: 'Aceptar',
          isAlertOnly: true
        });
      }
    });
  }
}

// Escuchadores globales de eventos PWA y Reactividad en Vivo
window.addEventListener('smartbarber:outbox-updated', async () => {
  await actualizarPillConectividad();
  scheduleBackofficeRefresh();
});
window.addEventListener('smartbarber:connectivity-changed', actualizarPillConectividad);
window.addEventListener('hashchange', renderBackoffice);

// Suscripción al bus de mutación de datos para actualización reactiva instantánea
onDataMutation(async (detail) => {
  if (detail.entity === 'inventario') {
    alertasCargadas = false;
  }
  if (detail.entity === 'sede') {
    sedeCargada = false;
    scheduleBackofficeRefresh();
    return;
  }
  const user = authService.getCurrentUser();
  const currentRoute = getActiveRoute(user);
  if (
    (detail.entity === 'citas' && currentRoute === 'agenda') ||
    (detail.entity === 'cortes' && (currentRoute === 'cortes' || currentRoute === 'agenda')) ||
    (detail.entity === 'inventario' && (currentRoute === 'inventario' || currentRoute === 'agenda' || currentRoute === 'cortes'))
  ) {
    scheduleBackofficeRefresh();
  }
});

// Inicializar capacidades PWA del Backoffice (sin llamadas de red previas al login)
abrirBaseDeDatos().catch(() => {});
registrarServiceWorker();
inicializarEventosConectividad();
inicializarInstaladorPWA();

// Arranque inicial
renderBackoffice();
