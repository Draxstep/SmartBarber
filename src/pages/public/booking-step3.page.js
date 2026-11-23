/**
 * Booking Step 3: Selección de Fecha y Horario (100% Producción Real)
 * Motor de disponibilidad discreta de 30 minutos conectado a PostgreSQL RDS.
 * Cumple con RN-01 a RN-04, RNF-02, CU-025, DESIGN.md y WCAG 2.1 AA.
 */

import { bookingStore } from './booking-state.js';
import { formatCOP, formatDurationBlocks } from '../../utils/formatters.js';
import { citasService } from '../../services/index.js';

function getBogotaNow() {
  const nowUtc = new Date();
  return new Date(nowUtc.getTime() - 5 * 60 * 60 * 1000);
}

function getAvailableDays(totalDays = 14) {
  const days = [];
  const dayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
  const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  const bogotaNow = getBogotaNow();

  for (let i = 0; i < totalDays; i++) {
    const d = new Date(bogotaNow);
    d.setUTCDate(bogotaNow.getUTCDate() + i);
    const dateStr = d.toISOString().slice(0, 10);
    const isToday = i === 0;
    days.push({
      date: dateStr,
      dayName: isToday ? 'Hoy' : dayNames[d.getUTCDay()],
      dayNum: String(d.getUTCDate()).padStart(2, '0'),
      month: monthNames[d.getUTCMonth()]
    });
  }
  return days;
}

export function formatSlotLabel(timeStr) {
  if (!timeStr) return '';
  const [hStr, mStr] = timeStr.split(':');
  let h = parseInt(hStr, 10);
  const ampm = h >= 12 ? 'PM' : 'AM';
  if (h > 12) h -= 12;
  if (h === 0) h = 12;
  return `${String(h).padStart(2, '0')}:${mStr} ${ampm}`;
}

export function renderBookingStep3() {
  const barber = bookingStore.getSelectedBarber() || {
    nombre: 'Cualquier barbero disponible',
    foto: 'https://images.unsplash.com/photo-1585747860715-2ba37e788b70?w=120&auto=format&fit=crop&q=80'
  };
  const services = bookingStore.getSelectedServices();
  const totalDuration = bookingStore.getTotalDuration();
  const totalPrice = bookingStore.getTotalPrice();

  const availableDays = getAvailableDays(14);
  if (!bookingStore.state.selectedDate) {
    bookingStore.state.selectedDate = availableDays[0].date;
  }
  const currentDate = bookingStore.state.selectedDate;
  const currentTime = bookingStore.state.selectedTime; // null por defecto

  const servicesSummaryText = services.map(s => s.nombre).join(' + ') || 'Servicios Seleccionados';

  return `
    <div class="flex flex-col gap-6">
      <div class="flex flex-col gap-1">
        <h2 class="font-serif text-xl sm:text-2xl font-bold text-[#1C1C1C]">
          3. Elige el Día y la Hora
        </h2>
        <p class="font-sans text-xs sm:text-sm text-[#4F4A42]">
          Duración total: <strong>${formatDurationBlocks(totalDuration)}</strong>
        </p>
      </div>

      <!-- TARJETA RESUMEN PREVIA -->
      <div class="bg-[#FAF7F2] rounded-xl p-4 border border-[#D5CBB8] shadow-xs flex items-center justify-between gap-3">
        <div class="flex items-center gap-3 min-w-0">
          <img
            src="${barber.foto}"
            alt="${barber.nombre}"
            class="w-12 h-12 rounded-full object-cover border-2 border-[#1F3A5F] shrink-0 shadow-2xs"
          />
          <div class="flex flex-col min-w-0">
            <span class="font-sans text-xs uppercase tracking-wider text-[#6B645A] font-semibold">Atención con</span>
            <h3 class="font-sans font-bold text-sm text-[#1C1C1C] truncate">${barber.nombre}</h3>
            <span class="font-sans text-xs text-[#4F4A42] truncate">${servicesSummaryText}</span>
          </div>
        </div>

        <div class="flex flex-col items-end shrink-0 pl-2">
          <span class="font-mono font-bold text-sm text-[#1C1C1C] tabular-nums">${formatCOP(totalPrice)}</span>
          <span class="font-sans text-[11px] text-[#6B645A]">${formatDurationBlocks(totalDuration)}</span>
        </div>
      </div>

      <!-- SELECTOR DE FECHA HORIZONTAL (RN-03: hasta 14-30 días) -->
      <section aria-label="Selección de fecha" class="flex flex-col gap-2">
        <div class="flex items-center justify-between">
          <h3 class="font-serif text-base font-bold text-[#1C1C1C] flex items-center gap-2">
            <span class="material-symbols-outlined text-[18px] text-[#1F3A5F]">calendar_today</span>
            <span>Día de Atención</span>
          </h3>
          <span class="text-xs text-[#6B645A]">Bogotá (UTC-5)</span>
        </div>

        <div class="flex gap-2 overflow-x-auto py-1 scrollbar-thin" id="days-container">
          ${availableDays.map(d => {
            const isDaySelected = d.date === currentDate;
            return `
              <button
                type="button"
                data-date="${d.date}"
                class="min-h-[64px] min-w-[62px] sm:min-w-[70px] rounded-lg flex flex-col items-center justify-center p-2 border transition-all text-center shrink-0 cursor-pointer ${
                  isDaySelected
                    ? 'bg-[#1F3A5F] text-white border-[#1F3A5F] shadow-sm ring-2 ring-[#1F3A5F] ring-offset-1'
                    : 'bg-[#FAF7F2] text-[#1C1C1C] border-[#D5CBB8] hover:border-[#8C8272] hover:bg-white'
                }"
              >
                <span class="text-[11px] uppercase tracking-wider font-semibold opacity-90">${d.dayName}</span>
                <span class="font-mono text-base font-bold tabular-nums">${d.dayNum}</span>
                <span class="text-[10px] opacity-75">${d.month}</span>
              </button>
            `;
          }).join('')}
        </div>
      </section>

      <!-- SELECTOR DE HORARIOS EN BLOQUES -->
      <section aria-label="Selección de horario" class="flex flex-col gap-3">
        <div class="flex items-center justify-between">
          <h3 class="font-serif text-base font-bold text-[#1C1C1C] flex items-center gap-2">
            <span class="material-symbols-outlined text-[18px] text-[#1F3A5F]">schedule</span>
            <span>Hora de Inicio</span>
          </h3>
          <span class="text-xs text-[#6B645A]" id="availability-status-text">Consultando disponibilidad en vivo...</span>
        </div>

        <!-- LEYENDA -->
        <div class="flex items-center gap-4 text-xs text-[#4F4A42] bg-[#FAF7F2] p-2.5 rounded-lg border border-[#D5CBB8]">
          <div class="flex items-center gap-1.5">
            <span class="w-3 h-3 rounded-xs bg-white border border-[#8C8272]"></span>
            <span>Disponible</span>
          </div>
          <div class="flex items-center gap-1.5">
            <span class="w-3 h-3 rounded-xs bg-[#1F3A5F]"></span>
            <span class="font-semibold text-[#1F3A5F]">Seleccionado</span>
          </div>
          <div class="flex items-center gap-1.5">
            <span class="w-3 h-3 rounded-xs bg-[#E8DFCE] border border-dashed border-[#D5CBB8]"></span>
            <span class="line-through text-[#6B645A]">Ocupado</span>
          </div>
        </div>

        <!-- GRILLA DE HORAS (Cargada dinámicamente) -->
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-2.5 min-h-[160px]" id="time-slots-container">
          <div class="col-span-full py-12 flex flex-col items-center justify-center gap-2 text-[#6B645A]">
            <span class="material-symbols-outlined animate-spin text-[26px] text-[#1F3A5F]">progress_activity</span>
            <span class="font-sans text-xs font-medium">Verificando turnos disponibles en tiempo real...</span>
          </div>
        </div>
      </section>

      <!-- STICKY MOBILE SUMMARY BAR -->
      <aside aria-label="Resumen y navegación" class="fixed bottom-0 left-0 right-0 z-50 bg-[#1C1C1C] text-[#F2EBDD] border-t-2 border-[#8B1E1E] p-3 shadow-[0_-4px_16px_rgba(0,0,0,0.3)]">
        <div class="max-w-[680px] mx-auto flex items-center justify-between gap-4">
          <button
            type="button"
            id="btn-step3-prev"
            class="min-h-[44px] px-4 py-2 rounded-md border border-[#BDB4A5]/40 text-[#F2EBDD] hover:bg-white/10 text-xs font-semibold flex items-center gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1F3A5F] cursor-pointer"
          >
            <span class="material-symbols-outlined text-[18px]">arrow_back</span>
            <span>Barbero</span>
          </button>

          <div class="flex items-center gap-3">
            <div class="hidden sm:flex flex-col text-right">
              <span class="font-sans text-[11px] text-[#BDB4A5] uppercase" id="sticky-time-label">
                ${currentTime ? `${formatSlotLabel(currentTime)} · ${formatDurationBlocks(totalDuration)}` : 'Selecciona un horario'}
              </span>
              <span class="font-mono text-sm font-bold text-[#F2EBDD] tabular-nums">${formatCOP(totalPrice)}</span>
            </div>

            <button
              type="button"
              id="btn-step3-continue"
              ${currentTime ? '' : 'disabled'}
              class="min-h-[44px] px-6 py-2.5 rounded-md text-white font-semibold text-sm shadow-md transition-all flex items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1F3A5F] ${
                currentTime
                  ? 'bg-[#8B1E1E] hover:bg-[#6E1616] cursor-pointer active:scale-[0.98]'
                  : 'bg-[#8C8272] opacity-50 cursor-not-allowed'
              }"
            >
              <span>Ingresar Datos</span>
              <span class="material-symbols-outlined text-[18px]">arrow_forward</span>
            </button>
          </div>
        </div>
      </aside>
    </div>
  `;
}

export function attachStep3Listeners(onNavigate) {
  const container = document.getElementById('time-slots-container');
  const daysContainer = document.getElementById('days-container');
  const statusText = document.getElementById('availability-status-text');
  const btnContinue = document.getElementById('btn-step3-continue');
  const stickyLabel = document.getElementById('sticky-time-label');

  function updateContinueButtonUI(time) {
    const totalDuration = bookingStore.getTotalDuration();
    if (time) {
      if (btnContinue) {
        btnContinue.removeAttribute('disabled');
        btnContinue.className = 'min-h-[44px] px-6 py-2.5 rounded-md bg-[#8B1E1E] hover:bg-[#6E1616] text-white font-semibold text-sm shadow-md transition-all active:scale-[0.98] flex items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1F3A5F] cursor-pointer';
      }
      if (stickyLabel) {
        stickyLabel.textContent = `${formatSlotLabel(time)} · ${formatDurationBlocks(totalDuration)}`;
      }
    } else {
      if (btnContinue) {
        btnContinue.setAttribute('disabled', 'true');
        btnContinue.className = 'min-h-[44px] px-6 py-2.5 rounded-md bg-[#8C8272] opacity-50 cursor-not-allowed text-white font-semibold text-sm shadow-xs flex items-center gap-2 focus-visible:outline-none';
      }
      if (stickyLabel) {
        stickyLabel.textContent = 'Selecciona un horario';
      }
    }
  }

  function updateSlotButtonsSelection(selectedTime) {
    if (!container) return;
    const allSlotButtons = container.querySelectorAll('button[data-time]');
    allSlotButtons.forEach(btn => {
      const isBtnDisabled = btn.hasAttribute('disabled');
      if (isBtnDisabled) return;

      const btnTime = btn.getAttribute('data-time');
      const isSelected = btnTime === selectedTime;

      btn.setAttribute('aria-pressed', isSelected ? 'true' : 'false');
      btn.className = `min-h-[44px] px-3 py-2 rounded-md font-mono text-xs sm:text-sm tabular-nums flex items-center justify-center gap-1.5 transition-all ${
        isSelected
          ? 'bg-[#1F3A5F] text-white border-2 border-[#1F3A5F] shadow-sm font-bold ring-2 ring-[#1F3A5F] ring-offset-2'
          : 'bg-white text-[#1C1C1C] border border-[#8C8272] hover:border-[#1F3A5F] hover:bg-[#FAF7F2] font-semibold cursor-pointer active:scale-[0.98]'
      }`;

      const iconSpan = btn.querySelector('.material-symbols-outlined');
      if (iconSpan) {
        iconSpan.textContent = isSelected ? 'check_circle' : 'schedule';
        iconSpan.className = `material-symbols-outlined text-[16px] ${isSelected ? 'text-white' : 'text-[#1F3A5F]'}`;
      }
    });
  }

  async function refreshSlots() {
    if (!container) return;

    if (statusText) statusText.textContent = 'Consultando disponibilidad en vivo...';

    // Skeleton o indicador de carga
    container.innerHTML = `
      <div class="col-span-full py-12 flex flex-col items-center justify-center gap-2 text-[#6B645A]">
        <span class="material-symbols-outlined animate-spin text-[26px] text-[#1F3A5F]">progress_activity</span>
        <span class="font-sans text-xs font-medium">Verificando turnos disponibles en tiempo real...</span>
      </div>
    `;

    const date = bookingStore.state.selectedDate;
    const barber = bookingStore.getSelectedBarber();
    const barberId = barber?.id === 'any' ? null : barber?.id;
    const blocks = bookingStore.getTotalBlocks();
    const serviceIds = bookingStore.state.selectedServiceIds;

    try {
      const res = await citasService.getDisponibilidad({
        fecha: date,
        barberoId,
        duracionBloques: blocks,
        servicioIds
      });

      if (res?.data?.slots && Array.isArray(res.data.slots)) {
        const slots = res.data.slots;
        const availableSlots = slots.filter(s => s.disponible);
        const availableCount = availableSlots.length;

        // Si el horario seleccionado previamente no está disponible en este día/barbero, limpiarlo
        if (bookingStore.state.selectedTime) {
          const isStillAvailable = availableSlots.some(s => s.time === bookingStore.state.selectedTime);
          if (!isStillAvailable) {
            bookingStore.clearTimeSelection();
          }
        }
        const currentTime = bookingStore.state.selectedTime;
        updateContinueButtonUI(currentTime);

        if (statusText) {
          statusText.textContent = `${availableCount} ${availableCount === 1 ? 'horario disponible' : 'horarios disponibles'}`;
        }

        if (availableCount === 0) {
          container.innerHTML = `
            <div class="col-span-full py-8 px-4 bg-[#FAF7F2] rounded-xl border border-[#D5CBB8] text-center flex flex-col items-center gap-2">
              <span class="material-symbols-outlined text-[32px] text-[#8C8272]">event_busy</span>
              <p class="font-sans font-bold text-sm text-[#1C1C1C]">No hay turnos disponibles para esta fecha</p>
              <p class="font-sans text-xs text-[#6B645A] max-w-sm">
                Todos los bloques están reservados o fuera del turno laboral. Selecciona otro día en el calendario o elige otro barbero.
              </p>
            </div>
          `;
          return;
        }

        container.innerHTML = slots.map(slot => {
          const isSelected = slot.time === currentTime && slot.disponible;
          let slotClasses = '';
          let disabledAttr = '';
          let iconName = 'schedule';
          let iconColor = 'text-[#1F3A5F]';

          if (isSelected) {
            slotClasses = 'bg-[#1F3A5F] text-white border-2 border-[#1F3A5F] shadow-sm font-bold ring-2 ring-[#1F3A5F] ring-offset-2';
            iconName = 'check_circle';
            iconColor = 'text-white';
          } else if (!slot.disponible) {
            slotClasses = 'bg-[#E8DFCE] text-[#6B645A] border border-dashed border-[#D5CBB8] line-through cursor-not-allowed opacity-60';
            disabledAttr = 'disabled aria-disabled="true"';
            iconName = 'block';
            iconColor = 'text-[#6B645A]';
          } else {
            slotClasses = 'bg-white text-[#1C1C1C] border border-[#8C8272] hover:border-[#1F3A5F] hover:bg-[#FAF7F2] font-semibold cursor-pointer active:scale-[0.98]';
          }

          return `
            <button
              type="button"
              data-time="${slot.time}"
              class="min-h-[44px] px-3 py-2 rounded-md font-mono text-xs sm:text-sm tabular-nums flex items-center justify-center gap-1.5 transition-all ${slotClasses}"
              aria-pressed="${isSelected ? 'true' : 'false'}"
              ${disabledAttr}
            >
              <span class="material-symbols-outlined text-[16px] ${iconColor}" aria-hidden="true">
                ${iconName}
              </span>
              <span>${formatSlotLabel(slot.time)}</span>
            </button>
          `;
        }).join('');
      } else {
        if (statusText) statusText.textContent = 'Horarios actualizados';
      }
    } catch (err) {
      if (statusText) statusText.textContent = 'No fue posible consultar turnos';
      container.innerHTML = `
        <div class="col-span-full py-6 px-4 bg-[#FCE8E6] rounded-xl border border-[#B3261E]/30 text-center flex flex-col items-center gap-2">
          <span class="material-symbols-outlined text-[28px] text-[#B3261E]">error</span>
          <p class="font-sans font-semibold text-xs text-[#B3261E]">Error al cargar disponibilidad</p>
          <button type="button" id="btn-retry-slots" class="text-xs font-bold underline text-[#1F3A5F]">Reintentar</button>
        </div>
      `;
      const retryBtn = document.getElementById('btn-retry-slots');
      if (retryBtn) retryBtn.addEventListener('click', () => refreshSlots());
    }
  }

  // Delegación de eventos en el contenedor de slots (SRP / DRY)
  if (container) {
    container.addEventListener('click', (e) => {
      const btn = e.target.closest('button[data-time]:not([disabled])');
      if (!btn) return;

      const selectedTime = btn.getAttribute('data-time');
      if (!selectedTime) return;

      bookingStore.setDateTime(bookingStore.state.selectedDate, selectedTime);
      updateSlotButtonsSelection(selectedTime);
      updateContinueButtonUI(selectedTime);
    });
  }

  // Delegación de eventos en el contenedor de días
  if (daysContainer) {
    daysContainer.addEventListener('click', (e) => {
      const btn = e.target.closest('button[data-date]');
      if (!btn) return;

      const selectedDate = btn.getAttribute('data-date');
      if (selectedDate === bookingStore.state.selectedDate) return;

      // Al cambiar de fecha, invalidar la hora seleccionada
      bookingStore.setDateTime(selectedDate, null);
      updateContinueButtonUI(null);

      // Actualizar estado visual de los botones de día
      const allDayButtons = daysContainer.querySelectorAll('button[data-date]');
      allDayButtons.forEach(b => {
        const isSelected = b.getAttribute('data-date') === selectedDate;
        b.className = `min-h-[64px] min-w-[62px] sm:min-w-[70px] rounded-lg flex flex-col items-center justify-center p-2 border transition-all text-center shrink-0 cursor-pointer ${
          isSelected
            ? 'bg-[#1F3A5F] text-white border-[#1F3A5F] shadow-sm ring-2 ring-[#1F3A5F] ring-offset-1'
            : 'bg-[#FAF7F2] text-[#1C1C1C] border-[#D5CBB8] hover:border-[#8C8272] hover:bg-white'
        }`;
      });

      // Recalcular disponibilidad para el nuevo día
      refreshSlots();
    });
  }

  // Navegación anterior (Volver al Paso 2)
  const btnPrev = document.getElementById('btn-step3-prev');
  if (btnPrev) {
    btnPrev.addEventListener('click', () => {
      bookingStore.setStep(2);
      onNavigate(2);
    });
  }

  // Navegación siguiente (Avanzar al Paso 4 solo si hay horario válido)
  if (btnContinue) {
    btnContinue.addEventListener('click', () => {
      if (!bookingStore.state.selectedTime) {
        return;
      }
      bookingStore.setStep(4);
      onNavigate(4);
    });
  }

  // Cargar disponibilidad inicial al montar la vista
  refreshSlots();
}
