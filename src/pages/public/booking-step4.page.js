/**
 * Booking Step 4: Tus Datos
 * Formulario accesible con validación nativa (Colombia) y Ley 1581 de datos.
 * Manejo elegante de conflictos de horario (HTTP 409) y validación (HTTP 400).
 */

import { bookingStore } from './booking-state.js';
import { formatCOP, formatDurationBlocks } from '../../utils/formatters.js';
import { openDialog } from '../../components/ui-dialog.js';

export function renderBookingStep4() {
  const customer = bookingStore.state.customer;
  const totalPrice = bookingStore.getTotalPrice();
  const totalDuration = bookingStore.getTotalDuration();

  return `
    <div class="flex flex-col gap-6">
      <div class="flex flex-col gap-1">
        <h2 class="font-serif text-xl sm:text-2xl font-bold text-[#1C1C1C]">
          4. Datos de Contacto & Reserva
        </h2>
        <p class="font-sans text-xs sm:text-sm text-[#4F4A42]">
          No requerimos tarjetas de crédito ni contraseñas. Pagas directamente en la barbería tras finalizar tu servicio.
        </p>
      </div>

      <!-- FORMULARIO DE CLIENTE -->
      <form id="booking-customer-form" class="bg-[#FAF7F2] p-5 sm:p-6 rounded-xl border border-[#D5CBB8] shadow-xs flex flex-col gap-4">
        <!-- NOMBRE COMPLETO -->
        <div class="flex flex-col gap-1.5">
          <label for="cust-name" class="font-sans font-semibold text-xs text-[#1C1C1C]">
            Nombre y Apellido <span class="text-[#8B1E1E]">*</span>
          </label>
          <input
            type="text"
            id="cust-name"
            name="nombre"
            required
            minlength="3"
            value="${customer.nombre || ''}"
            placeholder="Ej: Juan Sebastián Pérez"
            class="h-11 px-3 rounded-md bg-white border border-[#8C8272] text-sm text-[#1C1C1C] placeholder-[#6B645A] focus:outline-none focus:ring-2 focus:ring-[#1F3A5F]"
          />
        </div>

        <!-- CELULAR COLOMBIA -->
        <div class="flex flex-col gap-1.5">
          <label for="cust-phone" class="font-sans font-semibold text-xs text-[#1C1C1C]">
            Teléfono Celular (10 dígitos) <span class="text-[#8B1E1E]">*</span>
          </label>
          <div class="relative">
            <span class="absolute left-3 top-1/2 -translate-y-1/2 font-mono text-xs font-semibold text-[#6B645A] select-none">
              +57
            </span>
            <input
              type="tel"
              id="cust-phone"
              name="telefono"
              required
              pattern="^3[0-9]{9}$"
              value="${customer.telefono || ''}"
              placeholder="3101234567"
              class="h-11 pl-12 pr-3 w-full rounded-md bg-white border border-[#8C8272] font-mono text-sm text-[#1C1C1C] placeholder-[#6B645A] focus:outline-none focus:ring-2 focus:ring-[#1F3A5F]"
            />
          </div>
          <span class="text-[11px] text-[#6B645A]">Te enviaremos confirmación y recordatorio por SMS/WhatsApp.</span>
        </div>

        <!-- EMAIL (OPCIONAL) -->
        <div class="flex flex-col gap-1.5">
          <label for="cust-email" class="font-sans font-semibold text-xs text-[#1C1C1C]">
            Correo Electrónico (Opcional)
          </label>
          <input
            type="email"
            id="cust-email"
            name="email"
            value="${customer.email || ''}"
            placeholder="juan.perez@ejemplo.com"
            class="h-11 px-3 rounded-md bg-white border border-[#8C8272] text-sm text-[#1C1C1C] placeholder-[#6B645A] focus:outline-none focus:ring-2 focus:ring-[#1F3A5F]"
          />
        </div>

        <!-- NOTAS ESPECIALES -->
        <div class="flex flex-col gap-1.5">
          <label for="cust-notes" class="font-sans font-semibold text-xs text-[#1C1C1C]">
            Notas o Preferencias para el Barbero (Opcional)
          </label>
          <textarea
            id="cust-notes"
            name="notas"
            rows="2"
            placeholder="Ej: Fade medio en los lados, barba perfilada con toalla tibia..."
            class="p-3 rounded-md bg-white border border-[#8C8272] text-sm text-[#1C1C1C] placeholder-[#6B645A] focus:outline-none focus:ring-2 focus:ring-[#1F3A5F] resize-none"
          >${customer.notas || ''}</textarea>
        </div>

        <!-- CHECKBOX LEY 1581 (OBLIGATORIO) -->
        <div class="pt-2 border-t border-[#D5CBB8]">
          <label class="flex items-start gap-2.5 cursor-pointer select-none">
            <input
              type="checkbox"
              id="cust-ley1581"
              name="ley1581"
              required
              ${customer.ley1581 ? 'checked' : ''}
              class="w-5 h-5 rounded border-[#8C8272] text-[#1F3A5F] focus:ring-[#1F3A5F] mt-0.5 shrink-0"
            />
            <span class="text-xs text-[#4F4A42] leading-snug">
              Acepto y autorizo de manera voluntaria el tratamiento de mis datos personales con fines de agendamiento y confirmación de turnos, conforme a la <strong>Ley 1581 de 2012</strong> de la República de Colombia.
              <button type="button" id="btn-ver-ley-1581" class="font-bold underline text-[#1F3A5F] hover:text-[#162B47] ml-1 inline">
                Ver términos completos
              </button>
            </span>
          </label>
        </div>
      </form>

      <!-- STICKY MOBILE SUMMARY BAR -->
      <aside aria-label="Resumen y confirmación" class="fixed bottom-0 left-0 right-0 z-50 bg-[#1C1C1C] text-[#F2EBDD] border-t-2 border-[#8B1E1E] p-3 shadow-[0_-4px_16px_rgba(0,0,0,0.3)]">
        <div class="max-w-[680px] mx-auto flex items-center justify-between gap-4">
          <button
            type="button"
            id="btn-step4-prev"
            class="min-h-[44px] px-4 py-2 rounded-md border border-[#BDB4A5]/40 text-[#F2EBDD] hover:bg-white/10 text-xs font-semibold flex items-center gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1F3A5F]"
          >
            <span class="material-symbols-outlined text-[18px]">arrow_back</span>
            <span>Horario</span>
          </button>

          <div class="flex items-center gap-3">
            <div class="hidden sm:flex flex-col text-right">
              <span class="font-sans text-[11px] text-[#BDB4A5] uppercase">${formatDurationBlocks(totalDuration)}</span>
              <span class="font-mono text-sm font-bold text-[#F2EBDD] tabular-nums">${formatCOP(totalPrice)}</span>
            </div>

            <button
              type="submit"
              form="booking-customer-form"
              id="btn-step4-confirm"
              class="min-h-[44px] px-6 py-2.5 rounded-md bg-[#8B1E1E] hover:bg-[#6E1616] text-white font-semibold text-sm shadow-md transition-all active:scale-[0.98] flex items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1F3A5F]"
            >
              <span>Confirmar Cita</span>
              <span class="material-symbols-outlined text-[18px]">verified</span>
            </button>
          </div>
        </div>
      </aside>
    </div>
  `;
}

export function attachStep4Listeners(onNavigate) {
  const form = document.getElementById('booking-customer-form');
  const btnSubmit = document.getElementById('btn-step4-confirm');

  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      const nombre = document.getElementById('cust-name').value.trim();
      const telefono = document.getElementById('cust-phone').value.trim();
      const email = document.getElementById('cust-email').value.trim();
      const notas = document.getElementById('cust-notes').value.trim();
      const ley1581 = document.getElementById('cust-ley1581').checked;

      if (!navigator.onLine) {
        openDialog({
          title: 'Conexión requerida',
          description: 'Se requiere conexión a internet para confirmar disponibilidad en tiempo real. Por favor restablece tu conexión e intenta nuevamente.',
          confirmLabel: 'Entendido',
          isAlertOnly: true
        });
        return;
      }

      if (!ley1581) {
        alert('Debe aceptar la política de tratamiento de datos personales (Ley 1581) para continuar.');
        return;
      }

      try {
        if (btnSubmit) {
          btnSubmit.disabled = true;
          btnSubmit.innerHTML = `
            <span class="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
            <span>Verificando...</span>
          `;
        }

        bookingStore.setCustomerData({ nombre, telefono, email, notas, ley1581 });
        await bookingStore.confirmBooking();
        onNavigate(5);
      } catch (err) {
        if (btnSubmit) {
          btnSubmit.disabled = false;
          btnSubmit.innerHTML = `
            <span>Confirmar Cita</span>
            <span class="material-symbols-outlined text-[18px]">verified</span>
          `;
        }

        const isConflict = err.status === 409;
        openDialog({
          title: isConflict ? 'Horario No Disponible' : 'Atención en Reserva',
          subtitle: isConflict
            ? 'El bloque seleccionado acaba de ser reservado por otro cliente.'
            : (err.message || 'Verifica los datos ingresados.'),
          contentHtml: `
            <div class="p-3.5 rounded-lg ${isConflict ? 'bg-[#FDF1DC] text-[#8A5300] border border-[#8A5300]/30' : 'bg-[#FCE8E6] text-[#B3261E] border border-[#B3261E]/30'} text-xs">
              <p><strong>Detalle:</strong> ${err.message}</p>
              ${isConflict ? '<p class="mt-1">Por favor regresa al paso anterior y selecciona otro horario disponible.</p>' : ''}
            </div>
          `,
          confirmText: isConflict ? 'Elegir Otro Horario' : 'Revisar Datos',
          cancelText: 'Cerrar',
          confirmVariant: isConflict ? 'accent' : 'primary',
          onConfirm: () => {
            if (isConflict) {
              bookingStore.setStep(3);
              onNavigate(3);
            }
            return true;
          }
        });
      }
    });
  }

  const btnPrev = document.getElementById('btn-step4-prev');
  if (btnPrev) {
    btnPrev.addEventListener('click', () => {
      bookingStore.setStep(3);
      onNavigate(3);
    });
  }

  // Modal informativo Ley 1581
  const btnLey1581 = document.getElementById('btn-ver-ley-1581');
  if (btnLey1581) {
    btnLey1581.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      openDialog({
        title: 'Tratamiento de Datos Personales',
        subtitle: 'Conforme a la Ley Estatutaria 1581 de 2012 y Decreto 1377 de 2013',
        contentHtml: `
          <div class="flex flex-col gap-3 text-xs text-[#4F4A42] leading-relaxed max-h-72 overflow-y-auto pr-1">
            <p>
              <strong>1. Responsable del Tratamiento:</strong> SmartBarber S.A.S., NIT 901.458.921-0, con sede en Carrera 3 # 12-42, La Candelaria, Bogotá D.C., Colombia. Correo: contacto@smartbarber.co.
            </p>
            <p>
              <strong>2. Finalidad del Tratamiento:</strong> Los datos recolectados (nombre, teléfono celular y correo electrónico) son utilizados exclusivamente para: (a) Agendar, confirmar y gestionar su cita en sillón; (b) Enviar recordatorios y comprobantes digitales vía SMS o WhatsApp; (c) Atender solicitudes, modificaciones y cancelaciones oportunas.
            </p>
            <p>
              <strong>3. Derechos del Titular (Habeas Data):</strong> Usted tiene derecho a conocer, actualizar, rectificar y suprimir sus datos en cualquier momento, así como a revocar la autorización enviando un correo a contacto@smartbarber.co.
            </p>
            <p>
              <strong>4. Confidencialidad:</strong> SmartBarber garantiza que sus datos personales no serán comercializados, cedidos ni compartidos con terceros con fines publicitarios o lucrativos.
            </p>
          </div>
        `,
        confirmText: 'Entendido y Acepto',
        cancelText: 'Cerrar',
        confirmVariant: 'primary',
        onConfirm: () => {
          const chk = document.getElementById('cust-ley1581');
          if (chk) chk.checked = true;
          return true;
        }
      });
    });
  }
}
