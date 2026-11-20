/**
 * @file main-backoffice.js
 * @description Orquestador VanillaJS para el Backoffice con soporte PWA Offline-First (RF-PWA-07, RF-PWA-08).
 * Administra Route Guards (RBAC), ciclo de vida del Service Worker, indicador de conectividad,
 * sincronización de Outbox, Push Notifications VAPID y resolución de conflictos.
 */

import { renderBackofficeSidebar } from '../../components/backoffice-sidebar.js';
import { renderBackofficeHeader } from '../../components/backoffice-header.js';
import { renderAgendaPage, attachAgendaListeners } from './agenda.page.js';
import { renderInventoryPage, loadInventoryKardexData, attachInventoryListeners } from './inventory.page.js';
import { renderCortesPage, loadCortesData, attachCortesListeners } from './cortes.page.js';
import { renderBarberosPage, loadBarberosData, attachBarberosListeners } from './barberos.page.js';
import { renderServiciosPage, loadServiciosData, attachServiciosListeners } from './servicios.page.js';
import { renderComisionesPage, loadComisionesData, attachComisionesListeners } from './comisiones.page.js';
import { renderConfiguracionPage, attachConfiguracionListeners } from './configuracion.page.js';
import { renderLoginPage, attachLoginListeners } from './login.page.js';
import { renderForbiddenPage, renderNotFoundPage } from './error.page.js';
import { authService, inventarioService, sedesService } from '../../services/index.js';
import { openDialog } from '../../components/ui-dialog.js';

// Módulos PWA Offline-First
import { registrarServiceWorker, inicializarEventosConectividad } from '../../pwa/sw-register.js';
import { inicializarInstaladorPWA } from '../../pwa/install-prompt.js';
import { suscribirAPush, tieneSuscripcionActiva } from '../../pwa/notificaciones.js';
import { obtenerEstadoOutbox, descartarCambio, pedirSincronizacion } from '../../pwa/sync.js';
import { abrirBaseDeDatos, limpiarDatosLocales } from '../../pwa/db.js';

const appRoot = document.getElementById('app');

const VALID_ROUTES = ['agenda', 'cortes', 'barberos', 'servicios', 'inventario', 'comisiones', 'configuracion'];
const ADMIN_ONLY_ROUTES = ['inventario', 'barberos', 'servicios', 'configuracion'];

let sedeActivaNombre = 'SmartBarber Studio · Bogotá';
let totalAlertasInventario = 0;

function getActiveRoute() {
  const hash = window.location.hash.toLowerCase().replace('#', '').trim();
  if (!hash) return 'agenda';
  return hash.split('?')[0];
}

export async function renderBackoffice() {
  if (!appRoot) return;

  // 1. Guard de Autenticación Estricto
  const currentUser = authService.getCurrentUser();
  if (!currentUser || !authService.isAuthenticated()) {
    appRoot.innerHTML = renderLoginPage();
    attachLoginListeners(async (user) => {
      // Inicializar base de datos local al autenticar
      await abrirBaseDeDatos().catch(() => {});
      window.location.hash = '#agenda';
      renderBackoffice();
    });
    return;
  }

  const currentRoute = getActiveRoute();
  const currentRole = currentUser.rol || 'barbero';

  // 2. Guard de Ruta Desconocida (404)
  if (!VALID_ROUTES.includes(currentRoute)) {
    renderWithLayout(currentRoute, currentUser, renderNotFoundPage({ route: currentRoute }));
    attachBackofficeCommonListeners();
    return;
  }

  // 3. Guard de Permisos RBAC (403)
  if (currentRole === 'barbero' && ADMIN_ONLY_ROUTES.includes(currentRoute)) {
    renderWithLayout(currentRoute, currentUser, renderForbiddenPage({ role: currentRole, requestedRoute: currentRoute }));
    attachBackofficeCommonListeners();
    return;
  }

  // 4. Cargar alertas y sede si aún no están en memoria
  try {
    if (totalAlertasInventario === 0 && currentRole === 'administrador' && navigator.onLine) {
      const alertasRes = await inventarioService.getAlertas();
      if (alertasRes?.data) {
        totalAlertasInventario = alertasRes.data.totalAlertas || 0;
      }
    }
  } catch (_) {}

  // 5. Pre-carga de datos según la ruta activa
  try {
    if (currentRoute === 'cortes') {
      await loadCortesData();
    } else if (currentRoute === 'barberos') {
      await loadBarberosData();
    } else if (currentRoute === 'servicios') {
      await loadServiciosData();
    } else if (currentRoute === 'comisiones') {
      await loadComisionesData();
    } else if (currentRoute === 'inventario') {
      await loadInventoryKardexData();
    }
  } catch (err) {
    console.warn('⚠️ Carga de datos inicial delegada a caché o modo offline:', err.message);
  }

  // 6. Renderizar Layout con la vista activa
  const viewHtml = getViewHtml(currentRoute);
  renderWithLayout(currentRoute, currentUser, viewHtml);
  attachBackofficeListeners(currentRoute);
  actualizarPillConectividad();
}

function renderWithLayout(activeRoute, user, contentHtml) {
  const userInitials = (user.nombre || user.correo || 'AD')
    .split(' ')
    .map((w) => w[0])
    .join('')
    .substring(0, 2)
    .toUpperCase();

  const userDisplayName = user.nombre || user.correo?.split('@')[0] || 'Usuario';
  const roleDisplay = user.rol === 'administrador' ? 'Administrador' : 'Barbero';

  appRoot.innerHTML = `
    <div class="min-h-screen bg-[#F2EBDD] flex">
      <!-- Sidebar -->
      ${renderBackofficeSidebar({
        activeRoute,
        userRole: user.rol,
        inventoryAlertCount: totalAlertasInventario
      })}

      <!-- Main Panel Wrapper -->
      <div class="flex-1 flex flex-col lg:pl-[240px] min-w-0">
        <!-- Header -->
        ${renderBackofficeHeader({
          sedeName: sedeActivaNombre,
          userName: userDisplayName,
          userInitials,
          userRole: roleDisplay,
          rawRole: user.rol,
          notificationCount: totalAlertasInventario
        })}

        <!-- Main Content (Padding top compensa header h-16) -->
        <main class="flex-1 pt-20 p-4 sm:p-6 lg:p-8 max-w-[1600px] w-full mx-auto">
          ${contentHtml}
        </main>
      </div>

      <!-- Drawer de Conflictos Offline (Oculto por defecto) -->
      <dialog id="drawer-conflictos" class="p-0 rounded-xl border border-[#D5CBB8] shadow-2xl backdrop:bg-black/40 max-w-lg w-full">
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
}

function getViewHtml(currentRoute) {
  switch (currentRoute) {
    case 'inventario':
      return renderInventoryPage();
    case 'cortes':
      return renderCortesPage();
    case 'barberos':
      return renderBarberosPage();
    case 'servicios':
      return renderServiciosPage();
    case 'comisiones':
      return renderComisionesPage();
    case 'configuracion':
      return renderConfiguracionPage();
    case 'agenda':
    default:
      return renderAgendaPage();
  }
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
  // Mobile sidebar toggle
  const toggleBtn = document.getElementById('btn-toggle-sidebar');
  const sidebar = document.getElementById('backoffice-sidebar');
  if (toggleBtn && sidebar) {
    toggleBtn.addEventListener('click', () => {
      sidebar.classList.toggle('hidden');
      sidebar.classList.toggle('flex');
    });
  }

  // Logout
  const logoutBtn = document.getElementById('btn-sidebar-logout');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
      await authService.logout();
      await limpiarDatosLocales().catch(() => {});
      window.location.hash = '';
      renderBackoffice();
    });
  }

  // Botón Activar Notificaciones Push VAPID
  const btnPush = document.getElementById('btn-activate-push');
  if (btnPush) {
    tieneSuscripcionActiva().then((activa) => {
      if (activa) {
        btnPush.title = 'Alertas Push activadas';
        btnPush.innerHTML = '<span class="material-symbols-outlined text-[20px] text-[#235D3A]">notifications_active</span>';
      }
    });

    btnPush.addEventListener('click', async () => {
      try {
        const res = await suscribirAPush();
        if (res.ok) {
          btnPush.innerHTML = '<span class="material-symbols-outlined text-[20px] text-[#235D3A]">notifications_active</span>';
          openDialog({
            title: 'Notificaciones Activadas',
            description: 'Recibirás avisos instantáneos de nuevas reservas de clientes y alertas de existencias bajas de inventario.',
            confirmLabel: 'Aceptar',
            isAlertOnly: true
          });
        } else {
          openDialog({
            title: 'Notificaciones no activadas',
            description: 'Puedes habilitar las notificaciones en cualquier momento desde los permisos de tu navegador.',
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

function attachBackofficeListeners(currentRoute) {
  attachBackofficeCommonListeners();

  const refreshCallback = () => renderBackoffice();

  switch (currentRoute) {
    case 'agenda':
      attachAgendaListeners(refreshCallback);
      break;
    case 'inventario':
      attachInventoryListeners(refreshCallback);
      break;
    case 'cortes':
      attachCortesListeners(refreshCallback);
      break;
    case 'barberos':
      attachBarberosListeners(refreshCallback);
      break;
    case 'servicios':
      attachServiciosListeners(refreshCallback);
      break;
    case 'comisiones':
      attachComisionesListeners(refreshCallback);
      break;
    case 'configuracion':
      attachConfiguracionListeners();
      break;
  }
}

// Escuchadores globales de eventos PWA
window.addEventListener('smartbarber:outbox-updated', actualizarPillConectividad);
window.addEventListener('smartbarber:connectivity-changed', actualizarPillConectividad);
window.addEventListener('hashchange', renderBackoffice);

// Inicializar capacidades PWA del Backoffice
registrarServiceWorker();
inicializarEventosConectividad();
inicializarInstaladorPWA();

// Arranque
renderBackoffice();
