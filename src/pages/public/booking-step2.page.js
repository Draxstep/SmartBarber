/**
 * Booking Step 2: Selección de Barbero
 * Opción de barbero preferido o "Cualquier barbero disponible".
 * Conforme a DESIGN.md y WCAG 2.1 AA.
 */

import { bookingStore } from './booking-state.js';
import { formatCOP, formatDurationBlocks } from '../../utils/formatters.js';

export function renderBookingStep2() {
  const barbers = bookingStore.barbersCatalog;
  const selectedBarberId = bookingStore.state.selectedBarberId;
  const totalDuration = bookingStore.getTotalDuration();
  const totalPrice = bookingStore.getTotalPrice();

  return `
    <div class="flex flex-col gap-6">
      <div>
        <h2 class="font-serif text-xl sm:text-2xl font-bold text-[#1C1C1C]">
          2. ¿Con quién deseas atenderte?
        </h2>
      </div>

      <!-- LISTA DE BARBEROS -->
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3" id="barbers-selection-grid">
        ${barbers.map(barber => {
          const isSelected = barber.id === selectedBarberId;
          const cardClasses = isSelected
            ? 'border-2 border-[#1F3A5F] bg-[#E4ECF5] shadow-xs'
            : 'border border-[#D5CBB8] bg-[#FAF7F2] hover:border-[#8C8272] hover:bg-white';

          const checkClasses = isSelected
            ? 'bg-[#1F3A5F] text-white border-[#1F3A5F]'
            : 'border-2 border-[#8C8272] bg-white text-transparent';

          return `
            <div
              role="radio"
              aria-checked="${isSelected}"
              tabindex="0"
              data-barber-id="${barber.id}"
              class="barber-selection-card cursor-pointer rounded-xl p-4 transition-all flex items-center justify-between gap-3 min-h-[72px] select-none ${cardClasses}"
            >
              <div class="flex items-center gap-3 min-w-0">
                <img
                  src="${barber.foto}"
                  alt="${barber.nombre}"
                  class="w-12 h-12 rounded-full object-cover border-2 border-[#1F3A5F] shrink-0 shadow-2xs"
                />
                <div class="flex flex-col min-w-0">
                  <h3 class="font-sans font-bold text-sm text-[#1C1C1C] truncate leading-tight">
                    ${barber.nombre}
                  </h3>
                  <span class="font-sans text-xs text-[#8B1E1E] font-medium truncate mt-0.5">
                    ${barber.especialidad}
                  </span>
                  <span class="font-sans text-[11px] text-[#6B645A] mt-0.5">
                    ${barber.experiencia}
                  </span>
                </div>
              </div>

              <div class="w-5 h-5 rounded-full flex items-center justify-center shrink-0 transition-colors ${checkClasses}">
                <span class="material-symbols-outlined text-[15px] font-bold">check</span>
              </div>
            </div>
          `;
        }).join('')}
      </div>

      <!-- STICKY MOBILE SUMMARY BAR -->
      <aside aria-label="Resumen y navegación" class="fixed bottom-0 left-0 right-0 z-50 bg-[#1C1C1C] text-[#F2EBDD] border-t-2 border-[#8B1E1E] p-3 shadow-[0_-4px_16px_rgba(0,0,0,0.3)]">
        <div class="max-w-[680px] mx-auto flex items-center justify-between gap-4">
          <button
            type="button"
            id="btn-step2-prev"
            class="min-h-[44px] px-4 py-2 rounded-md border border-[#BDB4A5]/40 text-[#F2EBDD] hover:bg-white/10 text-xs font-semibold flex items-center gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1F3A5F]"
          >
            <span class="material-symbols-outlined text-[18px]">arrow_back</span>
            <span>Servicios</span>
          </button>

          <div class="flex items-center gap-3">
            <div class="hidden sm:flex flex-col text-right">
              <span class="font-sans text-[11px] text-[#BDB4A5] uppercase">${formatDurationBlocks(totalDuration)}</span>
              <span class="font-mono text-sm font-bold text-[#F2EBDD] tabular-nums">${formatCOP(totalPrice)}</span>
            </div>

            <button
              type="button"
              id="btn-step2-continue"
              class="min-h-[44px] px-6 py-2.5 rounded-md bg-[#8B1E1E] hover:bg-[#6E1616] text-white font-semibold text-sm shadow-md transition-all active:scale-[0.98] flex items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1F3A5F]"
            >
              <span>Elegir Horario</span>
              <span class="material-symbols-outlined text-[18px]">arrow_forward</span>
            </button>
          </div>
        </div>
      </aside>
    </div>
  `;
}

export function attachStep2Listeners(onNavigate) {
  const cards = document.querySelectorAll('.barber-selection-card');
  cards.forEach(card => {
    card.addEventListener('click', () => {
      const bId = card.getAttribute('data-barber-id');
      if (bId) {
        bookingStore.setBarber(bId);
        onNavigate(2);
      }
    });

    card.addEventListener('keydown', (e) => {
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        const bId = card.getAttribute('data-barber-id');
        if (bId) {
          bookingStore.setBarber(bId);
          onNavigate(2);
        }
      }
    });
  });

  const btnPrev = document.getElementById('btn-step2-prev');
  if (btnPrev) {
    btnPrev.addEventListener('click', () => {
      bookingStore.setStep(1);
      onNavigate(1);
    });
  }

  const btnContinue = document.getElementById('btn-step2-continue');
  if (btnContinue) {
    btnContinue.addEventListener('click', () => {
      bookingStore.setStep(3);
      onNavigate(3);
    });
  }
}
