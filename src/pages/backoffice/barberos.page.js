/**
 * SmartBarber - Módulo de Gestión de Barberos y Horarios Semanales
 * Fiel a docs/stitch/smartbarber_gesti_n_de_barberos_y_horarios_semanales
 * Conexión completa con barberosService, maestro-detalle interactivo,
 * plantilla semanal en bloques de 30 min, bloqueos puntuales (CU-012),
 * alta/edición de barbero (CU-009, CU-010) y borrado lógico con preservación contable.
 */

import { barberosService } from '../../services/index.js';

let cachedBarberos = [];
let selectedBarberId = null;
let currentTab = 'horario'; // 'perfil' | 'horario' | 'bloqueos'
let listFilter = 'activos'; // 'todos' | 'activos'
let searchQuery = '';
let weeklySchedule = [];
let scheduleBlocks = [];

export async function loadBarberosData() {
  const barbRes = await barberosService.getBarberos();
  if (barbRes?.ok && Array.isArray(barbRes.data) && barbRes.data.length > 0) {
    cachedBarberos = barbRes.data;
    if (!selectedBarberId || !cachedBarberos.find(b => b.id === selectedBarberId)) {
      selectedBarberId = cachedBarberos[0].id;
    }
  }

  if (selectedBarberId && selectedBarberId.length >= 32) {
    try {
      const [horRes, blqRes] = await Promise.all([
        barberosService.getHorarioSemanal(selectedBarberId).catch(() => ({ ok: false })),
        barberosService.getBloqueos(selectedBarberId).catch(() => ({ ok: false }))
      ]);
      if (horRes?.ok) weeklySchedule = horRes.data || [];
      if (blqRes?.ok) scheduleBlocks = blqRes.data || [];
    } catch (_) {}
  }
}

export function renderBarberosPage() {
  const selectedBarber = cachedBarberos.find(b => b.id === selectedBarberId) || cachedBarberos[0] || {};

  // Filtrado de la lista maestra
  let filteredBarbers = [...cachedBarberos];
  if (listFilter === 'activos') {
    filteredBarbers = filteredBarbers.filter(b => b.activo !== false);
  }
  if (searchQuery) {
    const q = searchQuery.toLowerCase();
    filteredBarbers = filteredBarbers.filter(b =>
      b.nombre.toLowerCase().includes(q) ||
      (b.especialidad && b.especialidad.toLowerCase().includes(q)) ||
      (b.sillon && b.sillon.toLowerCase().includes(q))
    );
  }

  const activeCount = cachedBarberos.filter(b => b.activo !== false).length;

  return `
    <div class="flex flex-col gap-6 w-full animate-fadeIn">
      <!-- ENCABEZADO SUPERIOR DEL CONTENIDO -->
      <section class="flex flex-col gap-2">
        <div class="flex flex-wrap items-center justify-between gap-2">
          <nav aria-label="Ruta de navegación" class="flex items-center gap-2 text-xs text-[#6B645A]">
            <span>SmartBarber</span>
            <span>/</span>
            <span class="text-[#1C1C1C] font-semibold">Personal y Turnos</span>
          </nav>
          <div class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#E3EFE7] text-[#235D3A] text-xs font-semibold shadow-xs">
            <span class="w-2 h-2 rounded-full bg-[#235D3A] animate-pulse"></span>
            <span>${activeCount} Barberos en Turno Activo · Sincronizado</span>
          </div>
        </div>

        <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pt-1">
          <div>
            <h1 class="font-serif text-2xl sm:text-3xl font-bold text-[#1C1C1C] tracking-tight">
              Equipo de Barberos
            </h1>
            <p class="font-sans text-xs sm:text-sm text-[#4F4A42] mt-0.5 max-w-3xl">
              Gestión de perfiles, esquemas de comisión y plantillas de disponibilidad semanal en bloques de 30 minutos.
            </p>
          </div>

          <div class="flex items-center gap-2.5 shrink-0">
            <a
              href="#comisiones"
              class="min-h-[44px] inline-flex items-center justify-center gap-2 px-4 rounded-lg bg-transparent text-[#1F3A5F] border-2 border-[#1F3A5F] font-sans font-semibold text-xs hover:bg-[#E4ECF5] transition-colors"
            >
              <span class="material-symbols-outlined text-[18px]">percent</span>
              <span>Liquidación de Comisiones</span>
            </a>
            <button
              type="button"
              id="btn-open-nuevo-barbero"
              class="min-h-[44px] inline-flex items-center justify-center gap-2 px-5 rounded-lg bg-[#1F3A5F] hover:bg-[#162B47] text-white font-sans font-semibold text-xs shadow-sm active:scale-95 transition-all"
            >
              <span class="material-symbols-outlined text-[20px]">person_add</span>
              <span>+ Nuevo Barbero</span>
            </button>
          </div>
        </div>
      </section>

      <!-- LAYOUT MAESTRO-DETALLE -->
      <section class="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-6 items-start">
        <!-- COLUMNA IZQUIERDA: LISTA MAESTRA (320px) -->
        <aside class="flex flex-col gap-3 bg-[#FAF7F2] p-4 rounded-xl border border-[#D5CBB8] shadow-xs">
          <!-- Buscador rápido -->
          <div class="relative w-full">
            <span class="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-[#6B645A]">search</span>
            <input
              type="search"
              id="barber-search-input"
              value="${searchQuery}"
              placeholder="Buscar barbero..."
              class="w-full h-10 pl-9 pr-3 rounded-lg bg-white text-xs text-[#1C1C1C] placeholder-[#6B645A] border border-[#8C8272] focus:outline-none focus:ring-2 focus:ring-[#1F3A5F]"
            />
          </div>

          <!-- Pestañas de filtro de lista -->
          <div class="flex items-center justify-between p-1 rounded-lg bg-[#F2EBDD] border border-[#D5CBB8]">
            <button
              type="button"
              id="btn-filter-barbers-all"
              class="flex-1 py-1.5 px-2 text-center rounded text-xs transition-colors ${listFilter === 'todos' ? 'bg-[#FAF7F2] text-[#1C1C1C] font-bold shadow-xs' : 'text-[#4F4A42] hover:text-[#1C1C1C]'}"
            >
              Todos (${cachedBarberos.length})
            </button>
            <button
              type="button"
              id="btn-filter-barbers-active"
              class="flex-1 py-1.5 px-2 text-center rounded text-xs transition-all ${listFilter === 'activos' ? 'bg-[#FAF7F2] text-[#1C1C1C] font-bold shadow-xs' : 'text-[#4F4A42] hover:text-[#1C1C1C]'}"
            >
              Activos (${activeCount})
            </button>
          </div>

          <!-- Tarjetas de Barberos -->
          <div class="flex flex-col gap-2.5 mt-1" role="listbox">
            ${filteredBarbers.map(barb => {
              const isSelected = barb.id === selectedBarberId;
              const isActivo = barb.activo !== false;
              return `
                <article
                  role="option"
                  tabindex="0"
                  data-barber-id="${barb.id}"
                  aria-selected="${isSelected ? 'true' : 'false'}"
                  class="barber-card-item flex flex-col gap-2 p-3.5 rounded-xl cursor-pointer transition-all duration-150 focus:outline-none border ${
                    isSelected
                      ? 'bg-[#E4ECF5] border-[#1F3A5F] ring-2 ring-[#1F3A5F]/20 shadow-xs'
                      : isActivo
                        ? 'bg-white border-[#D5CBB8] hover:bg-[#FAF3E5]'
                        : 'bg-[#FAF3E5] opacity-75 border-[#D5CBB8] hover:opacity-100'
                  }"
                >
                  <div class="flex items-center gap-3">
                    <div class="relative shrink-0">
                      <img
                        src="${barb.foto || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&auto=format&fit=crop&q=80'}"
                        alt="${barb.nombre}"
                        class="w-11 h-11 rounded-full object-cover border border-[#8C8272] ${isActivo ? '' : 'grayscale'}"
                      />
                      <span
                        class="absolute bottom-0 right-0 w-3 h-3 rounded-full ${isActivo ? 'bg-[#235D3A]' : 'bg-[#8C8272]'} border-2 border-white"
                        title="${isActivo ? 'En turno activo' : 'Inactivo'}"
                      ></span>
                    </div>
                    <div class="flex flex-col min-w-0">
                      <span class="font-sans font-semibold text-xs text-[#1C1C1C] truncate">${barb.nombre}</span>
                      <span class="text-[11px] text-[#4F4A42] truncate">${barb.sillon || 'Sillón'} · ${barb.especialidad?.split('·')[0] || 'Barbero'}</span>
                    </div>
                  </div>

                  <div class="flex items-center justify-between pt-1 border-t border-[#D5CBB8]/50">
                    ${isActivo ? `
                      <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#E3EFE7] text-[#235D3A] text-[11px] font-semibold">
                        <span class="material-symbols-outlined text-[13px]">check_circle</span>
                        <span>Activo</span>
                      </span>
                    ` : `
                      <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#E8DFCE] text-[#4F4A42] text-[11px] font-semibold">
                        <span class="material-symbols-outlined text-[13px]">do_not_disturb_on</span>
                        <span>Inactivo</span>
                      </span>
                    `}
                    <span class="font-mono text-xs text-[#4F4A42] font-medium">Comisión: ${barb.comisionPorcentaje || 50}%</span>
                  </div>
                </article>
              `;
            }).join('')}
          </div>
        </aside>

        <!-- COLUMNA DERECHA: FICHA DETALLADA Y HORARIOS (Fluida) -->
        <main class="flex flex-col bg-[#FAF7F2] p-6 sm:p-7 rounded-xl border border-[#D5CBB8] shadow-xs min-w-0">
          <!-- CABECERA DEL BARBERO SELECCIONADO -->
          <header class="flex flex-col lg:flex-row lg:items-start justify-between gap-4 pb-5 border-b border-[#D5CBB8]">
            <div class="flex items-start gap-4">
              <div class="relative shrink-0">
                <img
                  src="${selectedBarber.foto || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&auto=format&fit=crop&q=80'}"
                  alt="${selectedBarber.nombre}"
                  class="w-16 h-16 rounded-full object-cover border-2 border-[#D5CBB8] ${selectedBarber.activo !== false ? '' : 'grayscale'}"
                />
                <span
                  class="absolute bottom-0 right-0 w-4 h-4 rounded-full ${selectedBarber.activo !== false ? 'bg-[#235D3A]' : 'bg-[#8C8272]'} border-2 border-white"
                  title="${selectedBarber.activo !== false ? 'En turno activo' : 'Inactivo'}"
                ></span>
              </div>
              <div class="flex flex-col">
                <div class="flex flex-wrap items-center gap-2">
                  <h2 class="font-serif text-xl sm:text-2xl font-bold text-[#1C1C1C] tracking-tight">
                    ${selectedBarber.nombre}
                  </h2>
                  <span class="px-2 py-0.5 rounded bg-[#E4ECF5] text-[#1F3A5F] text-[11px] font-semibold">
                    ${selectedBarber.sillon || 'Sillón 01'}
                  </span>
                  <span class="px-2 py-0.5 rounded bg-[#F2EBDD] text-[#4F4A42] text-[11px]">
                    ${selectedBarber.especialidad?.split('·')[0] || 'Barbero'}
                  </span>
                </div>
                <p class="text-xs text-[#4F4A42] mt-1 font-mono">
                  ${selectedBarber.email || 'mateo@smartbarber.co'} · ${selectedBarber.telefono || '+57 312 458 9210'} · ${selectedBarber.documento || 'CC 1.049.823.114'}
                </p>
                <div class="mt-2.5 inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white border border-[#D5CBB8] text-xs text-[#1C1C1C] w-fit">
                  <span class="material-symbols-outlined text-[16px] text-[#1F3A5F]">pie_chart</span>
                  <span>Esquema de Comisión: <strong class="font-mono text-[#1F3A5F] font-bold">${selectedBarber.comisionPorcentaje || 50}% por servicio</strong></span>
                </div>
              </div>
            </div>

            <!-- Acción de Activación / Desactivación Lógica -->
            <div class="flex flex-col items-start lg:items-end gap-1 shrink-0">
              <button
                type="button"
                id="btn-toggle-barber-status"
                class="min-h-[44px] inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold transition-all border ${
                  selectedBarber.activo !== false
                    ? 'bg-[#FCE8E6] text-[#B3261E] border-[#B3261E]/40 hover:bg-[#B3261E] hover:text-white'
                    : 'bg-[#E3EFE7] text-[#235D3A] border-[#235D3A]/40 hover:bg-[#235D3A] hover:text-white'
                }"
                title="Borrado lógico · No se borra historial contable ni facturación"
              >
                <span class="material-symbols-outlined text-[18px]">
                  ${selectedBarber.activo !== false ? 'person_off' : 'person_check'}
                </span>
                <span>${selectedBarber.activo !== false ? 'Desactivar Barbero' : 'Activar Barbero'}</span>
              </button>
              <span class="text-[10px] text-[#6B645A] italic">Borrado lógico · Conserva historial contable</span>
            </div>
          </header>

          <!-- PESTAÑAS HORIZONTALES -->
          <nav aria-label="Secciones del Barbero" class="flex items-center gap-6 mt-4 border-b border-[#D5CBB8]">
            <button
              type="button"
              id="tab-btn-horario"
              class="pb-3 text-xs font-semibold flex items-center gap-1.5 border-b-2 transition-colors ${
                currentTab === 'horario'
                  ? 'border-[#1F3A5F] text-[#1F3A5F]'
                  : 'border-transparent text-[#6B645A] hover:text-[#1C1C1C]'
              }"
            >
              <span class="material-symbols-outlined text-[18px]">calendar_today</span>
              <span>Horario Semanal</span>
            </button>

            <button
              type="button"
              id="tab-btn-bloqueos"
              class="pb-3 text-xs font-semibold flex items-center gap-1.5 border-b-2 transition-colors ${
                currentTab === 'bloqueos'
                  ? 'border-[#1F3A5F] text-[#1F3A5F]'
                  : 'border-transparent text-[#6B645A] hover:text-[#1C1C1C]'
              }"
            >
              <span class="material-symbols-outlined text-[18px]">event_busy</span>
              <span>Bloqueos Puntuales</span>
              <span class="px-1.5 py-0.5 rounded bg-[#E8DFCE] text-[#4F4A42] font-mono text-[10px] font-bold">
                ${scheduleBlocks.length}
              </span>
            </button>
          </nav>

          <!-- CONTENIDO DE LA PESTAÑA ACTIVA -->
          ${currentTab === 'horario' ? renderHorarioTab() : renderBloqueosTab()}
        </main>
      </section>
    </div>

    <!-- ========================================== -->
    <!-- MODAL: + NUEVO BARBERO (CU-009)             -->
    <!-- ========================================== -->
    <dialog
      id="dialog-nuevo-barbero"
      class="p-0 rounded-2xl bg-[#FAF7F2] border border-[#D5CBB8] shadow-2xl backdrop:bg-black/50 max-w-lg w-full mx-auto my-auto"
    >
      <div class="p-6 flex flex-col gap-4">
        <div class="flex items-start justify-between pb-3 border-b border-[#D5CBB8]">
          <div class="flex items-center gap-2.5">
            <div class="w-9 h-9 rounded-lg bg-[#1F3A5F] text-white flex items-center justify-center">
              <span class="material-symbols-outlined text-[20px]">person_add</span>
            </div>
            <div>
              <h3 class="font-serif text-lg font-bold text-[#1C1C1C]">Registrar Nuevo Barbero</h3>
              <p class="text-xs text-[#6B645A]">Alta de personal con asignación de sillón y horario</p>
            </div>
          </div>
          <button type="button" id="btn-close-nuevo-barbero" class="text-[#6B645A] hover:text-[#1C1C1C]">
            <span class="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        <form id="form-nuevo-barbero" class="flex flex-col gap-3 text-xs">
          <div class="flex flex-col gap-1">
            <label class="font-semibold text-[#1C1C1C]">Nombre Completo <span class="text-[#8B1E1E]">*</span></label>
            <input
              type="text"
              id="new-barb-name"
              required
              placeholder="Ej. Andrés Camilo Ríos"
              class="h-10 px-3 bg-white border border-[#8C8272] rounded-lg text-xs text-[#1C1C1C] focus:outline-none focus:ring-2 focus:ring-[#1F3A5F]"
            />
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div class="flex flex-col gap-1">
              <label class="font-semibold text-[#1C1C1C]">Correo Electrónico <span class="text-[#8B1E1E]">*</span></label>
              <input
                type="email"
                id="new-barb-email"
                required
                placeholder="andres@smartbarber.co"
                class="h-10 px-3 bg-white border border-[#8C8272] rounded-lg text-xs text-[#1C1C1C] focus:outline-none focus:ring-2 focus:ring-[#1F3A5F]"
              />
            </div>
            <div class="flex flex-col gap-1">
              <label class="font-semibold text-[#1C1C1C]">Teléfono (10 dígitos) <span class="text-[#8B1E1E]">*</span></label>
              <input
                type="tel"
                id="new-barb-phone"
                required
                pattern="^3\\d{9}$"
                placeholder="3101234567"
                class="h-10 px-3 bg-white border border-[#8C8272] rounded-lg text-xs text-[#1C1C1C] focus:outline-none focus:ring-2 focus:ring-[#1F3A5F]"
              />
            </div>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div class="flex flex-col gap-1">
              <label class="font-semibold text-[#1C1C1C]">Sillón Asignado <span class="text-[#8B1E1E]">*</span></label>
              <select
                id="new-barb-sillon"
                class="h-10 px-3 bg-white border border-[#8C8272] rounded-lg text-xs text-[#1C1C1C] focus:outline-none focus:ring-2 focus:ring-[#1F3A5F]"
              >
                <option value="Sillón 01">Sillón 01</option>
                <option value="Sillón 02">Sillón 02</option>
                <option value="Sillón 03">Sillón 03</option>
                <option value="Sillón 04">Sillón 04 (Extraordinario)</option>
              </select>
            </div>
            <div class="flex flex-col gap-1">
              <label class="font-semibold text-[#1C1C1C]">Porcentaje de Comisión <span class="text-[#8B1E1E]">*</span></label>
              <div class="relative">
                <input
                  type="number"
                  id="new-barb-comision"
                  required
                  min="10"
                  max="90"
                  value="50"
                  class="h-10 pl-3 pr-8 w-full bg-white border border-[#8C8272] rounded-lg text-xs text-[#1C1C1C] focus:outline-none focus:ring-2 focus:ring-[#1F3A5F]"
                />
                <span class="absolute right-3 top-2.5 font-bold text-[#6B645A]">%</span>
              </div>
            </div>
          </div>

          <div class="flex flex-col gap-1">
            <label class="font-semibold text-[#1C1C1C]">Especialidad / Cargo</label>
            <input
              type="text"
              id="new-barb-especialidad"
              placeholder="Ej. Especialista en Degradados y Barba Clásica"
              value="Maestro Barbero"
              class="h-10 px-3 bg-white border border-[#8C8272] rounded-lg text-xs text-[#1C1C1C] focus:outline-none focus:ring-2 focus:ring-[#1F3A5F]"
            />
          </div>

          <div class="flex items-center justify-end gap-2.5 pt-3 border-t border-[#D5CBB8] mt-2">
            <button
              type="button"
              id="btn-cancelar-nuevo-barbero"
              class="min-h-[44px] px-4 py-2 rounded-lg bg-white border border-[#8C8272] text-xs font-semibold text-[#4F4A42] hover:bg-[#FAF3E5]"
            >
              Cancelar
            </button>
            <button
              type="submit"
              class="min-h-[44px] px-5 py-2 rounded-lg bg-[#1F3A5F] hover:bg-[#162B47] text-white text-xs font-semibold shadow-xs"
            >
              Guardar Barbero
            </button>
          </div>
        </form>
      </div>
    </dialog>

    <!-- ========================================== -->
    <!-- MODAL: + BLOQUEO PUNTUAL (CU-012)           -->
    <!-- ========================================== -->
    <dialog
      id="dialog-nuevo-bloqueo"
      class="p-0 rounded-2xl bg-[#FAF7F2] border border-[#D5CBB8] shadow-2xl backdrop:bg-black/50 max-w-md w-full mx-auto my-auto"
    >
      <div class="p-6 flex flex-col gap-4">
        <div class="flex items-start justify-between pb-3 border-b border-[#D5CBB8]">
          <div class="flex items-center gap-2.5">
            <div class="w-9 h-9 rounded-lg bg-[#8A5300] text-white flex items-center justify-center">
              <span class="material-symbols-outlined text-[20px]">lock_clock</span>
            </div>
            <div>
              <h3 class="font-serif text-lg font-bold text-[#1C1C1C]">Bloqueo de Franja de Agenda</h3>
              <p class="text-xs text-[#6B645A]">Inhabilita turnos sin afectar la plantilla semanal</p>
            </div>
          </div>
          <button type="button" id="btn-close-nuevo-bloqueo" class="text-[#6B645A] hover:text-[#1C1C1C]">
            <span class="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        <form id="form-nuevo-bloqueo" class="flex flex-col gap-3 text-xs">
          <div class="flex flex-col gap-1">
            <label class="font-semibold text-[#1C1C1C]">Fecha del Bloqueo <span class="text-[#8B1E1E]">*</span></label>
            <input
              type="date"
              id="new-blq-fecha"
              required
              value="2026-11-26"
              class="h-10 px-3 bg-white border border-[#8C8272] rounded-lg text-xs text-[#1C1C1C] focus:outline-none focus:ring-2 focus:ring-[#1F3A5F]"
            />
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div class="flex flex-col gap-1">
              <label class="font-semibold text-[#1C1C1C]">Hora Inicio <span class="text-[#8B1E1E]">*</span></label>
              <select
                id="new-blq-inicio"
                class="h-10 px-2 bg-white border border-[#8C8272] rounded-lg text-xs text-[#1C1C1C] font-mono focus:outline-none focus:ring-2 focus:ring-[#1F3A5F]"
              >
                <option value="09:00 AM">09:00 AM</option>
                <option value="10:00 AM">10:00 AM</option>
                <option value="11:00 AM">11:00 AM</option>
                <option value="01:00 PM">01:00 PM</option>
                <option value="02:00 PM" selected>02:00 PM</option>
                <option value="03:00 PM">03:00 PM</option>
                <option value="04:00 PM">04:00 PM</option>
              </select>
            </div>
            <div class="flex flex-col gap-1">
              <label class="font-semibold text-[#1C1C1C]">Hora Fin <span class="text-[#8B1E1E]">*</span></label>
              <select
                id="new-blq-fin"
                class="h-10 px-2 bg-white border border-[#8C8272] rounded-lg text-xs text-[#1C1C1C] font-mono focus:outline-none focus:ring-2 focus:ring-[#1F3A5F]"
              >
                <option value="10:00 AM">10:00 AM</option>
                <option value="12:00 PM">12:00 PM</option>
                <option value="03:30 PM" selected>03:30 PM</option>
                <option value="05:00 PM">05:00 PM</option>
                <option value="07:00 PM">07:00 PM</option>
              </select>
            </div>
          </div>

          <div class="flex flex-col gap-1">
            <label class="font-semibold text-[#1C1C1C]">Motivo del Bloqueo <span class="text-[#8B1E1E]">*</span></label>
            <input
              type="text"
              id="new-blq-motivo"
              required
              placeholder="Ej. Cita médica EPS, Trámite personal o Capacitación"
              class="h-10 px-3 bg-white border border-[#8C8272] rounded-lg text-xs text-[#1C1C1C] focus:outline-none focus:ring-2 focus:ring-[#1F3A5F]"
            />
          </div>

          <div class="flex items-center justify-end gap-2.5 pt-3 border-t border-[#D5CBB8] mt-2">
            <button
              type="button"
              id="btn-cancelar-nuevo-bloqueo"
              class="min-h-[44px] px-4 py-2 rounded-lg bg-white border border-[#8C8272] text-xs font-semibold text-[#4F4A42] hover:bg-[#FAF3E5]"
            >
              Cancelar
            </button>
            <button
              type="submit"
              class="min-h-[44px] px-5 py-2 rounded-lg bg-[#8A5300] hover:bg-[#6b4000] text-white text-xs font-semibold shadow-xs"
            >
              Guardar Bloqueo
            </button>
          </div>
        </form>
      </div>
    </dialog>
  `;
}

function renderHorarioTab() {
  const schedule = weeklySchedule.length > 0 ? weeklySchedule : [
    { dia: 'Lunes', activo: true, t1Inicio: '09:00 AM', t1Fin: '01:00 PM', t2Inicio: '02:00 PM', t2Fin: '07:00 PM', horas: 9, bloques: 18 },
    { dia: 'Martes', activo: true, t1Inicio: '09:00 AM', t1Fin: '01:00 PM', t2Inicio: '02:00 PM', t2Fin: '07:00 PM', horas: 9, bloques: 18 },
    { dia: 'Miércoles', activo: true, t1Inicio: '09:00 AM', t1Fin: '01:00 PM', t2Inicio: '02:00 PM', t2Fin: '07:00 PM', horas: 9, bloques: 18 },
    { dia: 'Jueves', activo: true, t1Inicio: '09:00 AM', t1Fin: '01:00 PM', t2Inicio: '02:00 PM', t2Fin: '07:00 PM', horas: 9, bloques: 18 },
    { dia: 'Viernes', activo: true, t1Inicio: '08:30 AM', t1Fin: '01:30 PM', t2Inicio: '02:30 PM', t2Fin: '07:30 PM', horas: 10, bloques: 20 },
    { dia: 'Sábado', activo: true, t1Inicio: '08:30 AM', t1Fin: '01:30 PM', t2Inicio: '02:30 PM', t2Fin: '07:30 PM', horas: 10, bloques: 20 },
    { dia: 'Domingo', activo: false, t1Inicio: '', t1Fin: '', t2Inicio: '', t2Fin: '', horas: 0, bloques: 0, esDescanso: true }
  ];

  return `
    <div class="flex flex-col gap-4 mt-5">
      <!-- Banner de regla de negocio -->
      <div class="flex items-start gap-3 p-3.5 rounded-lg bg-[#E4ECF5] text-[#1F3A5F] border-l-4 border-[#1F3A5F]">
        <span class="material-symbols-outlined text-[20px] shrink-0 mt-0.5">info</span>
        <p class="text-xs leading-relaxed">
          <strong class="font-semibold">Regla del sistema:</strong> Las franjas de disponibilidad se programan estrictamente en bloques de 30 minutos (minutos :00 y :30) para sincronizar con la agenda y reservas online.
        </p>
      </div>

      <!-- Grilla de Días Semanales -->
      <div class="flex flex-col gap-2.5">
        ${schedule.map((item, idx) => {
          return `
            <div class="flex flex-col xl:flex-row xl:items-center justify-between p-3.5 rounded-lg border border-[#D5CBB8] transition-colors gap-3 ${
              item.activo ? 'bg-white hover:bg-[#FAF3E5]' : 'bg-[#E8DFCE]/40 opacity-75'
            }">
              <!-- Nombre y Toggle -->
              <div class="flex items-center gap-4 w-44 shrink-0">
                <span class="font-sans font-semibold text-xs text-[#1C1C1C] w-20">${item.dia}</span>
                <label class="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    data-day-idx="${idx}"
                    class="sr-only peer schedule-day-toggle"
                    ${item.activo ? 'checked' : ''}
                  />
                  <div class="w-9 h-5 bg-[#8C8272] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#1F3A5F]"></div>
                </label>
              </div>

              <!-- Franjas T1 y T2 o Descanso -->
              ${item.activo ? `
                <div class="flex flex-wrap items-center gap-3 flex-1 text-xs">
                  <!-- Turno 1 -->
                  <div class="flex items-center gap-1.5">
                    <span class="text-[10px] uppercase font-bold text-[#6B645A]">T1</span>
                    <input
                      type="text"
                      value="${item.t1Inicio || '09:00 AM'}"
                      class="h-8 px-2 w-24 rounded border border-[#8C8272] font-mono text-xs text-center"
                    />
                    <span class="text-[#6B645A]">a</span>
                    <input
                      type="text"
                      value="${item.t1Fin || '01:00 PM'}"
                      class="h-8 px-2 w-24 rounded border border-[#8C8272] font-mono text-xs text-center"
                    />
                  </div>

                  <span class="text-[#D5CBB8] hidden md:inline">|</span>

                  <!-- Turno 2 -->
                  <div class="flex items-center gap-1.5">
                    <span class="text-[10px] uppercase font-bold text-[#6B645A]">T2</span>
                    <input
                      type="text"
                      value="${item.t2Inicio || '02:00 PM'}"
                      class="h-8 px-2 w-24 rounded border border-[#8C8272] font-mono text-xs text-center"
                    />
                    <span class="text-[#6B645A]">a</span>
                    <input
                      type="text"
                      value="${item.t2Fin || '07:00 PM'}"
                      class="h-8 px-2 w-24 rounded border border-[#8C8272] font-mono text-xs text-center"
                    />
                    <span class="text-[11px] text-[#6B645A] ml-1">(${item.horas || 9} hrs · ${item.bloques || 18} blq)</span>
                  </div>
                </div>
              ` : `
                <div class="flex items-center gap-2 flex-1 text-xs text-[#6B645A] italic">
                  <span class="material-symbols-outlined text-[18px]">bedtime</span>
                  <span>Día de descanso general (Sin atención en sede)</span>
                </div>
              `}
            </div>
          `;
        }).join('')}
      </div>

      <!-- Footer de Acciones Horario -->
      <footer class="mt-4 pt-4 border-t border-[#D5CBB8] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <span class="text-xs text-[#6B645A]">
          Última actualización por Carlos Mendoza · Hoy a las 11:20 AM
        </span>
        <div class="flex items-center gap-2.5">
          <button
            type="button"
            id="btn-revertir-horario"
            class="min-h-[44px] px-4 rounded-lg bg-white border border-[#8C8272] text-xs font-semibold text-[#4F4A42] hover:bg-[#FAF3E5] transition-colors"
          >
            Revertir Cambios
          </button>
          <button
            type="button"
            id="btn-guardar-horario"
            class="min-h-[44px] inline-flex items-center gap-2 px-5 rounded-lg bg-[#1F3A5F] hover:bg-[#162B47] text-white text-xs font-semibold shadow-xs transition-all"
          >
            <span class="material-symbols-outlined text-[18px]">save</span>
            <span>Guardar Horario Semanal</span>
          </button>
        </div>
      </footer>
    </div>
  `;
}

function renderBloqueosTab() {
  return `
    <div class="flex flex-col gap-4 mt-5">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 class="font-serif text-base font-bold text-[#1C1C1C]">Excepciones y Bloqueos de Agenda</h3>
          <p class="text-xs text-[#6B645A]">Franjas inhabilitadas puntuales sin alterar la disponibilidad regular.</p>
        </div>
        <button
          type="button"
          id="btn-open-nuevo-bloqueo"
          class="min-h-[44px] inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-transparent text-[#1F3A5F] border border-[#1F3A5F] hover:bg-[#E4ECF5] text-xs font-semibold transition-colors"
        >
          <span class="material-symbols-outlined text-[16px]">lock_clock</span>
          <span>+ Agregar Bloqueo de Franja</span>
        </button>
      </div>

      <div class="flex flex-col gap-2.5">
        ${scheduleBlocks.length === 0 ? `
          <div class="p-8 text-center bg-white border border-[#D5CBB8] rounded-xl text-xs text-[#6B645A]">
            No hay bloqueos ni excepciones programadas para este barbero.
          </div>
        ` : scheduleBlocks.map(blq => `
          <div class="flex flex-col md:flex-row md:items-center justify-between p-3.5 rounded-lg bg-white border border-[#D5CBB8] gap-3">
            <div class="flex flex-wrap items-center gap-3">
              <div class="w-8 h-8 rounded-lg bg-[#FDF1DC] text-[#8A5300] flex items-center justify-center shrink-0">
                <span class="material-symbols-outlined text-[18px]">event_busy</span>
              </div>
              <div class="flex flex-col">
                <span class="font-sans font-semibold text-xs text-[#1C1C1C]">${blq.fechaFormato || blq.fecha}</span>
                <span class="font-mono text-xs text-[#4F4A42]">${blq.horaInicio} – ${blq.horaFin} (${blq.bloques || 2} bloques)</span>
              </div>
              <span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded bg-[#FDF1DC] text-[#8A5300] text-[11px] font-semibold border border-[#8A5300]/20">
                <span class="material-symbols-outlined text-[13px]">warning</span>
                <span>${blq.motivo}</span>
              </span>
            </div>

            <button
              type="button"
              class="btn-delete-bloqueo text-xs font-semibold text-[#B3261E] hover:text-[#8B1E1E] hover:underline self-end md:self-center"
              data-id="${blq.id}"
            >
              Eliminar Bloqueo
            </button>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

export function attachBarberosListeners(onDataChange) {
  // 1. Selección de barbero en lista maestra
  const barberCards = document.querySelectorAll('.barber-card-item');
  barberCards.forEach(card => {
    card.addEventListener('click', async () => {
      const id = card.getAttribute('data-barber-id');
      if (id && id !== selectedBarberId) {
        selectedBarberId = id;
        await loadBarberosData();
        if (typeof onDataChange === 'function') onDataChange();
      }
    });
  });

  // 2. Buscador de barberos
  const searchInput = document.getElementById('barber-search-input');
  if (searchInput) {
    let timeout;
    searchInput.addEventListener('input', (e) => {
      clearTimeout(timeout);
      timeout = setTimeout(async () => {
        searchQuery = e.target.value.trim();
        if (typeof onDataChange === 'function') onDataChange();
      }, 200);
    });
  }

  // 3. Filtro Todos / Activos
  const btnAll = document.getElementById('btn-filter-barbers-all');
  const btnActive = document.getElementById('btn-filter-barbers-active');

  if (btnAll) {
    btnAll.addEventListener('click', () => {
      listFilter = 'todos';
      if (typeof onDataChange === 'function') onDataChange();
    });
  }
  if (btnActive) {
    btnActive.addEventListener('click', () => {
      listFilter = 'activos';
      if (typeof onDataChange === 'function') onDataChange();
    });
  }

  // 4. Cambio de Pestaña Horario vs. Bloqueos
  const tabHorario = document.getElementById('tab-btn-horario');
  const tabBloqueos = document.getElementById('tab-btn-bloqueos');

  if (tabHorario) {
    tabHorario.addEventListener('click', () => {
      currentTab = 'horario';
      if (typeof onDataChange === 'function') onDataChange();
    });
  }
  if (tabBloqueos) {
    tabBloqueos.addEventListener('click', () => {
      currentTab = 'bloqueos';
      if (typeof onDataChange === 'function') onDataChange();
    });
  }

  // 5. Toggle de Estado Activar / Desactivar Barbero (Borrado lógico)
  const toggleStatusBtn = document.getElementById('btn-toggle-barber-status');
  if (toggleStatusBtn) {
    toggleStatusBtn.addEventListener('click', async () => {
      const b = cachedBarberos.find(item => item.id === selectedBarberId);
      if (!b) return;

      const newStatus = b.activo === false;
      const confirmMsg = newStatus
        ? `¿Desea reactivar a ${b.nombre} para recibir reservas y turnos?`
        : `¿Desea desactivar a ${b.nombre}? (Borrado lógico: conservará todo su historial contable y citas pasadas)`;

      if (confirm(confirmMsg)) {
        await barberosService.cambiarEstadoBarbero(selectedBarberId, newStatus);
        await loadBarberosData();
        if (typeof onDataChange === 'function') onDataChange();
      }
    });
  }

  // 6. Guardar Horario Semanal
  const saveHorarioBtn = document.getElementById('btn-guardar-horario');
  if (saveHorarioBtn) {
    saveHorarioBtn.addEventListener('click', async () => {
      saveHorarioBtn.disabled = true;
      saveHorarioBtn.textContent = 'Guardando...';

      try {
        await barberosService.guardarHorarioSemanal(selectedBarberId, weeklySchedule);
        alert('Horario semanal actualizado correctamente en bloques de 30 minutos.');
      } catch (err) {
        alert('Error al guardar horario: ' + err.message);
      } finally {
        saveHorarioBtn.disabled = false;
        saveHorarioBtn.innerHTML = `
          <span class="material-symbols-outlined text-[18px]">save</span>
          <span>Guardar Horario Semanal</span>
        `;
      }
    });
  }

  // 7. Modal + Nuevo Barbero
  const dialogNuevo = document.getElementById('dialog-nuevo-barbero');
  const openNuevoBtn = document.getElementById('btn-open-nuevo-barbero');
  const closeNuevoBtn = document.getElementById('btn-close-nuevo-barbero');
  const cancelNuevoBtn = document.getElementById('btn-cancelar-nuevo-barbero');
  const formNuevo = document.getElementById('form-nuevo-barbero');

  if (openNuevoBtn && dialogNuevo) {
    openNuevoBtn.addEventListener('click', () => dialogNuevo.showModal());
  }

  const closeDialogNuevo = () => {
    if (dialogNuevo) dialogNuevo.close();
  };
  if (closeNuevoBtn) closeNuevoBtn.addEventListener('click', closeDialogNuevo);
  if (cancelNuevoBtn) cancelNuevoBtn.addEventListener('click', closeDialogNuevo);

  if (formNuevo) {
    formNuevo.addEventListener('submit', async (e) => {
      e.preventDefault();
      const nombre = document.getElementById('new-barb-name')?.value.trim();
      const email = document.getElementById('new-barb-email')?.value.trim();
      const telefono = document.getElementById('new-barb-phone')?.value.trim();
      const sillon = document.getElementById('new-barb-sillon')?.value;
      const comisionPorcentaje = document.getElementById('new-barb-comision')?.value;
      const especialidad = document.getElementById('new-barb-especialidad')?.value.trim();

      try {
        const res = await barberosService.crearBarbero({
          nombre,
          email,
          telefono,
          sillon,
          comisionPorcentaje,
          especialidad
        });

        if (res.ok) {
          selectedBarberId = res.data.id;
          closeDialogNuevo();
          await loadBarberosData();
          if (typeof onDataChange === 'function') onDataChange();
        }
      } catch (err) {
        alert('Error al crear barbero: ' + err.message);
      }
    });
  }

  // 8. Modal + Bloqueo Puntual
  const dialogBloqueo = document.getElementById('dialog-nuevo-bloqueo');
  const openBloqueoBtn = document.getElementById('btn-open-nuevo-bloqueo');
  const closeBloqueoBtn = document.getElementById('btn-close-nuevo-bloqueo');
  const cancelBloqueoBtn = document.getElementById('btn-cancelar-nuevo-bloqueo');
  const formBloqueo = document.getElementById('form-nuevo-bloqueo');

  if (openBloqueoBtn && dialogBloqueo) {
    openBloqueoBtn.addEventListener('click', () => dialogBloqueo.showModal());
  }

  const closeDialogBloqueo = () => {
    if (dialogBloqueo) dialogBloqueo.close();
  };
  if (closeBloqueoBtn) closeBloqueoBtn.addEventListener('click', closeDialogBloqueo);
  if (cancelBloqueoBtn) cancelBloqueoBtn.addEventListener('click', closeDialogBloqueo);

  if (formBloqueo) {
    formBloqueo.addEventListener('submit', async (e) => {
      e.preventDefault();
      const fecha = document.getElementById('new-blq-fecha')?.value;
      const horaInicio = document.getElementById('new-blq-inicio')?.value;
      const horaFin = document.getElementById('new-blq-fin')?.value;
      const motivo = document.getElementById('new-blq-motivo')?.value.trim();

      try {
        await barberosService.agregarBloqueo(selectedBarberId, {
          fecha,
          horaInicio,
          horaFin,
          motivo,
          bloques: 3
        });

        closeDialogBloqueo();
        await loadBarberosData();
        if (typeof onDataChange === 'function') onDataChange();
      } catch (err) {
        alert('Error al agregar bloqueo: ' + err.message);
      }
    });
  }

  // 9. Eliminar Bloqueo Puntual
  const deleteBloqueoBtns = document.querySelectorAll('.btn-delete-bloqueo');
  deleteBloqueoBtns.forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = btn.getAttribute('data-id');
      if (confirm('¿Desea habilitar nuevamente esta franja de agenda?')) {
        await barberosService.eliminarBloqueo(selectedBarberId, id);
        await loadBarberosData();
        if (typeof onDataChange === 'function') onDataChange();
      }
    });
  });
}
