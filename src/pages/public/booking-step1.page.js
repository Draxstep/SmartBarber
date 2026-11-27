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
            <span id="step1-summary-meta" class="font-sans text-[11px] text-[#BDB4A5] uppercase tracking-wider font-semibold">
              ${selectedIds.length} ${selectedIds.length === 1 ? 'servicio' : 'servicios'} · ${formatDurationBlocks(totalDuration)}
            </span>
            <div class="flex items-baseline gap-2">
              <span id="step1-summary-price" class="font-mono text-base sm:text-lg font-bold text-[#F2EBDD] tabular-nums">
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
  const grid = document.getElementById('services-selection-grid');
  if (grid) {
    const syncCardsAndSummary = () => {
      const selectedIds = bookingStore.state.selectedServiceIds;
      grid.querySelectorAll('.service-card').forEach(card => {
        const srvId = card.getAttribute('data-service-id');
        const isSelected = selectedIds.includes(srvId);
        card.setAttribute('aria-checked', String(isSelected));
        card.className = `service-card cursor-pointer rounded-lg p-4 transition-all duration-150 flex items-start justify-between gap-3 ${
          isSelected
            ? 'border-2 border-[#1F3A5F] bg-[#E4ECF5] shadow-xs'
            : 'border border-[#D5CBB8] bg-[#FAF7F2] hover:border-[#8C8272] hover:shadow-xs'
        }`;
        const checkbox = card.firstElementChild?.firstElementChild;
        if (checkbox) {
          checkbox.className = `w-5 h-5 rounded flex items-center justify-center shrink-0 mt-0.5 transition-colors ${
            isSelected
              ? 'bg-[#1F3A5F] text-white border-[#1F3A5F]'
              : 'border-2 border-[#8C8272] bg-white text-transparent'
          }`;
        }
      });

      const metaEl = document.getElementById('step1-summary-meta');
      const priceEl = document.getElementById('step1-summary-price');
      const count = selectedIds.length;
      if (metaEl) {
        metaEl.textContent = `${count} ${count === 1 ? 'servicio' : 'servicios'} · ${formatDurationBlocks(bookingStore.getTotalDuration())}`;
      }
      if (priceEl) {
        priceEl.textContent = formatCOP(bookingStore.getTotalPrice());
      }
    };

    grid.addEventListener('click', (e) => {
      const card = e.target.closest?.('.service-card');
      const srvId = card?.getAttribute('data-service-id');
      if (srvId) {
        bookingStore.toggleService(srvId);
        syncCardsAndSummary();
      }
    });

    grid.addEventListener('keydown', (e) => {
      if (e.key !== ' ' && e.key !== 'Enter') return;
      const card = e.target.closest?.('.service-card');
      const srvId = card?.getAttribute('data-service-id');
      if (srvId) {
        e.preventDefault();
        bookingStore.toggleService(srvId);
        syncCardsAndSummary();
      }
    });
  }

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
