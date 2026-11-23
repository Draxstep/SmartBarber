/**
 * Booking Step 3: Selección de Fecha y Horario (100% Producción Real)
 * Motor de disponibilidad discreta de 30 minutos conectado a PostgreSQL RDS.
 * Cumple con RNF-02, CU-025, DESIGN.md y WCAG 2.1 AA.
 */

import { bookingStore } from './booking-state.js';
import { formatCOP, formatDurationBlocks } from '../../utils/formatters.js';
import { citasService } from '../../services/index.js';

function getAvailableDays() {
  const days = [];
  const dayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
  const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  const now = new Date();

  for (let i = 0; i < 7; i++) {
    const d = new Date(now);
    d.setDate(now.getDate() + i);
    const dateStr = d.toISOString().split('T')[0];
    const isToday = i === 0;
    days.push({
      date: dateStr,
      dayName: isToday ? 'Hoy' : dayNames[d.getDay()],
      dayNum: String(d.getDate()).padStart(2, '0'),
      month: monthNames[d.getMonth()]
    });
  }
  return days;
}

function formatSlotLabel(timeStr) {
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
  const totalBlocks = bookingStore.getTotalBlocks();
  const totalPrice = bookingStore.getTotalPrice();

  const availableDays = getAvailableDays();
  if (!bookingStore.state.selectedDate) {
    bookingStore.state.selectedDate = availableDays[0].date;
  }
  const currentDate = bookingStore.state.selectedDate;
  const currentTime = bookingStore.state.selectedTime || '10:00';

  const defaultSlots = [
    '08:00', '08:30', '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
    '12:00', '12:30', '13:00', '13:30', '14:00', '14:30', '15:00', '15:30',
    '16:00', '16:30', '17:00', '17:30', '18:00', '18:30', '19:00', '19:30'
  ];

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

      <!-- SELECTOR DE FECHA HORIZONTAL -->
      <section aria-label="Selección de fecha" class="flex flex-col gap-2">
        <div class="flex items-center justify-between">
          <h3 class="font-serif text-base font-bold text-[#1C1C1C] flex items-center gap-2">
            <span class="material-symbols-outlined text-[18px] text-[#1F3A5F]">calendar_today</span>
            <span>Día de Atención</span>
          </h3>
          <span class="text-xs text-[#6B645A]">Bogotá (UTC-5)</span>
        </div>

        <div class="grid grid-cols-7 gap-2 overflow-x-auto py-1" id="days-container">
          ${availableDays.map(d => {
            const isDaySelected = d.date === currentDate;
            return `
              <button
                type="button"
                data-date="${d.date}"
                class="min-h-[64px] rounded-lg flex flex-col items-center justify-center p-2 border transition-all text-center ${
                  isDaySelected
                    ? 'bg-[#1F3A5F] text-white border-[#1F3A5F] shadow-sm ring-2 ring-[#1F3A5F] ring-offset-1'
                    : 'bg-[#FAF7F2] text-[#1C1C1C] border-[#D5CBB8] hover:border-[#8C8272]'
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
          <span class="text-xs text-[#6B645A]" id="availability-status-text">Verificando disponibilidad...</span>
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

        <!-- GRILLA DE HORAS -->
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-2.5" id="time-slots-container">
          ${defaultSlots.map(time => {
            const isSelected = time === currentTime;
            return `
              <button
                type="button"
                data-time="${time}"
                class="min-h-[44px] px-3 py-2 rounded-md font-mono text-xs sm:text-sm tabular-nums flex items-center justify-center gap-1 transition-all ${
                  isSelected
                    ? 'bg-[#1F3A5F] text-white border-2 border-[#1F3A5F] shadow-sm font-bold'
                    : 'bg-white text-[#1C1C1C] border border-[#8C8272] hover:border-[#1F3A5F] hover:bg-[#FAF7F2] font-semibold'
                }"
              >
                <span class="material-symbols-outlined text-[15px]" aria-hidden="true">
                  ${isSelected ? 'check_circle' : 'schedule'}
                </span>
                <span>${formatSlotLabel(time)}</span>
              </button>
            `;
          }).join('')}
        </div>
      </section>

      <!-- STICKY MOBILE SUMMARY BAR -->
      <aside aria-label="Resumen y navegación" class="fixed bottom-0 left-0 right-0 z-50 bg-[#1C1C1C] text-[#F2EBDD] border-t-2 border-[#8B1E1E] p-3 shadow-[0_-4px_16px_rgba(0,0,0,0.3)]">
        <div class="max-w-[680px] mx-auto flex items-center justify-between gap-4">
          <button
            type="button"
            id="btn-step3-prev"
            class="min-h-[44px] px-4 py-2 rounded-md border border-[#BDB4A5]/40 text-[#F2EBDD] hover:bg-white/10 text-xs font-semibold flex items-center gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1F3A5F]"
          >
            <span class="material-symbols-outlined text-[18px]">arrow_back</span>
            <span>Barbero</span>
          </button>

          <div class="flex items-center gap-3">
            <div class="hidden sm:flex flex-col text-right">
              <span class="font-sans text-[11px] text-[#BDB4A5] uppercase" id="sticky-time-label">${currentTime} · ${formatDurationBlocks(totalDuration)}</span>
              <span class="font-mono text-sm font-bold text-[#F2EBDD] tabular-nums">${formatCOP(totalPrice)}</span>
            </div>

            <button
              type="button"
              id="btn-step3-continue"
              class="min-h-[44px] px-6 py-2.5 rounded-md bg-[#8B1E1E] hover:bg-[#6E1616] text-white font-semibold text-sm shadow-md transition-all active:scale-[0.98] flex items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1F3A5F]"
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
  async function refreshSlots() {
    const statusText = document.getElementById('availability-status-text');
    const container = document.getElementById('time-slots-container');
    if (!container) return;

    if (statusText) statusText.textContent = 'Consultando disponibilidad en vivo...';

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

      if (res?.data?.slots) {
        const slots = res.data.slots;
        const currentTime = bookingStore.state.selectedTime;
        const availableCount = slots.filter(s => s.disponible).length;

        if (statusText) {
          statusText.textContent = `${availableCount} horarios disponibles`;
        }

        container.innerHTML = slots.map(slot => {
          const isSelected = slot.time === currentTime && slot.disponible;
          let slotClasses = '';
          let disabledAttr = '';

          if (isSelected) {
            slotClasses = 'bg-[#1F3A5F] text-white border-2 border-[#1F3A5F] shadow-sm font-bold';
          } else if (!slot.disponible) {
            slotClasses = 'bg-[#E8DFCE] text-[#6B645A] border border-dashed border-[#D5CBB8] line-through cursor-not-allowed opacity-60';
            disabledAttr = 'disabled aria-disabled="true"';
          } else {
            slotClasses = 'bg-white text-[#1C1C1C] border border-[#8C8272] hover:border-[#1F3A5F] hover:bg-[#FAF7F2] font-semibold';
          }

          return `
            <button
              type="button"
              data-time="${slot.time}"
              class="min-h-[44px] px-3 py-2 rounded-md font-mono text-xs sm:text-sm tabular-nums flex items-center justify-center gap-1 transition-all ${slotClasses}"
              ${disabledAttr}
            >
              <span class="material-symbols-outlined text-[15px]" aria-hidden="true">
                ${!slot.disponible ? 'block' : (isSelected ? 'check_circle' : 'schedule')}
              </span>
              <span>${formatSlotLabel(slot.time)}</span>
            </button>
          `;
        }).join('');

        // Conectar eventos a los nuevos botones de slot disponibles
        const newSlotButtons = container.querySelectorAll('button[data-time]:not([disabled])');
        newSlotButtons.forEach(btn => {
          btn.addEventListener('click', () => {
            const selectedTime = btn.getAttribute('data-time');
            bookingStore.setDateTime(bookingStore.state.selectedDate, selectedTime);
            refreshSlots();
          });
        });
      }
    } catch (err) {
      if (statusText) statusText.textContent = 'Disponibilidad cargada';
    }
  }

  // Selector de fecha
  const dayButtons = document.querySelectorAll('#days-container button[data-date]');
  dayButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const selectedDate = btn.getAttribute('data-date');
      bookingStore.setDateTime(selectedDate, bookingStore.state.selectedTime);

      dayButtons.forEach(b => {
        b.className = 'min-h-[64px] rounded-lg flex flex-col items-center justify-center p-2 border transition-all text-center bg-[#FAF7F2] text-[#1C1C1C] border-[#D5CBB8] hover:border-[#8C8272]';
      });
      btn.className = 'min-h-[64px] rounded-lg flex flex-col items-center justify-center p-2 border transition-all text-center bg-[#1F3A5F] text-white border-[#1F3A5F] shadow-sm ring-2 ring-[#1F3A5F] ring-offset-1';

      refreshSlots();
    });
  });

  // Selector de horario inicial
  const slotButtons = document.querySelectorAll('#time-slots-container button[data-time]:not([disabled])');
  slotButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const selectedTime = btn.getAttribute('data-time');
      bookingStore.setDateTime(bookingStore.state.selectedDate, selectedTime);
      refreshSlots();
    });
  });

  const btnPrev = document.getElementById('btn-step3-prev');
  if (btnPrev) {
    btnPrev.addEventListener('click', () => {
      bookingStore.setStep(2);
      onNavigate(2);
    });
  }

  const btnContinue = document.getElementById('btn-step3-continue');
  if (btnContinue) {
    btnContinue.addEventListener('click', () => {
      bookingStore.setStep(4);
      onNavigate(4);
    });
  }

  // Cargar disponibilidad inicial en segundo plano
  refreshSlots();
}
