/**
 * BookingWizard Page - Orquestador del Flujo de 5 Pasos
 * Conforme a DESIGN.md y WCAG 2.1 AA.
 */

import { bookingStore } from './booking-state.js';
import { renderBookingStepper } from '../../components/booking-stepper.js';
import { renderBookingStep1, attachStep1Listeners } from './booking-step1.page.js';
import { renderBookingStep2, attachStep2Listeners } from './booking-step2.page.js';
import { renderBookingStep3, attachStep3Listeners } from './booking-step3.page.js';
import { renderBookingStep4, attachStep4Listeners } from './booking-step4.page.js';
import { renderBookingStep5, attachStep5Listeners } from './booking-step5.page.js';

export function renderBookingWizard() {
  const currentStep = bookingStore.state.currentStep;

  let stepContent = '';
  switch (currentStep) {
    case 1:
      stepContent = renderBookingStep1();
      break;
    case 2:
      stepContent = renderBookingStep2();
      break;
    case 3:
      stepContent = renderBookingStep3();
      break;
    case 4:
      stepContent = renderBookingStep4();
      break;
    case 5:
      stepContent = renderBookingStep5();
      break;
    default:
      stepContent = renderBookingStep1();
  }

  return `
    <div class="min-h-screen bg-[#F2EBDD] text-[#1C1C1C] flex flex-col font-sans pb-24">
      <!-- HEADER COMPACTO CON BOTÓN ATRÁS -->
      <header class="sticky top-0 w-full z-40 bg-[#1C1C1C] border-b-2 border-[#8B1E1E] shadow-sm">
        <div class="max-w-[680px] mx-auto h-16 px-4 flex items-center justify-between">
          <a
            href="#inicio"
            id="wizard-btn-home"
            class="min-h-[44px] min-w-[44px] flex items-center gap-1.5 text-[#F2EBDD] hover:text-[#E07A7A] transition-colors font-medium text-sm rounded-md focus-visible:ring-2 focus-visible:ring-[#1F3A5F]"
            aria-label="Volver a la página principal"
          >
            <span class="material-symbols-outlined text-[20px]">arrow_back</span>
            <span>Inicio</span>
          </a>

          <h1 class="font-serif text-lg font-bold text-[#F2EBDD] tracking-tight">
            Agendar Cita en Línea
          </h1>

          <div class="w-8 h-8 rounded-full bg-[#8B1E1E] flex items-center justify-center text-white text-xs font-bold shadow-xs">
            <span class="material-symbols-outlined text-[18px]">calendar_month</span>
          </div>
        </div>
      </header>

      <!-- STEPPER HORIZONTAL -->
      ${renderBookingStepper(currentStep)}

      <!-- CONTENEDOR CENTRAL DEL PASO ACTUAL -->
      <main class="max-w-[680px] mx-auto w-full px-4 py-6" id="wizard-step-container">
        ${stepContent}
      </main>
    </div>
  `;
}

export function attachWizardListeners(onStepChange) {
  const currentStep = bookingStore.state.currentStep;

  const btnHome = document.getElementById('wizard-btn-home');
  if (btnHome) {
    btnHome.addEventListener('click', (e) => {
      e.preventDefault();
      window.location.hash = '#inicio';
    });
  }

  const navigateStep = (step) => {
    bookingStore.setStep(step);
    if (typeof onStepChange === 'function') {
      onStepChange();
    }
  };

  switch (currentStep) {
    case 1:
      attachStep1Listeners(navigateStep);
      break;
    case 2:
      attachStep2Listeners(navigateStep);
      break;
    case 3:
      attachStep3Listeners(navigateStep);
      break;
    case 4:
      attachStep4Listeners(navigateStep);
      break;
    case 5:
      attachStep5Listeners(navigateStep);
      break;
  }
}
