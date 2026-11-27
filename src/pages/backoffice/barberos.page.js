/**
 * SmartBarber - Módulo de Gestión de Barberos y Horarios Semanales
 * Fiel a docs/stitch/smartbarber_gesti_n_de_barberos_y_horarios_semanales
 * Conexión completa con barberosService, maestro-detalle interactivo,
 * plantilla semanal en bloques de 30 min, bloqueos puntuales (CU-012),
 * alta/edición de barbero (CU-009, CU-010) y borrado lógico con preservación contable.
 */

import { barberosService, cameraService } from '../../services/index.js';
import {
  normalizeWeeklySchedule,
  serializeWeeklySchedule,
  computeDayMetrics,
  getHalfHourTimeOptions
} from '../../utils/schedule-adapter.js';
import { renderUserAvatar } from '../../components/user-avatar.js';
import { renderActionButton } from '../../components/action-button.js';

let cachedBarberos = [];
let selectedBarberId = null;
let currentTab = 'horario'; // 'perfil' | 'horario' | 'bloqueos'
let listFilter = 'activos'; // 'todos' | 'activos'
let searchQuery = '';
let weeklySchedule = normalizeWeeklySchedule([]);
let savedWeeklyScheduleSnapshot = normalizeWeeklySchedule([]);
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
      const normalized = normalizeWeeklySchedule(horRes?.ok ? horRes.data : []);
      weeklySchedule = normalized;
      savedWeeklyScheduleSnapshot = normalized.map((d) => ({ ...d }));
      if (blqRes?.ok) scheduleBlocks = blqRes.data || [];
    } catch (_) {}
  } else {
    weeklySchedule = normalizeWeeklySchedule([]);
    savedWeeklyScheduleSnapshot = weeklySchedule.map((d) => ({ ...d }));
  }
}

function getFilteredBarbersList() {
  let list = [...cachedBarberos];
  if (listFilter === 'activos') {
    list = list.filter(b => b.activo !== false);
  }
  if (searchQuery) {
    const q = searchQuery.toLowerCase();
    list = list.filter(b =>
      b.nombre.toLowerCase().includes(q) ||
      (b.especialidad && b.especialidad.toLowerCase().includes(q)) ||
      (b.sillon && b.sillon.toLowerCase().includes(q))
    );
  }
  return list;
}

function renderBarberListItems(filteredBarbers) {
  return filteredBarbers.map(barb => {
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
          ${renderUserAvatar({
            src: barb.foto,
            name: barb.nombre,
            sizeClass: 'w-11 h-11',
            textClass: 'text-sm',
            extraImgClass: isActivo ? '' : 'grayscale',
            statusDotClass: isActivo ? 'bg-[#235D3A]' : 'bg-[#8C8272]',
            statusTitle: isActivo ? 'En turno activo' : 'Inactivo'
          })}
          <div class="flex flex-col min-w-0">
            <span class="font-sans font-semibold text-xs text-[#1C1C1C] truncate">${barb.nombre}</span>
            <span class="text-xs text-[#57534E] truncate">${barb.sillon || 'Sillón'} · ${barb.especialidad?.split('·')[0] || 'Barbero'}</span>
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
  }).join('');
}

export function renderBarberosPage() {
  const selectedBarber = cachedBarberos.find(b => b.id === selectedBarberId) || cachedBarberos[0] || {};
  const filteredBarbers = getFilteredBarbersList();
  const activeCount = cachedBarberos.filter(b => b.activo !== false).length;

  return `
    <div class="flex flex-col gap-6 w-full animate-fadeIn">
      <!-- ENCABEZADO SUPERIOR DEL CONTENIDO -->
      <section class="flex flex-col gap-2">
        <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div class="flex flex-wrap items-center gap-3">
            <h1 class="font-serif text-2xl sm:text-3xl font-bold text-[#1C1C1C] tracking-tight">
              Equipo de Barberos
            </h1>
            <div class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#E3EFE7] text-[#235D3A] text-xs font-semibold shadow-xs">
              <span class="w-2 h-2 rounded-full bg-[#235D3A] animate-pulse"></span>
              <span>${activeCount} Barberos en Turno Activo · Sincronizado</span>
            </div>
          </div>

          <div class="flex items-center gap-2.5 shrink-0">
            ${renderActionButton({
              href: '#comisiones',
              variant: 'outline',
              icon: 'percent',
              label: 'Liquidación de Comisiones'
            })}
            ${renderActionButton({
              id: 'btn-open-nuevo-barbero',
              variant: 'primary',
              icon: 'person_add',
              label: 'Nuevo Barbero'
            })}
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
          <div id="barbers-list-container" class="flex flex-col gap-2.5 mt-1" role="listbox">
            ${renderBarberListItems(filteredBarbers)}
          </div>
        </aside>

        <!-- COLUMNA DERECHA: FICHA DETALLADA Y HORARIOS (Fluida) -->
        <main class="flex flex-col bg-[#FAF7F2] p-6 sm:p-7 rounded-xl border border-[#D5CBB8] shadow-xs min-w-0">
          <!-- CABECERA DEL BARBERO SELECCIONADO -->
          <header class="flex flex-col lg:flex-row lg:items-start justify-between gap-4 pb-5 border-b border-[#D5CBB8]">
            <div class="flex items-start gap-4">
              ${renderUserAvatar({
                src: selectedBarber.foto,
                name: selectedBarber.nombre,
                sizeClass: 'w-16 h-16',
                textClass: 'text-lg',
                borderClass: 'border-2 border-[#D5CBB8]',
                extraImgClass: selectedBarber.activo !== false ? '' : 'grayscale',
                statusDotClass: selectedBarber.activo !== false ? 'bg-[#235D3A]' : 'bg-[#8C8272]',
                statusTitle: selectedBarber.activo !== false ? 'En turno activo' : 'Inactivo'
              })}
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

            <!-- Acción de Activación / Desactivación Segura -->
            <div class="flex flex-col items-start lg:items-end gap-1 shrink-0">
              <button
                type="button"
                id="btn-toggle-barber-status"
                class="min-h-[44px] inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold transition-all border ${
                  selectedBarber.activo !== false
                    ? 'bg-[#FCE8E6] text-[#B3261E] border-[#F5B8B4] hover:bg-[#B3261E] hover:text-white'
                    : 'bg-[#E3EFE7] text-[#235D3A] border-[#235D3A]/40 hover:bg-[#235D3A] hover:text-white'
                }"
                title="Oculta al barbero de la agenda sin perder su historial de caja"
              >
                <span class="material-symbols-outlined text-[18px]" aria-hidden="true">
                  ${selectedBarber.activo !== false ? 'person_off' : 'person_check'}
                </span>
                <span>${selectedBarber.activo !== false ? 'Desactivar Barbero' : 'Activar Barbero'}</span>
              </button>
              <span class="text-xs text-[#57534E]">Oculta al barbero de la agenda sin perder su historial de caja.</span>
            </div>
          </header>

          <!-- PESTAÑAS HORIZONTALES -->
          <nav aria-label="Secciones del Barbero" class="flex items-center gap-6 mt-4 border-b border-[#D5CBB8]">
            <button
              type="button"
              id="tab-btn-perfil"
              class="pb-3 text-xs font-semibold flex items-center gap-1.5 border-b-2 transition-colors ${
                currentTab === 'perfil'
                  ? 'border-[#1F3A5F] text-[#1F3A5F]'
                  : 'border-transparent text-[#6B645A] hover:text-[#1C1C1C]'
              }"
            >
              <span class="material-symbols-outlined text-[18px]">badge</span>
              <span>Ficha & Comisión</span>
            </button>

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
          ${currentTab === 'perfil' ? renderPerfilTab(selectedBarber) : currentTab === 'horario' ? renderHorarioTab() : renderBloqueosTab()}
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
            </div>
          </div>
          <button type="button" id="btn-close-nuevo-barbero" class="text-[#6B645A] hover:text-[#1C1C1C]">
            <span class="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        <form id="form-nuevo-barbero" class="flex flex-col gap-3 text-xs">
          <!-- Widget de Fotografía con Cámara WebRTC y Archivo -->
          <div class="flex flex-col gap-2 p-3 bg-white rounded-xl border border-[#D5CBB8]">
            <span class="text-xs font-semibold text-[#1C1C1C]">Fotografía de Perfil (JPG, PNG, WebP &le; 2MB)</span>
            <div class="flex items-center gap-3">
              <div class="relative shrink-0">
                <img
                  id="new-barb-avatar-preview"
                  src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&auto=format&fit=crop&q=80"
                  alt="Vista previa"
                  class="w-14 h-14 rounded-full object-cover border-2 border-[#1F3A5F]"
                />
                <span id="new-barb-avatar-badge" class="hidden absolute bottom-0 right-0 w-4 h-4 rounded-full bg-[#235D3A] border-2 border-white flex items-center justify-center text-[10px] text-white">✓</span>
              </div>
              <div class="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  id="btn-new-barb-usar-camara"
                  class="min-h-[38px] px-3 py-1.5 rounded-lg bg-[#1F3A5F] hover:bg-[#162B47] text-white text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors"
                >
                  <span class="material-symbols-outlined text-[18px]">photo_camera</span>
                  <span>Usar Cámara</span>
                </button>
                <button
                  type="button"
                  id="btn-new-barb-subir-archivo"
                  class="min-h-[38px] px-3 py-1.5 rounded-lg bg-white border border-[#8C8272] hover:bg-[#FAF3E5] text-[#1C1C1C] text-xs font-semibold flex items-center gap-1.5 transition-colors"
                >
                  <span class="material-symbols-outlined text-[18px]">upload_file</span>
                  <span>Subir Archivo</span>
                </button>
                <button
                  type="button"
                  id="btn-new-barb-quitar-foto"
                  class="hidden min-h-[38px] px-2.5 py-1.5 rounded-lg text-[#B3261E] hover:bg-[#FCE8E6] text-xs font-semibold flex items-center gap-1 transition-colors"
                  title="Quitar foto personalizada"
                >
                  <span class="material-symbols-outlined text-[18px]">delete</span>
                </button>
                <input
                  type="file"
                  id="new-barb-file-input"
                  accept="image/jpeg,image/png,image/webp"
                  capture="user"
                  class="hidden"
                />
              </div>
            </div>

            <!-- Visor de cámara WebRTC en vivo -->
            <div id="new-barb-camera-box" class="hidden flex flex-col gap-2 mt-2 p-2 bg-black rounded-xl">
              <div class="relative w-full max-h-52 aspect-video bg-black rounded-lg overflow-hidden flex items-center justify-center">
                <video id="new-barb-video" playsinline muted autoplay class="w-full h-full object-cover"></video>
                <div class="absolute inset-0 pointer-events-none border-2 border-dashed border-white/50 rounded-lg m-2"></div>
              </div>
              <div class="flex items-center justify-between px-1">
                <span class="text-[11px] text-white/80">Centra el rostro en el recuadro</span>
                <div class="flex items-center gap-2">
                  <button
                    type="button"
                    id="btn-new-barb-cancelar-camara"
                    class="px-3 py-1.5 rounded-lg bg-white/20 hover:bg-white/30 text-white text-xs font-medium"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    id="btn-new-barb-capturar-foto"
                    class="px-4 py-1.5 rounded-lg bg-[#235D3A] hover:bg-[#1c492e] text-white text-xs font-bold flex items-center gap-1.5 shadow-md"
                  >
                    <span class="material-symbols-outlined text-[18px]">camera</span>
                    <span>Capturar Foto</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div class="flex flex-col gap-1">
              <label class="font-semibold text-[#1C1C1C]">Nombre Completo (Legal) <span class="text-[#8B1E1E]">*</span></label>
              <input
                type="text"
                id="new-barb-name"
                required
                placeholder="Ej. Andrés Camilo Ríos"
                class="h-10 px-3 bg-white border border-[#8C8272] rounded-lg text-xs text-[#1C1C1C] focus:outline-none focus:ring-2 focus:ring-[#1F3A5F]"
              />
            </div>
            <div class="flex flex-col gap-1">
              <label class="font-semibold text-[#1C1C1C]">Nombre Público / Alias (Landing)</label>
              <input
                type="text"
                id="new-barb-nombre-publico"
                placeholder="Ej. Andrés Barber"
                class="h-10 px-3 bg-white border border-[#8C8272] rounded-lg text-xs text-[#1C1C1C] focus:outline-none focus:ring-2 focus:ring-[#1F3A5F]"
              />
            </div>
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
                  min="0"
                  max="100"
                  step="0.01"
                  value="50"
                  class="h-10 pl-3 pr-8 w-full bg-white border border-[#8C8272] rounded-lg text-xs text-[#1C1C1C] focus:outline-none focus:ring-2 focus:ring-[#1F3A5F]"
                />
                <span class="absolute right-3 top-2.5 font-bold text-[#6B645A]">%</span>
              </div>
            </div>
          </div>

          <div class="flex flex-col gap-1">
            <label class="font-semibold text-[#1C1C1C]">Biografía Breve / Especialidad (máx. 200 caracteres)</label>
            <textarea
              id="new-barb-especialidad"
              rows="2"
              maxlength="200"
              placeholder="Ej. Especialista en Degradados y Barba Clásica"
              class="p-2.5 bg-white border border-[#8C8272] rounded-lg text-xs text-[#1C1C1C] focus:outline-none focus:ring-2 focus:ring-[#1F3A5F] resize-none"
            >Maestro Barbero · Estilo & Navaja</textarea>
          </div>

          <div class="p-3 rounded-lg bg-[#E4ECF5] border border-[#7BA3D4]/40 flex flex-col gap-2">
            <label class="flex items-center gap-2 cursor-pointer font-semibold text-[#1F3A5F]">
              <input type="checkbox" id="new-barb-crear-usuario" checked class="w-4 h-4 text-[#1F3A5F] rounded" />
              <span>Crear cuenta de acceso al Backoffice</span>
            </label>
            <div id="new-barb-pass-container" class="flex flex-col gap-1">
              <label class="text-[11px] font-semibold text-[#1C1C1C]">Contraseña Inicial (mínimo 8 caracteres)</label>
              <input
                type="text"
                id="new-barb-pass"
                value="Barbero2026*"
                class="h-9 px-3 bg-white border border-[#8C8272] rounded-lg text-xs font-mono text-[#1C1C1C]"
              />
              <span class="text-[10px] text-[#6B645A]">El barbero podrá cambiarla posteriormente en su perfil</span>
            </div>
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

    <!-- ========================================== -->
    <!-- MODAL: ADVERTENCIA CITAS FUTURAS (RN-13)   -->
    <!-- ========================================== -->
    <dialog
      id="dialog-citas-futuras-alerta"
      class="p-0 rounded-2xl bg-[#FAF7F2] border border-[#D5CBB8] shadow-2xl backdrop:bg-black/50 max-w-lg w-full mx-auto my-auto"
    >
      <div class="p-6 flex flex-col gap-4">
        <div class="flex items-start justify-between pb-3 border-b border-[#D5CBB8]">
          <div class="flex items-center gap-2.5 text-[#B3261E]">
            <span class="material-symbols-outlined text-[24px]">warning</span>
            <div>
              <h3 class="font-serif text-lg font-bold text-[#1C1C1C]">Atención: Citas Futuras Activas</h3>
              <p class="text-xs text-[#6B645A]">Este barbero tiene turnos programados pendientes o confirmados</p>
            </div>
          </div>
          <button type="button" id="btn-close-alerta-citas" class="text-[#6B645A] hover:text-[#1C1C1C]">
            <span class="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        <div class="p-3.5 rounded-lg bg-[#FCE8E6] text-[#B3261E] text-xs font-medium border border-[#B3261E]/30">
          Si desactiva al barbero, estos turnos quedarán huérfanos en la agenda y los clientes no podrán ser atendidos a menos que los reasigne a otro barbero en la Agenda.
        </div>

        <div id="lista-citas-futuras-container" class="flex flex-col gap-2 max-h-56 overflow-y-auto">
          <!-- Dinámico -->
        </div>

        <div class="flex items-center justify-end gap-2.5 pt-3 border-t border-[#D5CBB8]">
          <button
            type="button"
            id="btn-cancelar-desactivacion"
            class="min-h-[44px] px-4 py-2 rounded-lg bg-white border border-[#8C8272] text-xs font-semibold text-[#4F4A42] hover:bg-[#FAF3E5]"
          >
            Volver a Agenda y Reasignar
          </button>
          <button
            type="button"
            id="btn-confirmar-desactivacion-forzada"
            class="min-h-[44px] px-5 py-2 rounded-lg bg-[#B3261E] hover:bg-[#8e1c16] text-white text-xs font-semibold shadow-xs"
          >
            Confirmar Desactivación
          </button>
        </div>
      </div>
    </dialog>
  `;
}

function renderPerfilTab(barber) {
  return `
    <div class="flex flex-col gap-5 mt-5">
      <div class="p-3.5 rounded-lg bg-[#E4ECF5] text-[#1F3A5F] border-l-4 border-[#1F3A5F] text-xs">
        <p class="font-semibold">Regla sobre comisiones:</p>
        <p class="mt-0.5">El porcentaje configurado aplicará únicamente a nuevas citas y cobros futuros. Los cortes ya registrados conservan el porcentaje aplicado en su momento.</p>
      </div>

      <form id="form-editar-barbero" class="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
        <div class="flex flex-col gap-1">
          <label class="font-semibold text-[#1C1C1C]">Nombre Completo (Legal) <span class="text-[#8B1E1E]">*</span></label>
          <input
            type="text"
            id="edit-barb-nombre"
            required
            value="${barber.nombreCompleto || barber.nombre || ''}"
            class="h-10 px-3 bg-white border border-[#8C8272] rounded-lg text-xs text-[#1C1C1C] focus:outline-none focus:ring-2 focus:ring-[#1F3A5F]"
          />
        </div>

        <div class="flex flex-col gap-1">
          <label class="font-semibold text-[#1C1C1C]">Nombre Público / Alias (Landing)</label>
          <input
            type="text"
            id="edit-barb-nombre-publico"
            value="${barber.nombrePublico || barber.nombre || ''}"
            class="h-10 px-3 bg-white border border-[#8C8272] rounded-lg text-xs text-[#1C1C1C] focus:outline-none focus:ring-2 focus:ring-[#1F3A5F]"
          />
        </div>

        <div class="flex flex-col gap-1">
          <label class="font-semibold text-[#1C1C1C]">Correo Electrónico <span class="text-[#8B1E1E]">*</span></label>
          <input
            type="email"
            id="edit-barb-email"
            required
            value="${barber.email || barber.correo || ''}"
            class="h-10 px-3 bg-white border border-[#8C8272] rounded-lg text-xs text-[#1C1C1C] focus:outline-none focus:ring-2 focus:ring-[#1F3A5F]"
          />
        </div>

        <div class="flex flex-col gap-1">
          <label class="font-semibold text-[#1C1C1C]">Teléfono / WhatsApp <span class="text-[#8B1E1E]">*</span></label>
          <input
            type="tel"
            id="edit-barb-telefono"
            required
            pattern="^3\\d{9}$"
            value="${barber.telefono || ''}"
            class="h-10 px-3 bg-white border border-[#8C8272] rounded-lg text-xs text-[#1C1C1C] font-mono focus:outline-none focus:ring-2 focus:ring-[#1F3A5F]"
          />
        </div>

        <div class="flex flex-col gap-1">
          <label class="font-semibold text-[#1C1C1C]">Sillón Asignado</label>
          <select
            id="edit-barb-sillon"
            class="h-10 px-3 bg-white border border-[#8C8272] rounded-lg text-xs text-[#1C1C1C] focus:outline-none focus:ring-2 focus:ring-[#1F3A5F]"
          >
            <option value="Sillón 01" ${barber.sillon === 'Sillón 01' ? 'selected' : ''}>Sillón 01</option>
            <option value="Sillón 02" ${barber.sillon === 'Sillón 02' ? 'selected' : ''}>Sillón 02</option>
            <option value="Sillón 03" ${barber.sillon === 'Sillón 03' ? 'selected' : ''}>Sillón 03</option>
            <option value="Sillón 04" ${barber.sillon === 'Sillón 04' ? 'selected' : ''}>Sillón 04 (Extraordinario)</option>
          </select>
        </div>

        <div class="flex flex-col gap-1">
          <label class="font-semibold text-[#1C1C1C]">Porcentaje de Comisión (%) <span class="text-[#8B1E1E]">*</span></label>
          <div class="relative">
            <input
              type="number"
              id="edit-barb-comision"
              required
              min="0"
              max="100"
              step="0.01"
              value="${barber.comisionPorcentaje || barber.porcentajeComision || 50}"
              class="h-10 pl-3 pr-8 w-full bg-white border border-[#8C8272] rounded-lg text-xs text-[#1C1C1C] font-mono font-bold focus:outline-none focus:ring-2 focus:ring-[#1F3A5F]"
            />
            <span class="absolute right-3 top-2.5 font-bold text-[#6B645A]">%</span>
          </div>
        </div>

        <!-- Widget de Fotografía con Cámara WebRTC y Archivo en Edición -->
        <div class="md:col-span-2 flex flex-col gap-2 p-3.5 bg-white rounded-xl border border-[#D5CBB8]">
          <span class="text-xs font-semibold text-[#1C1C1C]">Fotografía de Perfil (JPG, PNG, WebP &le; 2MB)</span>
          <div class="flex items-center gap-4">
            <div class="relative shrink-0">
              <img
                id="edit-barb-avatar-preview"
                src="${barber.foto || barber.fotoUrl || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&auto=format&fit=crop&q=80'}"
                alt="${barber.nombre}"
                class="w-16 h-16 rounded-full object-cover border-2 border-[#1F3A5F]"
              />
              <span id="edit-barb-avatar-badge" class="hidden absolute bottom-0 right-0 w-4 h-4 rounded-full bg-[#235D3A] border-2 border-white flex items-center justify-center text-[10px] text-white">✓</span>
            </div>
            <div class="flex flex-wrap items-center gap-2">
              <button
                type="button"
                id="btn-edit-barb-usar-camara"
                class="min-h-[38px] px-3 py-1.5 rounded-lg bg-[#1F3A5F] hover:bg-[#162B47] text-white text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors"
              >
                <span class="material-symbols-outlined text-[18px]">photo_camera</span>
                <span>Usar Cámara</span>
              </button>
              <button
                type="button"
                id="btn-edit-barb-subir-archivo"
                class="min-h-[38px] px-3 py-1.5 rounded-lg bg-white border border-[#8C8272] hover:bg-[#FAF3E5] text-[#1C1C1C] text-xs font-semibold flex items-center gap-1.5 transition-colors"
              >
                <span class="material-symbols-outlined text-[18px]">upload_file</span>
                <span>Subir Archivo</span>
              </button>
              <input
                type="file"
                id="edit-barb-file-input"
                accept="image/jpeg,image/png,image/webp"
                capture="user"
                class="hidden"
              />
            </div>
          </div>

          <!-- Visor de cámara WebRTC en vivo para edición -->
          <div id="edit-barb-camera-box" class="hidden flex flex-col gap-2 mt-2 p-2 bg-black rounded-xl">
            <div class="relative w-full max-h-52 aspect-video bg-black rounded-lg overflow-hidden flex items-center justify-center">
              <video id="edit-barb-video" playsinline muted autoplay class="w-full h-full object-cover"></video>
              <div class="absolute inset-0 pointer-events-none border-2 border-dashed border-white/50 rounded-lg m-2"></div>
            </div>
            <div class="flex items-center justify-between px-1">
              <span class="text-[11px] text-white/80">Centra el rostro en el recuadro</span>
              <div class="flex items-center gap-2">
                <button
                  type="button"
                  id="btn-edit-barb-cancelar-camara"
                  class="px-3 py-1.5 rounded-lg bg-white/20 hover:bg-white/30 text-white text-xs font-medium"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  id="btn-edit-barb-capturar-foto"
                  class="px-4 py-1.5 rounded-lg bg-[#235D3A] hover:bg-[#1c492e] text-white text-xs font-bold flex items-center gap-1.5 shadow-md"
                >
                  <span class="material-symbols-outlined text-[18px]">camera</span>
                  <span>Capturar Foto</span>
                </button>
              </div>
            </div>
          </div>

          <input
            type="hidden"
            id="edit-barb-foto"
            value="${barber.foto || barber.fotoUrl || ''}"
          />
        </div>

        <div class="md:col-span-2 flex flex-col gap-1">
          <label class="font-semibold text-[#1C1C1C]">Especialidad / Biografía Breve</label>
          <textarea
            id="edit-barb-bio"
            rows="2"
            maxlength="200"
            class="p-3 bg-white border border-[#8C8272] rounded-lg text-xs text-[#1C1C1C] focus:outline-none focus:ring-2 focus:ring-[#1F3A5F] resize-none"
          >${barber.biografiaBreve || barber.especialidad || ''}</textarea>
        </div>

        <div class="md:col-span-2 flex justify-end gap-3 pt-3 border-t border-[#D5CBB8]">
          <button
            type="submit"
            id="btn-guardar-ficha-barbero"
            class="min-h-[44px] px-6 py-2 rounded-lg bg-[#1F3A5F] hover:bg-[#162B47] text-white font-semibold text-xs shadow-xs transition-colors flex items-center gap-2"
          >
            <span class="material-symbols-outlined text-[18px]">save</span>
            <span>Guardar Cambios de la Ficha</span>
          </button>
        </div>
      </form>
    </div>
  `;
}

function renderHorarioTab() {
  const schedule = normalizeWeeklySchedule(weeklySchedule);
  weeklySchedule = schedule;
  const timeOptions = getHalfHourTimeOptions();

  const renderTimeSelect = (dayIdx, field, currentVal, disabled = false) => `
    <select
      data-day-idx="${dayIdx}"
      data-field="${field}"
      ${disabled ? 'disabled' : ''}
      class="schedule-time-select h-9 px-2 rounded border border-[#8C8272] bg-white font-mono text-xs text-[#1C1C1C] focus:outline-none focus:ring-2 focus:ring-[#1F3A5F]"
    >
      ${timeOptions.map((opt) => `
        <option value="${opt.value}" ${opt.value === currentVal ? 'selected' : ''}>${opt.label}</option>
      `).join('')}
    </select>
  `;

  return `
    <div class="flex flex-col gap-4 mt-5">
      <!-- Banner de regla operativa -->
      <div class="flex items-start gap-3 p-3.5 rounded-lg bg-[#E4ECF5] text-[#1F3A5F] border-l-4 border-[#1F3A5F]">
        <span class="material-symbols-outlined text-[20px] shrink-0 mt-0.5" aria-hidden="true">info</span>
        <p class="text-xs leading-relaxed">
          <strong class="font-semibold">Horario en bloques de 30 minutos:</strong> Define los días laborales y franjas de atención (minutos :00 y :30) disponibles para reservas y agenda.
        </p>
      </div>

      <!-- Grilla de Días Semanales -->
      <div class="flex flex-col gap-2.5" id="weekly-schedule-list">
        ${schedule.map((item, idx) => {
          return `
            <div class="flex flex-col xl:flex-row xl:items-center justify-between p-3.5 rounded-lg border border-[#D5CBB8] transition-colors gap-3 ${
              item.activo ? 'bg-white hover:bg-[#FAF3E5]' : 'bg-[#E8DFCE]/40'
            }">
              <!-- Nombre y Toggle -->
              <div class="flex items-center gap-4 w-48 shrink-0">
                <span class="font-sans font-semibold text-sm text-[#1C1C1C] w-24">${item.dia}</span>
                <label class="relative inline-flex items-center cursor-pointer min-h-[36px]">
                  <input
                    type="checkbox"
                    data-day-idx="${idx}"
                    aria-label="Activar jornada laboral de ${item.dia}"
                    class="sr-only peer schedule-day-toggle"
                    ${item.activo ? 'checked' : ''}
                  />
                  <div class="w-10 h-5 bg-[#8C8272] peer-focus:outline-none peer-focus-visible:ring-2 peer-focus-visible:ring-[#1F3A5F] rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[10px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#1F3A5F]"></div>
                </label>
              </div>

              <!-- Franjas T1 y T2 o Descanso -->
              ${item.activo ? `
                <div class="flex flex-wrap items-center gap-3 flex-1 text-xs">
                  <!-- Turno 1 -->
                  <div class="flex items-center gap-1.5">
                    <span class="text-xs uppercase font-bold text-[#57534E]">T1</span>
                    ${renderTimeSelect(idx, 't1Inicio', item.t1Inicio || '09:00')}
                    <span class="text-[#57534E]">a</span>
                    ${renderTimeSelect(idx, 't1Fin', item.t1Fin || '13:00')}
                  </div>

                  <span class="text-[#D5CBB8] hidden md:inline">|</span>

                  <!-- Turno 2 (Opcional) -->
                  <div class="flex items-center gap-1.5">
                    <label class="inline-flex items-center gap-1 cursor-pointer">
                      <input
                        type="checkbox"
                        data-day-idx="${idx}"
                        class="schedule-t2-toggle w-4 h-4 text-[#1F3A5F] rounded"
                        ${item.hasT2 ? 'checked' : ''}
                      />
                      <span class="text-xs uppercase font-bold text-[#57534E]">T2</span>
                    </label>
                    ${item.hasT2 ? `
                      ${renderTimeSelect(idx, 't2Inicio', item.t2Inicio || '14:00')}
                      <span class="text-[#57534E]">a</span>
                      ${renderTimeSelect(idx, 't2Fin', item.t2Fin || '19:00')}
                    ` : `<span class="text-xs text-[#57534E]">Jornada continua (sin tarde)</span>`}
                    <span class="text-xs text-[#57534E] ml-1 font-mono">(${item.horas} hrs · ${item.bloques} blq)</span>
                  </div>
                </div>
              ` : `
                <div class="flex items-center gap-2 flex-1 text-xs text-[#57534E]">
                  <span class="material-symbols-outlined text-[18px]" aria-hidden="true">bedtime</span>
                  <span>Día de descanso (sin atención en sede)</span>
                </div>
              `}
            </div>
          `;
        }).join('')}
      </div>

      <!-- Footer de Acciones Horario -->
      <footer class="mt-4 pt-4 border-t border-[#D5CBB8] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <span class="text-xs text-[#57534E]">
          Los cambios aplican a la disponibilidad pública una vez guardados.
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
            <span class="material-symbols-outlined text-[18px]" aria-hidden="true">save</span>
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
        </div>
        ${renderActionButton({
          id: 'btn-open-nuevo-bloqueo',
          variant: 'secondary',
          icon: 'lock_clock',
          label: 'Agregar Bloqueo de Franja'
        })}
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
  let newBarbPhotoBase64 = null;
  let editBarbPhotoBase64 = null;

  // 1. Selección de barbero en lista maestra (delegación)
  const listContainer = document.getElementById('barbers-list-container');
  if (listContainer) {
    listContainer.addEventListener('click', async (e) => {
      const card = e.target.closest?.('.barber-card-item');
      if (!card) return;
      cameraService.stopAllCameras();
      const id = card.getAttribute('data-barber-id');
      if (id && id !== selectedBarberId) {
        selectedBarberId = id;
        await loadBarberosData();
        if (typeof onDataChange === 'function') onDataChange();
      }
    });
  }

  const updateBarbersListGranular = () => {
    if (listContainer) {
      listContainer.innerHTML = renderBarberListItems(getFilteredBarbersList());
    }
  };

  // 2. Buscador de barberos (granular, cero re-fetch y conserva foco)
  const searchInput = document.getElementById('barber-search-input');
  if (searchInput) {
    let timeout;
    searchInput.addEventListener('input', (e) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        searchQuery = e.target.value.trim();
        updateBarbersListGranular();
      }, 180);
    });
  }

  // 3. Filtro Todos / Activos (granular)
  const btnAll = document.getElementById('btn-filter-barbers-all');
  const btnActive = document.getElementById('btn-filter-barbers-active');

  const syncFilterButtons = () => {
    if (btnAll) {
      btnAll.className = `flex-1 py-1.5 px-2 text-center rounded text-xs transition-colors ${
        listFilter === 'todos' ? 'bg-[#FAF7F2] text-[#1C1C1C] font-bold shadow-xs' : 'text-[#4F4A42] hover:text-[#1C1C1C]'
      }`;
    }
    if (btnActive) {
      btnActive.className = `flex-1 py-1.5 px-2 text-center rounded text-xs transition-all ${
        listFilter === 'activos' ? 'bg-[#FAF7F2] text-[#1C1C1C] font-bold shadow-xs' : 'text-[#4F4A42] hover:text-[#1C1C1C]'
      }`;
    }
  };

  if (btnAll) {
    btnAll.addEventListener('click', () => {
      listFilter = 'todos';
      syncFilterButtons();
      updateBarbersListGranular();
    });
  }
  if (btnActive) {
    btnActive.addEventListener('click', () => {
      listFilter = 'activos';
      syncFilterButtons();
      updateBarbersListGranular();
    });
  }

  // 4. Cambio de Pestañas (Ficha, Horario, Bloqueos)
  const tabPerfil = document.getElementById('tab-btn-perfil');
  const tabHorario = document.getElementById('tab-btn-horario');
  const tabBloqueos = document.getElementById('tab-btn-bloqueos');

  if (tabPerfil) {
    tabPerfil.addEventListener('click', () => {
      cameraService.stopAllCameras();
      currentTab = 'perfil';
      if (typeof onDataChange === 'function') onDataChange();
    });
  }
  if (tabHorario) {
    tabHorario.addEventListener('click', () => {
      cameraService.stopAllCameras();
      currentTab = 'horario';
      if (typeof onDataChange === 'function') onDataChange();
    });
  }
  if (tabBloqueos) {
    tabBloqueos.addEventListener('click', () => {
      cameraService.stopAllCameras();
      currentTab = 'bloqueos';
      if (typeof onDataChange === 'function') onDataChange();
    });
  }

  // 4.1. Cámara y Fotografía en Edición de Ficha
  const btnEditUsarCamara = document.getElementById('btn-edit-barb-usar-camara');
  const editCameraBox = document.getElementById('edit-barb-camera-box');
  const editVideoEl = document.getElementById('edit-barb-video');
  const btnEditCapturar = document.getElementById('btn-edit-barb-capturar-foto');
  const btnEditCancelarCamara = document.getElementById('btn-edit-barb-cancelar-camara');
  const editAvatarPreview = document.getElementById('edit-barb-avatar-preview');
  const editAvatarBadge = document.getElementById('edit-barb-avatar-badge');
  const editFileInput = document.getElementById('edit-barb-file-input');
  const btnEditSubirArchivo = document.getElementById('btn-edit-barb-subir-archivo');

  if (btnEditUsarCamara && editVideoEl && editCameraBox) {
    btnEditUsarCamara.addEventListener('click', async () => {
      try {
        await cameraService.startCamera(editVideoEl);
        editCameraBox.classList.remove('hidden');
      } catch (err) {
        alert(err.message);
        if (editFileInput) editFileInput.click();
      }
    });
  }

  if (btnEditCapturar && editVideoEl && editCameraBox) {
    btnEditCapturar.addEventListener('click', () => {
      try {
        const result = cameraService.capturePhoto(editVideoEl);
        editBarbPhotoBase64 = result.dataUrl;
        if (editAvatarPreview) editAvatarPreview.src = result.dataUrl;
        if (editAvatarBadge) editAvatarBadge.classList.remove('hidden');
        editCameraBox.classList.add('hidden');
      } catch (err) {
        alert('Error al capturar foto: ' + err.message);
      }
    });
  }

  if (btnEditCancelarCamara && editVideoEl && editCameraBox) {
    btnEditCancelarCamara.addEventListener('click', () => {
      cameraService.stopCamera(editVideoEl);
      editCameraBox.classList.add('hidden');
    });
  }

  if (btnEditSubirArchivo && editFileInput) {
    btnEditSubirArchivo.addEventListener('click', () => editFileInput.click());
  }

  if (editFileInput) {
    editFileInput.addEventListener('change', async (e) => {
      const file = e.target.files?.[0];
      if (file) {
        try {
          const result = await cameraService.processImageFile(file);
          editBarbPhotoBase64 = result.dataUrl;
          if (editAvatarPreview) editAvatarPreview.src = result.dataUrl;
          if (editAvatarBadge) editAvatarBadge.classList.remove('hidden');
        } catch (err) {
          alert('Error al procesar archivo: ' + err.message);
        }
      }
    });
  }

  // 4.2. Guardar Edición de Ficha del Barbero
  const formEditar = document.getElementById('form-editar-barbero');
  if (formEditar) {
    formEditar.addEventListener('submit', async (e) => {
      e.preventDefault();
      const nombreCompleto = document.getElementById('edit-barb-nombre')?.value.trim();
      const nombrePublico = document.getElementById('edit-barb-nombre-publico')?.value.trim();
      const correo = document.getElementById('edit-barb-email')?.value.trim();
      const telefono = document.getElementById('edit-barb-telefono')?.value.trim();
      const sillon = document.getElementById('edit-barb-sillon')?.value;
      const porcentajeComision = Number(document.getElementById('edit-barb-comision')?.value);
      let fotoUrl = document.getElementById('edit-barb-foto')?.value.trim() || null;
      const biografiaBreve = document.getElementById('edit-barb-bio')?.value.trim();

      const btn = document.getElementById('btn-guardar-ficha-barbero');
      if (btn) btn.disabled = true;

      try {
        if (editBarbPhotoBase64) {
          btn.innerHTML = `
            <span class="material-symbols-outlined text-[18px] animate-spin">refresh</span>
            <span>Subiendo Fotografía...</span>
          `;
          const uploadRes = await barberosService.subirFoto(editBarbPhotoBase64);
          if (uploadRes?.data?.fotoUrl) {
            fotoUrl = uploadRes.data.fotoUrl;
          }
        }

        btn.innerHTML = `
          <span class="material-symbols-outlined text-[18px] animate-spin">refresh</span>
          <span>Guardando Ficha...</span>
        `;

        await barberosService.actualizarBarbero(selectedBarberId, {
          nombreCompleto,
          nombrePublico,
          correo,
          telefono,
          sillon,
          porcentajeComision,
          fotoUrl: fotoUrl || null,
          biografiaBreve: biografiaBreve || null
        });
        alert('Ficha del barbero actualizada correctamente.');
        await loadBarberosData();
        if (typeof onDataChange === 'function') onDataChange();
      } catch (err) {
        alert('Error al actualizar barbero: ' + err.message);
      } finally {
        if (btn) {
          btn.disabled = false;
          btn.innerHTML = `
            <span class="material-symbols-outlined text-[18px]">save</span>
            <span>Guardar Cambios de la Ficha</span>
          `;
        }
      }
    });
  }

  // 5. Toggle de Estado Activar / Desactivar Barbero (Borrado lógico con verificación de citas futuras)
  const toggleStatusBtn = document.getElementById('btn-toggle-barber-status');
  const dialogAlertaCitas = document.getElementById('dialog-citas-futuras-alerta');
  const btnCloseAlerta = document.getElementById('btn-close-alerta-citas');
  const btnCancelarDesactivar = document.getElementById('btn-cancelar-desactivacion');
  const btnConfirmarDesactivar = document.getElementById('btn-confirmar-desactivacion-forzada');
  const containerCitas = document.getElementById('lista-citas-futuras-container');

  if (btnCloseAlerta && dialogAlertaCitas) {
    btnCloseAlerta.addEventListener('click', () => dialogAlertaCitas.close());
  }
  if (btnCancelarDesactivar && dialogAlertaCitas) {
    btnCancelarDesactivar.addEventListener('click', () => dialogAlertaCitas.close());
  }

  if (toggleStatusBtn) {
    toggleStatusBtn.addEventListener('click', async () => {
      const b = cachedBarberos.find(item => item.id === selectedBarberId);
      if (!b) return;

      const newStatus = b.activo === false;

      if (newStatus) {
        // Reactivar
        if (confirm(`¿Desea reactivar a ${b.nombre} para recibir reservas y turnos?`)) {
          await barberosService.cambiarEstadoBarbero(selectedBarberId, true);
          await loadBarberosData();
          if (typeof onDataChange === 'function') onDataChange();
        }
      } else {
        // Desactivar: consultar citas futuras activas
        toggleStatusBtn.disabled = true;
        try {
          const citasRes = await barberosService.getCitasFuturas(selectedBarberId);
          const citasFuturas = citasRes?.data || [];

          if (citasFuturas.length > 0 && dialogAlertaCitas && containerCitas) {
            containerCitas.innerHTML = citasFuturas.map(c => `
              <div class="p-2.5 rounded bg-white border border-[#D5CBB8] text-xs flex items-center justify-between">
                <div class="flex flex-col">
                  <span class="font-mono font-bold text-[#1F3A5F]">${c.codigo_reserva || 'SB-TURNO'}</span>
                  <span class="text-[11px] text-[#6B645A]">${c.fecha} de ${c.hora_inicio?.slice(0, 5)} a ${c.hora_fin?.slice(0, 5)}</span>
                </div>
                <span class="px-2 py-0.5 rounded text-[10px] font-bold ${c.estado === 'confirmada' ? 'bg-[#E3EFE7] text-[#235D3A]' : 'bg-[#FDF1DC] text-[#8A5300]'} uppercase">
                  ${c.estado}
                </span>
              </div>
            `).join('');

            dialogAlertaCitas.showModal();

            if (btnConfirmarDesactivar) {
              btnConfirmarDesactivar.onclick = async () => {
                btnConfirmarDesactivar.disabled = true;
                await barberosService.cambiarEstadoBarbero(selectedBarberId, false);
                dialogAlertaCitas.close();
                await loadBarberosData();
                if (typeof onDataChange === 'function') onDataChange();
              };
            }
          } else {
            if (confirm(`¿Desea desactivar a ${b.nombre}? Esta acción lo ocultará de la agenda pública conservando todo su historial de caja y citas.`)) {
              await barberosService.cambiarEstadoBarbero(selectedBarberId, false);
              await loadBarberosData();
              if (typeof onDataChange === 'function') onDataChange();
            }
          }
        } catch (err) {
          alert('Error al verificar estado del barbero: ' + err.message);
        } finally {
          toggleStatusBtn.disabled = false;
        }
      }
    });
  }

  // 6. Edición interactiva y guardado de Horario Semanal
  document.querySelectorAll('.schedule-day-toggle').forEach((chk) => {
    chk.addEventListener('change', (e) => {
      const idx = parseInt(e.target.getAttribute('data-day-idx'), 10);
      if (!Number.isNaN(idx) && weeklySchedule[idx]) {
        weeklySchedule[idx].activo = e.target.checked;
        if (e.target.checked && !weeklySchedule[idx].t1Inicio) {
          weeklySchedule[idx].t1Inicio = '09:00';
          weeklySchedule[idx].t1Fin = '13:00';
        }
        weeklySchedule[idx] = { ...weeklySchedule[idx], ...computeDayMetrics(weeklySchedule[idx]) };
        if (typeof onDataChange === 'function') onDataChange();
      }
    });
  });

  document.querySelectorAll('.schedule-t2-toggle').forEach((chk) => {
    chk.addEventListener('change', (e) => {
      const idx = parseInt(e.target.getAttribute('data-day-idx'), 10);
      if (!Number.isNaN(idx) && weeklySchedule[idx]) {
        weeklySchedule[idx].hasT2 = e.target.checked;
        if (e.target.checked) {
          weeklySchedule[idx].t2Inicio = weeklySchedule[idx].t2Inicio || '14:00';
          weeklySchedule[idx].t2Fin = weeklySchedule[idx].t2Fin || '19:00';
        }
        weeklySchedule[idx] = { ...weeklySchedule[idx], ...computeDayMetrics(weeklySchedule[idx]) };
        if (typeof onDataChange === 'function') onDataChange();
      }
    });
  });

  document.querySelectorAll('.schedule-time-select').forEach((sel) => {
    sel.addEventListener('change', (e) => {
      const idx = parseInt(e.target.getAttribute('data-day-idx'), 10);
      const field = e.target.getAttribute('data-field');
      if (!Number.isNaN(idx) && field && weeklySchedule[idx]) {
        weeklySchedule[idx][field] = e.target.value;
        weeklySchedule[idx] = { ...weeklySchedule[idx], ...computeDayMetrics(weeklySchedule[idx]) };
        if (typeof onDataChange === 'function') onDataChange();
      }
    });
  });

  const revertHorarioBtn = document.getElementById('btn-revertir-horario');
  if (revertHorarioBtn) {
    revertHorarioBtn.addEventListener('click', () => {
      weeklySchedule = savedWeeklyScheduleSnapshot.map((d) => ({ ...d }));
      if (typeof onDataChange === 'function') onDataChange();
    });
  }

  const saveHorarioBtn = document.getElementById('btn-guardar-horario');
  if (saveHorarioBtn) {
    saveHorarioBtn.addEventListener('click', async () => {
      saveHorarioBtn.disabled = true;
      saveHorarioBtn.textContent = 'Guardando...';

      try {
        const serialized = serializeWeeklySchedule(weeklySchedule);
        await barberosService.guardarHorarioSemanal(selectedBarberId, serialized);
        savedWeeklyScheduleSnapshot = weeklySchedule.map((d) => ({ ...d }));
        alert('Horario semanal actualizado correctamente en bloques de 30 minutos.');
      } catch (err) {
        alert('Error al guardar horario: ' + err.message);
      } finally {
        saveHorarioBtn.disabled = false;
        saveHorarioBtn.innerHTML = `
          <span class="material-symbols-outlined text-[18px]" aria-hidden="true">save</span>
          <span>Guardar Horario Semanal</span>
        `;
      }
    });
  }

  // 7. Modal + Nuevo Barbero (CU-009 con Cámara WebRTC)
  const dialogNuevo = document.getElementById('dialog-nuevo-barbero');
  const openNuevoBtn = document.getElementById('btn-open-nuevo-barbero');
  const closeNuevoBtn = document.getElementById('btn-close-nuevo-barbero');
  const cancelNuevoBtn = document.getElementById('btn-cancelar-nuevo-barbero');
  const formNuevo = document.getElementById('form-nuevo-barbero');

  // Controles de foto y cámara para nuevo barbero
  const btnNewUsarCamara = document.getElementById('btn-new-barb-usar-camara');
  const newCameraBox = document.getElementById('new-barb-camera-box');
  const newVideoEl = document.getElementById('new-barb-video');
  const btnNewCapturar = document.getElementById('btn-new-barb-capturar-foto');
  const btnNewCancelarCamara = document.getElementById('btn-new-barb-cancelar-camara');
  const newAvatarPreview = document.getElementById('new-barb-avatar-preview');
  const newAvatarBadge = document.getElementById('new-barb-avatar-badge');
  const newFileInput = document.getElementById('new-barb-file-input');
  const btnNewSubirArchivo = document.getElementById('btn-new-barb-subir-archivo');
  const btnNewQuitarFoto = document.getElementById('btn-new-barb-quitar-foto');

  const resetNuevoBarberoFoto = () => {
    newBarbPhotoBase64 = null;
    if (newAvatarPreview) {
      newAvatarPreview.src = 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&auto=format&fit=crop&q=80';
    }
    if (newAvatarBadge) newAvatarBadge.classList.add('hidden');
    if (btnNewQuitarFoto) btnNewQuitarFoto.classList.add('hidden');
    if (newCameraBox) newCameraBox.classList.add('hidden');
    if (newFileInput) newFileInput.value = '';
    cameraService.stopAllCameras();
  };

  if (openNuevoBtn && dialogNuevo) {
    openNuevoBtn.addEventListener('click', () => {
      resetNuevoBarberoFoto();
      dialogNuevo.showModal();
    });
  }

  const closeDialogNuevo = () => {
    cameraService.stopAllCameras();
    if (dialogNuevo) dialogNuevo.close();
  };
  if (closeNuevoBtn) closeNuevoBtn.addEventListener('click', closeDialogNuevo);
  if (cancelNuevoBtn) cancelNuevoBtn.addEventListener('click', closeDialogNuevo);
  if (dialogNuevo) dialogNuevo.addEventListener('close', () => cameraService.stopAllCameras());

  if (btnNewUsarCamara && newVideoEl && newCameraBox) {
    btnNewUsarCamara.addEventListener('click', async () => {
      try {
        await cameraService.startCamera(newVideoEl);
        newCameraBox.classList.remove('hidden');
      } catch (err) {
        alert(err.message);
        if (newFileInput) newFileInput.click();
      }
    });
  }

  if (btnNewCapturar && newVideoEl && newCameraBox) {
    btnNewCapturar.addEventListener('click', () => {
      try {
        const result = cameraService.capturePhoto(newVideoEl);
        newBarbPhotoBase64 = result.dataUrl;
        if (newAvatarPreview) newAvatarPreview.src = result.dataUrl;
        if (newAvatarBadge) newAvatarBadge.classList.remove('hidden');
        if (btnNewQuitarFoto) btnNewQuitarFoto.classList.remove('hidden');
        newCameraBox.classList.add('hidden');
      } catch (err) {
        alert('Error al capturar foto: ' + err.message);
      }
    });
  }

  if (btnNewCancelarCamara && newVideoEl && newCameraBox) {
    btnNewCancelarCamara.addEventListener('click', () => {
      cameraService.stopCamera(newVideoEl);
      newCameraBox.classList.add('hidden');
    });
  }

  if (btnNewSubirArchivo && newFileInput) {
    btnNewSubirArchivo.addEventListener('click', () => newFileInput.click());
  }

  if (btnNewQuitarFoto) {
    btnNewQuitarFoto.addEventListener('click', () => resetNuevoBarberoFoto());
  }

  if (newFileInput) {
    newFileInput.addEventListener('change', async (e) => {
      const file = e.target.files?.[0];
      if (file) {
        try {
          const result = await cameraService.processImageFile(file);
          newBarbPhotoBase64 = result.dataUrl;
          if (newAvatarPreview) newAvatarPreview.src = result.dataUrl;
          if (newAvatarBadge) newAvatarBadge.classList.remove('hidden');
          if (btnNewQuitarFoto) btnNewQuitarFoto.classList.remove('hidden');
        } catch (err) {
          alert('Error al procesar archivo: ' + err.message);
        }
      }
    });
  }

  if (formNuevo) {
    formNuevo.addEventListener('submit', async (e) => {
      e.preventDefault();
      const nombreCompleto = document.getElementById('new-barb-name')?.value.trim();
      const nombrePublico = document.getElementById('new-barb-nombre-publico')?.value.trim();
      const correo = document.getElementById('new-barb-email')?.value.trim();
      const telefono = document.getElementById('new-barb-phone')?.value.trim();
      const sillon = document.getElementById('new-barb-sillon')?.value;
      const porcentajeComision = Number(document.getElementById('new-barb-comision')?.value);
      const biografiaBreve = document.getElementById('new-barb-especialidad')?.value.trim();
      const crearUsuario = document.getElementById('new-barb-crear-usuario')?.checked ?? true;
      const contrasenaInicial = document.getElementById('new-barb-pass')?.value || 'Barbero2026*';

      const submitBtn = formNuevo.querySelector('button[type="submit"]');
      if (submitBtn) submitBtn.disabled = true;

      try {
        let fotoUrl = null;
        if (newBarbPhotoBase64) {
          if (submitBtn) {
            submitBtn.innerHTML = `
              <span class="material-symbols-outlined text-[16px] animate-spin">refresh</span>
              <span>Subiendo Foto...</span>
            `;
          }
          const uploadRes = await barberosService.subirFoto(newBarbPhotoBase64);
          if (uploadRes?.data?.fotoUrl) {
            fotoUrl = uploadRes.data.fotoUrl;
          }
        }

        if (submitBtn) {
          submitBtn.innerHTML = `
            <span class="material-symbols-outlined text-[16px] animate-spin">refresh</span>
            <span>Creando Barbero...</span>
          `;
        }

        const res = await barberosService.crearBarbero({
          nombreCompleto,
          nombrePublico: nombrePublico || nombreCompleto,
          correo,
          telefono,
          sillon,
          porcentajeComision,
          biografiaBreve,
          fotoUrl,
          crearUsuario,
          contrasenaInicial
        });

        if (res.ok) {
          selectedBarberId = res.data.id;
          closeDialogNuevo();
          alert(`Barbero "${res.data.nombre}" registrado exitosamente.`);
          await loadBarberosData();
          if (typeof onDataChange === 'function') onDataChange();
        }
      } catch (err) {
        alert('Error al crear barbero: ' + err.message);
      } finally {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = 'Guardar Barbero';
        }
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
