/**
 * Booking Step 5: Confirmación y Recibo
 * Generación de código SB-XXXXXX, resumen formal, copia y exportación a calendario.
 * Conforme a DESIGN.md y WCAG 2.1 AA.
 */

import { bookingStore } from './booking-state.js';
import { formatCOP, formatDurationBlocks } from '../../utils/formatters.js';

export function renderBookingStep5() {
  const booking = bookingStore.state.confirmedBooking || bookingStore.confirmBooking();

  return `
    <div class="flex flex-col gap-6">
      <!-- ENCABEZADO DE ÉXITO -->
      <div class="flex flex-col items-center text-center">
        <div class="w-16 h-16 rounded-full bg-[#E3EFE7] text-[#235D3A] flex items-center justify-center mb-3 shadow-xs">
          <span class="material-symbols-outlined text-[36px]">check_circle</span>
        </div>
        <span class="font-sans text-xs uppercase tracking-widest text-[#235D3A] font-bold">¡Reserva Confirmada!</span>
        <h2 class="font-serif text-2xl sm:text-3xl font-bold text-[#1C1C1C] mt-1">
          Te Esperamos en SmartBarber
        </h2>
        <p class="font-sans text-xs sm:text-sm text-[#4F4A42] max-w-sm mt-1">
          Hemos reservado tu turno con precisión de 30 minutos. Te recomendamos llegar 5 minutos antes.
        </p>
      </div>

      <!-- RECIBO FORMAL CON CÓDIGO DE RESERVA -->
      <div class="bg-white rounded-xl border border-[#D5CBB8] shadow-sm overflow-hidden max-w-lg mx-auto w-full">
        <!-- Código Header Bar -->
        <div class="bg-[#1C1C1C] text-[#F2EBDD] p-5 flex flex-col items-center justify-center border-b-2 border-[#8B1E1E]">
          <span class="font-sans text-[10px] text-[#BDB4A5] uppercase tracking-wider font-semibold">Código de Cita Oficial</span>
          <div class="flex items-center gap-2 mt-1">
            <span class="font-mono text-2xl sm:text-3xl font-bold text-[#F2EBDD] tracking-wider tabular-nums" id="booking-code-text">
              ${booking.codigo}
            </span>
            <button
              type="button"
              id="btn-copy-code"
              class="p-1.5 rounded-md hover:bg-white/10 text-[#BDB4A5] hover:text-white transition-colors"
              title="Copiar código al portapapeles"
            >
              <span class="material-symbols-outlined text-[18px]">content_copy</span>
            </button>
          </div>
          <span class="text-[11px] text-[#BDB4A5] mt-1">Presenta este código al ingresar a la sede</span>
        </div>

        <!-- Desglose de Cita -->
        <div class="p-5 flex flex-col gap-4 text-xs">
          <!-- Fecha y Hora -->
          <div class="flex items-center justify-between pb-3 border-b border-[#D5CBB8]/60">
            <div class="flex items-center gap-2 text-[#4F4A42]">
              <span class="material-symbols-outlined text-[18px] text-[#1F3A5F]">calendar_month</span>
              <span>Fecha & Horario:</span>
            </div>
            <span class="font-sans font-bold text-[#1C1C1C]">${booking.fecha} · ${booking.hora} (${formatDurationBlocks(booking.duracionMinutos)})</span>
          </div>

          <!-- Barbero Asignado -->
          <div class="flex items-center justify-between pb-3 border-b border-[#D5CBB8]/60">
            <div class="flex items-center gap-2 text-[#4F4A42]">
              <span class="material-symbols-outlined text-[18px] text-[#1F3A5F]">person</span>
              <span>Barbero de Turno:</span>
            </div>
            <span class="font-sans font-bold text-[#1C1C1C]">${booking.barbero.nombre}</span>
          </div>

          <!-- Cliente -->
          <div class="flex items-center justify-between pb-3 border-b border-[#D5CBB8]/60">
            <div class="flex items-center gap-2 text-[#4F4A42]">
              <span class="material-symbols-outlined text-[18px] text-[#1F3A5F]">badge</span>
              <span>Cliente:</span>
            </div>
            <span class="font-sans font-semibold text-[#1C1C1C]">${booking.cliente.nombre} (${booking.cliente.telefono})</span>
          </div>

          <!-- Servicios -->
          <div class="flex flex-col gap-1.5 pb-3 border-b border-[#D5CBB8]/60">
            <span class="text-[#6B645A] font-semibold uppercase text-[10px] tracking-wider">Servicios Contratados</span>
            ${booking.servicios.map(s => `
              <div class="flex items-center justify-between">
                <span class="text-[#1C1C1C]">${s.nombre}</span>
                <span class="font-mono font-semibold text-[#1C1C1C] tabular-nums">${formatCOP(s.precio)}</span>
              </div>
            `).join('')}
          </div>

          <!-- Total a Liquidar -->
          <div class="flex items-center justify-between pt-1 text-sm font-bold">
            <span class="text-[#1C1C1C]">Total a pagar en sede:</span>
            <span class="font-mono text-base text-[#1F3A5F] tabular-nums">${formatCOP(booking.totalCOP)}</span>
          </div>
        </div>

        <!-- Dirección Footer -->
        <div class="bg-[#FAF7F2] p-4 border-t border-[#D5CBB8] text-center text-xs text-[#4F4A42]">
          <p class="font-semibold text-[#1C1C1C]">SmartBarber Sede Centro</p>
          <p class="text-[11px] text-[#6B645A] mt-0.5">Carrera 7 # 12-45, Bogotá D.C. · Tel: +57 (601) 345-6789</p>
        </div>
      </div>

      <!-- BOTONES DE ACCIÓN POST-RESERVA -->
      <div class="flex flex-col sm:flex-row items-center justify-center gap-3 max-w-lg mx-auto w-full">
        <button
          type="button"
          id="btn-add-calendar"
          class="w-full sm:w-auto min-h-[44px] px-5 py-2 rounded-md border-[1.5px] border-[#1F3A5F] text-[#1F3A5F] hover:bg-[#E4ECF5] text-xs font-semibold flex items-center justify-center gap-2 transition-colors"
        >
          <span class="material-symbols-outlined text-[18px]">event</span>
          <span>Añadir a mi Calendario</span>
        </button>

        <button
          type="button"
          id="btn-book-another"
          class="w-full sm:w-auto min-h-[44px] px-5 py-2 rounded-md bg-[#1F3A5F] hover:bg-[#162B47] text-white text-xs font-semibold flex items-center justify-center gap-2 transition-all shadow-sm"
        >
          <span class="material-symbols-outlined text-[18px]">add_circle</span>
          <span>Agendar Otra Cita</span>
        </button>

        <a
          href="#inicio"
          id="btn-go-home"
          class="w-full sm:w-auto min-h-[44px] px-5 py-2 rounded-md bg-white border border-[#D5CBB8] text-[#1C1C1C] hover:bg-[#FAF7F2] text-xs font-semibold flex items-center justify-center gap-2 transition-colors"
        >
          <span class="material-symbols-outlined text-[18px]">home</span>
          <span>Ir al Inicio</span>
        </a>
      </div>
    </div>
  `;
}

export function attachStep5Listeners(onNavigate) {
  // Copiar código de reserva
  const btnCopy = document.getElementById('btn-copy-code');
  const codeEl = document.getElementById('booking-code-text');
  if (btnCopy && codeEl) {
    btnCopy.addEventListener('click', async () => {
      const code = codeEl.textContent.trim();
      try {
        await navigator.clipboard.writeText(code);
        alert(`Código ${code} copiado al portapapeles.`);
      } catch (_) {
        alert(`Código de reserva: ${code}`);
      }
    });
  }

  // Descargar archivo .ics de calendario
  const btnCalendar = document.getElementById('btn-add-calendar');
  if (btnCalendar) {
    btnCalendar.addEventListener('click', () => {
      const b = bookingStore.state.confirmedBooking;
      if (!b) return;

      const title = `Cita en SmartBarber (${b.codigo})`;
      const desc = `Servicios: ${b.servicios.map(s => s.nombre).join(', ')}. Barbero: ${b.barbero.nombre}. Total: ${formatCOP(b.totalCOP)}.`;
      const location = 'Carrera 7 # 12-45, La Candelaria, Bogotá D.C.';

      const icsContent = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//SmartBarber//ES',
        'BEGIN:VEVENT',
        `SUMMARY:${title}`,
        `DESCRIPTION:${desc}`,
        `LOCATION:${location}`,
        `STATUS:CONFIRMED`,
        'END:VEVENT',
        'END:VCALENDAR'
      ].join('\r\n');

      const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `SmartBarber-${b.codigo}.ics`;
      link.click();
      URL.revokeObjectURL(url);
    });
  }

  // Agendar otra cita
  const btnAnother = document.getElementById('btn-book-another');
  if (btnAnother) {
    btnAnother.addEventListener('click', () => {
      bookingStore.reset();
      onNavigate(1);
    });
  }

  const btnHome = document.getElementById('btn-go-home');
  if (btnHome) {
    btnHome.addEventListener('click', (e) => {
      e.preventDefault();
      window.location.hash = '#inicio';
    });
  }
}
