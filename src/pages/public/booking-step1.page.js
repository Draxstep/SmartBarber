/**
 * Booking Step 1: Selección de Servicios
 * Soporta selección múltiple, cálculo acumulativo de tiempo/bloques y COP.
 * Conforme a DESIGN.md y WCAG 2.1 AA.
 */

import { bookingStore } from './booking-state.js';
import { formatCOP, formatDurationBlocks } from '../../utils/formatters.js';
import { renderServiceCard } from '../../components/service-card.js';

export function renderBookingStep1() {
  const services = bookingStore.servicesCatalog;
  const selectedIds = bookingStore.state.selectedServiceIds;
  const totalPrice = bookingStore.getTotalPrice();
  const totalDuration = bookingStore.getTotalDuration();
  const totalBlocks = bookingStore.getTotalBlocks();

  return `
    <div class="flex flex-col gap-6">
      <div>
        <h2 class="font-serif text-xl sm:text-2xl font-bold text-[#1C1C1C]">
          1. Selecciona uno o varios servicios
        </h2>
      </div>

      <!-- LISTA DE SERVICIOS -->
      <div class="grid grid-cols-1 gap-3" id="services-selection-grid">
        ${services.map(srv => {
          const isSelected = selectedIds.includes(srv.id);
          return renderServiceCard(srv, isSelected);
        }).join('')}
      </div>

      <!-- STICKY MOBILE SUMMARY BAR -->
      <aside aria-label="Resumen de servicios seleccionados" class="fixed bottom-0 left-0 right-0 z-50 bg-[#1C1C1C] text-[#F2EBDD] border-t-2 border-[#8B1E1E] p-3 shadow-[0_-4px_16px_rgba(0,0,0,0.3)]">
        <div class="max-w-[680px] mx-auto flex items-center justify-between gap-4">
          <div class="flex flex-col min-w-0">
            <span class="font-sans text-[11px] text-[#BDB4A5] uppercase tracking-wider font-semibold">
              ${selectedIds.length} ${selectedIds.length === 1 ? 'servicio' : 'servicios'} · ${formatDurationBlocks(totalDuration)}
            </span>
            <div class="flex items-baseline gap-2">
              <span class="font-mono text-base sm:text-lg font-bold text-[#F2EBDD] tabular-nums">
                ${formatCOP(totalPrice)}
              </span>
            </div>
          </div>

          <button
            type="button"
            id="btn-step1-continue"
            class="min-h-[44px] px-6 py-2.5 rounded-md bg-[#8B1E1E] hover:bg-[#6E1616] text-white font-semibold text-sm shadow-md transition-all active:scale-[0.98] flex items-center gap-2 shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1F3A5F]"
          >
            <span>Elegir Barbero</span>
            <span class="material-symbols-outlined text-[18px]">arrow_forward</span>
          </button>
        </div>
      </aside>
    </div>
  `;
}

export function attachStep1Listeners(onNext) {
  const cards = document.querySelectorAll('#services-selection-grid .service-card');
  cards.forEach(card => {
    card.addEventListener('click', () => {
      const srvId = card.getAttribute('data-service-id');
      if (srvId) {
        bookingStore.toggleService(srvId);
        if (typeof onNext === 'function') {
          // Re-renderizar paso 1
          onNext(1);
        }
      }
    });
  });

  const btnContinue = document.getElementById('btn-step1-continue');
  if (btnContinue) {
    btnContinue.addEventListener('click', () => {
      if (bookingStore.state.selectedServiceIds.length === 0) {
        alert('Por favor selecciona al menos un servicio para continuar.');
        return;
      }
      bookingStore.setStep(2);
      if (typeof onNext === 'function') onNext(2);
    });
  }
}
