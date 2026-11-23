/**
 * SmartBarber - Módulo de Consulta y Cancelación de Cita (Público)
 * Fiel a RF-AGE-06 y docs/stitch/smartbarber_modal_de_cancelaci_n_con_antelaci_n_m_nima
 * Permite al cliente buscar su cita por código SB-XXXXXX y cancelarla con antelación mínima (>= 2h).
 */

import { citasService } from '../../services/index.js';
import { formatCOP } from '../../utils/formatters.js';

let searchedCita = null;
let searchError = '';
let isCancelling = false;

export function renderConsultarCitaPage() {
  return `
    <div class="min-h-screen bg-[#F2EBDD] font-sans text-[#1C1C1C] flex flex-col justify-between">
      <!-- HEADER PÚBLICO MINIMALISTA -->
      <header class="bg-[#1C1C1C] text-[#F2EBDD] py-4 px-6 border-b-2 border-[#8B1E1E]">
        <div class="max-w-[720px] mx-auto flex items-center justify-between">
          <a href="/" class="flex items-center gap-2.5">
            <div class="w-8 h-8 rounded bg-[#8B1E1E] flex items-center justify-center text-white">
              <span class="material-symbols-outlined text-[18px]">content_cut</span>
            </div>
            <span class="font-serif text-xl font-bold tracking-tight">SmartBarber</span>
          </a>
          <a href="/#booking-wizard" class="text-xs font-semibold text-[#BDB4A5] hover:text-white flex items-center gap-1">
            <span class="material-symbols-outlined text-[16px]">add</span>
            <span>Nueva Cita</span>
          </a>
        </div>
      </header>

      <!-- CONTENIDO PRINCIPAL -->
      <main class="max-w-[640px] w-full mx-auto p-4 sm:p-6 my-auto">
        <div class="bg-[#FAF7F2] border border-[#D5CBB8] rounded-2xl shadow-sm p-6 sm:p-8 flex flex-col gap-6">
          <div class="flex flex-col gap-1 text-center">
            <div class="w-12 h-12 rounded-full bg-[#E4ECF5] text-[#1F3A5F] flex items-center justify-center mx-auto mb-2">
              <span class="material-symbols-outlined text-[24px]">manage_search</span>
            </div>
            <h1 class="font-serif text-2xl font-bold text-[#1C1C1C]">Consultar o Gestionar mi Cita</h1>
          </div>

          <!-- Formulario de Consulta -->
          <form id="form-consultar-cita" class="flex flex-col gap-3">
            <div class="flex flex-col gap-1.5">
              <label for="input-codigo-cita" class="font-semibold text-xs text-[#1C1C1C]">
                Código de Cita Oficial <span class="text-[#8B1E1E]">*</span>
              </label>
              <div class="relative">
                <span class="material-symbols-outlined absolute left-3 top-2.5 text-[#6B645A] text-[18px]">tag</span>
                <input
                  type="text"
                  id="input-codigo-cita"
                  required
                  placeholder="SB-00124"
                  value="${searchedCita ? searchedCita.id : ''}"
                  class="h-11 pl-10 pr-3 w-full bg-white border border-[#8C8272] rounded-lg text-sm font-mono font-bold uppercase text-[#1C1C1C] placeholder-[#6B645A] focus:outline-none focus:ring-2 focus:ring-[#1F3A5F]"
                />
              </div>
            </div>

            <button
              type="submit"
              id="btn-buscar-cita"
              class="min-h-[44px] w-full bg-[#1F3A5F] hover:bg-[#162B47] text-white rounded-lg text-xs font-semibold shadow-xs transition-all active:scale-[0.98] flex items-center justify-center gap-2"
            >
              <span class="material-symbols-outlined text-[18px]">search</span>
              <span>Buscar Cita</span>
            </button>
          </form>

          <!-- Banner de Error si aplica -->
          ${searchError ? `
            <div class="p-3.5 rounded-lg bg-[#FCE8E6] border border-[#B3261E]/30 text-xs text-[#B3261E] flex items-start gap-2.5" role="alert">
              <span class="material-symbols-outlined text-[18px] shrink-0 mt-0.5">error</span>
              <div>
                <strong class="font-semibold">No encontrada:</strong>
                <p class="mt-0.5">${searchError}</p>
              </div>
            </div>
          ` : ''}

          <!-- Tarjeta de Detalle de Cita Encontrada -->
          ${searchedCita ? `
            <div class="border border-[#D5CBB8] rounded-xl bg-white overflow-hidden shadow-xs animate-fadeIn">
              <div class="bg-[#1C1C1C] text-[#F2EBDD] p-4 flex items-center justify-between border-b-2 border-[#8B1E1E]">
                <div class="flex items-center gap-2">
                  <span class="font-mono text-lg font-bold text-white">#${searchedCita.id}</span>
                  <span class="text-[11px] text-[#BDB4A5]">· Sede Principal</span>
                </div>
                ${
                  searchedCita.status === 'cancelada'
                    ? '<span class="px-2 py-0.5 rounded bg-[#FCE8E6] text-[#B3261E] font-semibold text-[11px]">Cancelada</span>'
                    : searchedCita.status === 'completada'
                    ? '<span class="px-2 py-0.5 rounded bg-[#E3EFE7] text-[#235D3A] font-semibold text-[11px]">Completada</span>'
                    : '<span class="px-2 py-0.5 rounded bg-[#E4ECF5] text-[#1F3A5F] font-semibold text-[11px]">Confirmada</span>'
                }
              </div>

              <div class="p-4 sm:p-5 flex flex-col gap-3 text-xs">
                <div class="flex items-center justify-between pb-2 border-b border-[#D5CBB8]/60">
                  <span class="text-[#6B645A]">Cliente:</span>
                  <strong class="text-[#1C1C1C]">${searchedCita.clientName} (${searchedCita.clientPhone})</strong>
                </div>

                <div class="flex items-center justify-between pb-2 border-b border-[#D5CBB8]/60">
                  <span class="text-[#6B645A]">Fecha y Horario:</span>
                  <strong class="text-[#1C1C1C]">${searchedCita.fecha} · ${searchedCita.timeStart} – ${searchedCita.timeEnd}</strong>
                </div>

                <div class="flex items-center justify-between pb-2 border-b border-[#D5CBB8]/60">
                  <span class="text-[#6B645A]">Servicio Solicitado:</span>
                  <strong class="text-[#1C1C1C]">${searchedCita.serviceName}</strong>
                </div>

                <div class="flex items-center justify-between pb-2 border-b border-[#D5CBB8]/60">
                  <span class="text-[#6B645A]">Valor a Pagar en Sede:</span>
                  <strong class="font-mono text-sm text-[#1F3A5F]">${formatCOP(searchedCita.price)} COP</strong>
                </div>

                <!-- Botón Cancelar si la cita no está completada ni cancelada -->
                ${searchedCita.status !== 'cancelada' && searchedCita.status !== 'completada' ? `
                  <div class="pt-2 flex justify-end">
                    <button
                      type="button"
                      id="btn-open-cancelar-modal"
                      class="min-h-[40px] px-4 rounded-lg bg-[#FCE8E6] text-[#B3261E] hover:bg-[#B3261E] hover:text-white text-xs font-semibold transition-all border border-[#B3261E]/30"
                    >
                      Cancelar esta Cita
                    </button>
                  </div>
                ` : ''}
              </div>
            </div>
          ` : ''}

          <!-- Volver a Inicio -->
          <div class="pt-3 border-t border-[#D5CBB8] text-center">
            <a href="/" class="text-xs font-semibold text-[#1F3A5F] hover:underline flex items-center justify-center gap-1.5">
              <span class="material-symbols-outlined text-[16px]">arrow_back</span>
              <span>Volver a la Página Principal</span>
            </a>
          </div>
        </div>
      </main>

      <!-- FOOTER DISCRETO -->
      <footer class="py-4 text-center text-xs text-[#6B645A]">
        &copy; 2026 SmartBarber · Política de Cancelación con mínimo 2 horas de antelación
      </footer>
    </div>

    <!-- ========================================== -->
    <!-- MODAL DE CANCELACIÓN CON ANTELACIÓN MÍNIMA -->
    <!-- ========================================== -->
    <dialog
      id="dialog-cancelar-cita-cliente"
      class="p-0 rounded-2xl bg-[#FAF7F2] border border-[#D5CBB8] shadow-2xl backdrop:bg-black/50 max-w-md w-full mx-auto my-auto"
    >
      <div class="p-6 flex flex-col gap-4 text-xs">
        <div class="flex items-start gap-3">
          <div class="w-10 h-10 rounded-full bg-[#FCE8E6] text-[#B3261E] flex items-center justify-center shrink-0">
            <span class="material-symbols-outlined text-[22px]">event_busy</span>
          </div>
          <div>
            <h3 class="font-serif text-lg font-bold text-[#1C1C1C]">¿Deseas cancelar tu cita?</h3>
            <p class="text-[11px] text-[#6B645A] mt-0.5">Política de antelación mínima de 2 horas</p>
          </div>
        </div>

        <div class="p-3 rounded-lg bg-[#FDF1DC] border border-[#8A5300]/30 text-[#8A5300] leading-relaxed">
          <strong class="font-semibold block mb-0.5">Política de Cancelación (RF-AGE-06):</strong>
          Puedes cancelar tu cita sin penalización si restan más de 2 horas para el inicio del servicio. Si falta menos tiempo, la franja se libera pero agradecemos avisar telefónicamente a la sede.
        </div>

        <div class="flex flex-col gap-1.5">
          <label for="cancel-motivo-select" class="font-semibold text-[#1C1C1C]">Motivo de Cancelación</label>
          <select
            id="cancel-motivo-select"
            class="h-10 px-3 bg-white border border-[#8C8272] rounded-lg text-xs text-[#1C1C1C] focus:outline-none focus:ring-2 focus:ring-[#B3261E]"
          >
            <option value="cambio_planes">Cambio imprevisto de planes</option>
            <option value="trabajo">Compromiso laboral o de estudio</option>
            <option value="salud">Motivos de salud</option>
            <option value="reagendar">Deseo reagendar para otra fecha</option>
            <option value="otro">Otro motivo</option>
          </select>
        </div>

        <div class="flex items-center justify-end gap-2.5 pt-3 border-t border-[#D5CBB8]">
          <button
            type="button"
            id="btn-cerrar-cancel-modal"
            class="min-h-[44px] px-4 py-2 rounded-lg bg-white border border-[#8C8272] font-semibold text-[#4F4A42] hover:bg-[#FAF3E5]"
          >
            Conservar Cita
          </button>
          <button
            type="button"
            id="btn-confirmar-cancel-cliente"
            class="min-h-[44px] px-5 py-2 rounded-lg bg-[#B3261E] hover:bg-[#8B1E1E] text-white font-semibold shadow-xs"
          >
            Confirmar Cancelación
          </button>
        </div>
      </div>
    </dialog>
  `;
}

export function attachConsultarCitaListeners(onRefresh) {
  const form = document.getElementById('form-consultar-cita');
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const codigo = document.getElementById('input-codigo-cita')?.value.trim();
      if (!codigo) return;

      try {
        searchError = '';
        const res = await citasService.consultarCita(codigo);
        searchedCita = res.data;
        if (typeof onRefresh === 'function') onRefresh();
      } catch (err) {
        searchedCita = null;
        searchError = err.message || 'No se encontró la cita indicada.';
        if (typeof onRefresh === 'function') onRefresh();
      }
    });
  }

  const cancelModal = document.getElementById('dialog-cancelar-cita-cliente');
  const openCancelBtn = document.getElementById('btn-open-cancelar-modal');
  const closeCancelBtn = document.getElementById('btn-cerrar-cancel-modal');
  const confirmCancelBtn = document.getElementById('btn-confirmar-cancel-cliente');

  if (openCancelBtn && cancelModal) {
    openCancelBtn.addEventListener('click', () => cancelModal.showModal());
  }

  const closeModal = () => {
    if (cancelModal) cancelModal.close();
  };
  if (closeCancelBtn) closeCancelBtn.addEventListener('click', closeModal);

  if (confirmCancelBtn) {
    confirmCancelBtn.addEventListener('click', async () => {
      if (!searchedCita) return;
      const motivo = document.getElementById('cancel-motivo-select')?.value;

      try {
        confirmCancelBtn.disabled = true;
        confirmCancelBtn.textContent = 'Cancelando...';

        await citasService.cancelarCitaPublica(searchedCita.codigo || searchedCita.id, motivo);
        searchedCita.status = 'cancelada';
        closeModal();
        alert('Tu cita ha sido cancelada exitosamente. La franja horaria ha quedado liberada.');
        if (typeof onRefresh === 'function') onRefresh();
      } catch (err) {
        alert('Error al cancelar cita: ' + err.message);
      } finally {
        confirmCancelBtn.disabled = false;
        confirmCancelBtn.textContent = 'Confirmar Cancelación';
      }
    });
  }
}
