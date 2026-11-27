/**
 * SmartBarber - Portal Público Entry Point
 * Orquestador VanillaJS (ES Modules) para index.html
 * Cero fetch() directo: Carga delegada a serviciosService y barberosService.
 * Rutas: Landing Page (#inicio), Wizard de Agendamiento (#booking-wizard) y Consulta/Cancelación (#consultar).
 */

import { renderLandingPage } from './landing.page.js';
import { renderBookingWizard, attachWizardListeners } from './booking-wizard.page.js';
import { renderConsultarCitaPage, attachConsultarCitaListeners } from './consultar-cita.page.js';
import { bookingStore } from './booking-state.js';
import { registrarServiceWorker, inicializarEventosConectividad } from '../../pwa/sw-register.js';
import { inicializarInstaladorPWA, sincronizarBotonInstalacion } from '../../pwa/install-prompt.js';

// Inicializar capacidades PWA Offline-First
registrarServiceWorker();
inicializarEventosConectividad();
inicializarInstaladorPWA();

const appRoot = document.getElementById('app');

let cachedServices = [];
let cachedBarbers = [];
let isLoadingData = false;

function getRoute() {
  const hash = window.location.hash.toLowerCase();
  if (hash.includes('booking') || hash.includes('agendar') || hash.includes('wizard')) {
    return 'wizard';
  }
  if (hash.includes('consultar') || hash.includes('buscar')) {
    return 'consultar';
  }
  return 'landing';
}

export async function renderApp() {
  if (!appRoot) return;

  const route = getRoute();

  if (route === 'wizard') {
    if (!bookingStore.isInitialized || bookingStore.servicesCatalog.length === 0) {
      await bookingStore.ensureInitialized();
    }
    appRoot.innerHTML = renderBookingWizard();
    attachWizardListeners(() => renderApp());
  } else if (route === 'consultar') {
    appRoot.innerHTML = renderConsultarCitaPage();
    attachConsultarCitaListeners(() => renderApp());
  } else {
    // Render inicial con esqueleto si aún no hay datos
    if (cachedServices.length === 0 && !isLoadingData) {
      isLoadingData = true;
      appRoot.innerHTML = renderLandingPage({ services: [], barbers: [], isLoading: true });

      try {
        await bookingStore.ensureInitialized();
        cachedServices = bookingStore.servicesCatalog;
        cachedBarbers = bookingStore.barbersCatalog.filter(b => b.id !== 'any');
      } catch (_) {}

      isLoadingData = false;
    }

    appRoot.innerHTML = renderLandingPage({
      services: cachedServices,
      barbers: cachedBarbers,
      isLoading: false
    });
    attachLandingListeners();
  }

  sincronizarBotonInstalacion();
}

function attachLandingListeners() {
  // Manejo de botones hacia el wizard de agendamiento
  const bookButtons = document.querySelectorAll('a[href*="booking"], #hero-book-cta');
  bookButtons.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      bookingStore.setStep(1);
      window.location.hash = '#booking-wizard';
    });
  });

  // Selector interactivo de tarjetas de servicio en landing
  const serviceCards = document.querySelectorAll('.service-card');
  serviceCards.forEach(card => {
    card.addEventListener('click', () => {
      const srvId = card.getAttribute('data-service-id');
      if (srvId) {
        bookingStore.toggleService(srvId);
        const isSelected = card.getAttribute('aria-checked') === 'true';
        card.setAttribute('aria-checked', !isSelected);
        card.classList.toggle('border-2', !isSelected);
        card.classList.toggle('border-[#1F3A5F]', !isSelected);
        card.classList.toggle('bg-[#E4ECF5]', !isSelected);
      }
    });
  });
}

// Escuchar cambios de hash para navegación fluida
window.addEventListener('hashchange', renderApp);

// Inicializar la aplicación pública
renderApp();
