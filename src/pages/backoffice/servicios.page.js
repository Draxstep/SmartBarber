/**
 * SmartBarber - Módulo de Catálogo de Servicios y Tarifas
 * Fiel a docs/stitch/smartbarber_cat_logo_de_servicios_y_tarifas
 * Conexión completa con serviciosService, duración en bloques de 30 min,
 * precios en COP enteros, ordenación y modales de alta/edición de tarifas (CU-014).
 */

import { serviciosService } from '../../services/index.js';
import { formatCOP } from '../../utils/formatters.js';

let cachedServicios = [];
let currentFilter = 'all'; // 'all' | 'activos' | 'inactivos'
let currentSort = 'orden'; // 'orden' | 'price-asc' | 'price-desc' | 'duration'
let editingService = null;

export async function loadServiciosData() {
  const res = await serviciosService.getServicios({
    activo: currentFilter === 'all' ? 'all' : (currentFilter === 'activos'),
    sort: currentSort
  });
  if (res.ok) cachedServicios = res.data;
}

export function renderServiciosPage() {
  const servicios = cachedServicios;
  const activosCount = servicios.filter(s => s.activo !== false).length;
  const inactivosCount = servicios.filter(s => s.activo === false).length;

  return `
    <div class="flex flex-col gap-6 w-full animate-fadeIn">
      <!-- HEADER SUPERIOR -->
      <section class="flex flex-col gap-2">
        <div class="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 class="font-serif text-2xl sm:text-3xl font-bold text-[#1C1C1C] tracking-tight">
              Catálogo de Servicios
            </h1>
            <p class="font-sans text-xs sm:text-sm text-[#4F4A42] mt-0.5">
              Los cambios de precio aplican solo a nuevas citas y cortes; el historial contable se conserva intacto.
            </p>
          </div>

          <button
            type="button"
            id="btn-open-nuevo-servicio"
            class="min-h-[44px] inline-flex items-center justify-center gap-2 px-5 rounded-lg bg-[#1F3A5F] hover:bg-[#162B47] text-white font-sans font-semibold text-xs shadow-sm active:scale-95 transition-all shrink-0"
          >
            <span class="material-symbols-outlined text-[18px]">add</span>
            <span>+ Nuevo Servicio</span>
          </button>
        </div>
      </section>

      <!-- OPERATIONAL DOUBLE RULE ACCENT -->
      <div aria-hidden="true" class="w-full flex flex-col gap-[3px]">
        <div class="h-[2px] bg-[#1C1C1C] w-full"></div>
        <div class="h-[1px] bg-[#8B1E1E] w-full"></div>
      </div>

      <!-- FILTER & RULE INDICATOR BAR -->
      <section class="bg-[#FAF7F2] border border-[#D5CBB8] rounded-xl p-4 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <!-- Pestañas de Filtro de Estado -->
        <div class="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            data-filter="all"
            class="filter-service-tab inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-colors ${
              currentFilter === 'all'
                ? 'bg-[#1F3A5F] text-white shadow-xs'
                : 'bg-[#E8DFCE]/60 text-[#4F4A42] hover:text-[#1C1C1C]'
            }"
          >
            <span>Todos</span>
            <span class="px-1.5 py-0.5 rounded-full font-mono text-[11px] ${
              currentFilter === 'all' ? 'bg-[#d5e3ff] text-[#001c3b]' : 'bg-[#FAF7F2] text-[#4F4A42]'
            }">${servicios.length}</span>
          </button>

          <button
            type="button"
            data-filter="activos"
            class="filter-service-tab inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-colors ${
              currentFilter === 'activos'
                ? 'bg-[#1F3A5F] text-white shadow-xs'
                : 'bg-[#E8DFCE]/60 text-[#4F4A42] hover:text-[#1C1C1C]'
            }"
          >
            <span>Activos</span>
            <span class="px-1.5 py-0.5 rounded-full font-mono text-[11px] ${
              currentFilter === 'activos' ? 'bg-[#d5e3ff] text-[#001c3b]' : 'bg-[#FAF7F2] text-[#4F4A42]'
            }">${activosCount}</span>
          </button>

          <button
            type="button"
            data-filter="inactivos"
            class="filter-service-tab inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-colors ${
              currentFilter === 'inactivos'
                ? 'bg-[#1F3A5F] text-white shadow-xs'
                : 'bg-[#E8DFCE]/60 text-[#4F4A42] hover:text-[#1C1C1C]'
            }"
          >
            <span>Inactivos</span>
            <span class="px-1.5 py-0.5 rounded-full font-mono text-[11px] ${
              currentFilter === 'inactivos' ? 'bg-[#d5e3ff] text-[#001c3b]' : 'bg-[#FAF7F2] text-[#4F4A42]'
            }">${inactivosCount}</span>
          </button>
        </div>

        <!-- Controles Derechos: Regla de Negocio & Selector de Orden -->
        <div class="flex items-center flex-wrap gap-3">
          <div class="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#E4ECF5] text-[#1F3A5F] text-xs font-medium border border-[#1F3A5F]/20">
            <span class="material-symbols-outlined text-[16px]">schedule</span>
            <span>Duración sincronizada en bloques de 30 min</span>
          </div>

          <div class="relative inline-flex items-center">
            <div class="flex items-center gap-2 bg-white border border-[#8C8272] px-3 py-1.5 rounded-lg">
              <span class="material-symbols-outlined text-[18px] text-[#6B645A]">swap_vert</span>
              <select id="sort-services-select" class="bg-transparent text-xs font-semibold text-[#1C1C1C] focus:outline-none cursor-pointer pr-2">
                <option value="orden" ${currentSort === 'orden' ? 'selected' : ''}>Orden visual catálogo</option>
                <option value="price-asc" ${currentSort === 'price-asc' ? 'selected' : ''}>Precio: Menor a Mayor</option>
                <option value="price-desc" ${currentSort === 'price-desc' ? 'selected' : ''}>Precio: Mayor a Menor</option>
                <option value="duration" ${currentSort === 'duration' ? 'selected' : ''}>Mayor duración</option>
              </select>
            </div>
          </div>
        </div>
      </section>

      <!-- TABLA PRINCIPAL DE SERVICIOS -->
      <section class="bg-[#FAF7F2] border border-[#D5CBB8] rounded-xl shadow-xs overflow-hidden flex flex-col">
        <div class="overflow-x-auto">
          <table class="w-full text-left border-collapse">
            <thead>
              <tr class="bg-[#E8DFCE] text-[#4F4A42] font-sans text-[11px] uppercase tracking-wider">
                <th class="py-3 px-4 font-semibold text-center w-14">#</th>
                <th class="py-3 px-4 font-semibold min-w-[260px]">Servicio y Descripción</th>
                <th class="py-3 px-4 font-semibold min-w-[140px]">Precio Base</th>
                <th class="py-3 px-4 font-semibold min-w-[170px]">Duración Operativa</th>
                <th class="py-3 px-4 font-semibold min-w-[140px]">Visibilidad</th>
                <th class="py-3 px-4 font-semibold min-w-[120px]">Estado</th>
                <th class="py-3 px-4 font-semibold text-right min-w-[160px]">Acciones</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-[#D5CBB8]/50 text-xs text-[#1C1C1C]">
              ${servicios.map((srv, idx) => {
                const isActivo = srv.activo !== false;
                const isVisible = srv.visibleEnLanding !== false;
                const bloques = srv.duracionBloques || Math.ceil((srv.duracionMinutos || 30) / 30);

                return `
                  <tr class="hover:bg-[#FAF3E5] transition-colors ${isActivo ? 'bg-white' : 'bg-[#FAF3E5]/60 opacity-75'}">
                    <!-- Número / Orden -->
                    <td class="py-3 px-4 text-center">
                      <div class="flex items-center justify-center gap-1 text-[#6B645A]">
                        <span class="material-symbols-outlined text-[16px]">drag_indicator</span>
                        <span class="font-mono text-xs font-semibold">${srv.orden || idx + 1}</span>
                      </div>
                    </td>

                    <!-- Servicio y Descripción -->
                    <td class="py-3 px-4">
                      <div class="flex flex-col">
                        <span class="font-sans font-bold text-xs text-[#1C1C1C]">${srv.nombre}</span>
                        <span class="text-[11px] text-[#4F4A42] mt-0.5 line-clamp-1">${srv.descripcion || 'Sin descripción'}</span>
                      </div>
                    </td>

                    <!-- Precio Base COP -->
                    <td class="py-3 px-4 font-mono font-bold text-sm text-[#1C1C1C] tabular-nums">
                      ${formatCOP(srv.precio)}
                    </td>

                    <!-- Duración Operativa en Bloques -->
                    <td class="py-3 px-4">
                      <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#E8DFCE]/70 text-[#1C1C1C] font-mono text-[11px] border border-[#D5CBB8]">
                        <span class="material-symbols-outlined text-[14px] text-[#6B645A]">timelapse</span>
                        <span>${bloques} bloque${bloques > 1 ? 's' : ''} (${srv.duracionMinutos || 30} min)</span>
                      </span>
                    </td>

                    <!-- Visibilidad Landing -->
                    <td class="py-3 px-4">
                      ${isVisible ? `
                        <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#E4ECF5] text-[#1F3A5F] text-[11px] font-semibold border border-[#1F3A5F]/20">
                          <span class="material-symbols-outlined text-[13px]">visibility</span>
                          <span>Visible</span>
                        </span>
                      ` : `
                        <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#E8DFCE] text-[#6B645A] text-[11px] font-semibold">
                          <span class="material-symbols-outlined text-[13px]">visibility_off</span>
                          <span>Oculto</span>
                        </span>
                      `}
                    </td>

                    <!-- Estado Activo / Inactivo -->
                    <td class="py-3 px-4">
                      ${isActivo ? `
                        <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#E3EFE7] text-[#235D3A] text-[11px] font-semibold border border-[#235D3A]/20">
                          <span class="w-1.5 h-1.5 rounded-full bg-[#235D3A]"></span>
                          <span>Activo</span>
                        </span>
                      ` : `
                        <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#E8DFCE] text-[#6B645A] text-[11px] font-semibold">
                          <span class="w-1.5 h-1.5 rounded-full bg-[#8C8272]"></span>
                          <span>Inactivo</span>
                        </span>
                      `}
                    </td>

                    <!-- Acciones -->
                    <td class="py-3 px-4 text-right">
                      <div class="inline-flex items-center justify-end gap-2">
                        <button
                          type="button"
                          class="btn-edit-service px-2.5 py-1 text-[#1F3A5F] hover:bg-[#E4ECF5] rounded text-xs font-semibold transition-colors"
                          data-id="${srv.id}"
                        >
                          Editar
                        </button>
                        <button
                          type="button"
                          class="btn-toggle-service-status px-2.5 py-1 ${isActivo ? 'text-[#B3261E] hover:bg-[#FCE8E6]' : 'text-[#235D3A] hover:bg-[#E3EFE7]'} rounded text-xs font-semibold transition-colors"
                          data-id="${srv.id}"
                          data-activo="${isActivo}"
                        >
                          ${isActivo ? 'Desactivar' : 'Reactivar'}
                        </button>
                      </div>
                    </td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>

        <div class="bg-[#E8DFCE] px-4 py-3 flex items-center justify-between text-xs text-[#4F4A42]">
          <span>Total servicios en catálogo: <strong>${servicios.length}</strong></span>
          <span class="font-mono text-[11px] text-[#6B645A]">Regla: Incrementos de 30 min por bloque</span>
        </div>
      </section>
    </div>

    <!-- ========================================== -->
    <!-- MODAL: + NUEVO SERVICIO / EDITAR SERVICIO  -->
    <!-- ========================================== -->
    <dialog
      id="dialog-servicio-form"
      class="p-0 rounded-2xl bg-[#FAF7F2] border border-[#D5CBB8] shadow-2xl backdrop:bg-black/50 max-w-lg w-full mx-auto my-auto"
    >
      <div class="p-6 flex flex-col gap-4">
        <div class="flex items-start justify-between pb-3 border-b border-[#D5CBB8]">
          <div class="flex items-center gap-2.5">
            <div class="w-9 h-9 rounded-lg bg-[#1F3A5F] text-white flex items-center justify-center">
              <span class="material-symbols-outlined text-[20px]" id="modal-service-icon">content_cut</span>
            </div>
            <div>
              <h3 class="font-serif text-lg font-bold text-[#1C1C1C]" id="modal-service-title">Nuevo Servicio</h3>
            </div>
          </div>
          <button type="button" id="btn-close-service-modal" class="text-[#6B645A] hover:text-[#1C1C1C]">
            <span class="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        <form id="form-servicio-modal" class="flex flex-col gap-3 text-xs">
          <input type="hidden" id="service-id-hidden" value="" />

          <div class="flex flex-col gap-1">
            <label class="font-semibold text-[#1C1C1C]">Nombre del Servicio <span class="text-[#8B1E1E]">*</span></label>
            <input
              type="text"
              id="srv-nombre-input"
              required
              placeholder="Ej. Ritual de Barba Completo con Toalla Caliente"
              class="h-10 px-3 bg-white border border-[#8C8272] rounded-lg text-xs text-[#1C1C1C] focus:outline-none focus:ring-2 focus:ring-[#1F3A5F]"
            />
          </div>

          <div class="flex flex-col gap-1">
            <label class="font-semibold text-[#1C1C1C]">Descripción Comercial (Landing & Clientes)</label>
            <textarea
              id="srv-desc-input"
              rows="2"
              placeholder="Lavado, tratamiento relajante con toalla tibia y peinado artesanal..."
              class="p-3 bg-white border border-[#8C8272] rounded-lg text-xs text-[#1C1C1C] focus:outline-none focus:ring-2 focus:ring-[#1F3A5F]"
            ></textarea>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div class="flex flex-col gap-1">
              <label class="font-semibold text-[#1C1C1C]">Precio Base COP (Entero) <span class="text-[#8B1E1E]">*</span></label>
              <div class="relative">
                <span class="absolute left-3 top-2.5 font-bold text-[#6B645A]">$</span>
                <input
                  type="number"
                  id="srv-precio-input"
                  required
                  step="1000"
                  min="5000"
                  placeholder="25000"
                  class="h-10 pl-7 pr-3 w-full bg-white border border-[#8C8272] rounded-lg text-xs font-mono font-bold text-[#1C1C1C] focus:outline-none focus:ring-2 focus:ring-[#1F3A5F]"
                />
              </div>
            </div>

            <div class="flex flex-col gap-1">
              <label class="font-semibold text-[#1C1C1C]">Duración Operativa <span class="text-[#8B1E1E]">*</span></label>
              <select
                id="srv-duracion-select"
                class="h-10 px-3 bg-white border border-[#8C8272] rounded-lg text-xs font-semibold text-[#1C1C1C] focus:outline-none focus:ring-2 focus:ring-[#1F3A5F]"
              >
                <option value="30">1 bloque (30 minutos)</option>
                <option value="60">2 bloques (60 minutos)</option>
                <option value="90">3 bloques (90 minutos)</option>
                <option value="120">4 bloques (120 minutos)</option>
              </select>
            </div>
          </div>

          <!-- Checkbox Visibilidad en Landing -->
          <label class="flex items-center gap-2.5 mt-1 cursor-pointer">
            <input
              type="checkbox"
              id="srv-visible-check"
              checked
              class="w-4 h-4 rounded text-[#1F3A5F] focus:ring-[#1F3A5F]"
            />
            <span class="text-xs text-[#1C1C1C] font-semibold">Visible en el Portal Público (Landing Page de Clientes)</span>
          </label>

          <!-- Nota de Auditoría Precios -->
          <div class="p-2.5 rounded bg-[#FAF3E5] border border-[#D5CBB8] text-[11px] text-[#4F4A42] leading-relaxed">
            <strong class="font-semibold text-[#1C1C1C]">Auditoría Contable:</strong> La actualización de tarifas solo impacta nuevas reservas. Las citas existentes conservan su precio histórico pactado.
          </div>

          <!-- Botones -->
          <div class="flex items-center justify-end gap-2.5 pt-3 border-t border-[#D5CBB8] mt-1">
            <button
              type="button"
              id="btn-cancel-service-modal"
              class="min-h-[44px] px-4 py-2 rounded-lg bg-white border border-[#8C8272] text-xs font-semibold text-[#4F4A42] hover:bg-[#FAF3E5]"
            >
              Cancelar
            </button>
            <button
              type="submit"
              class="min-h-[44px] px-5 py-2 rounded-lg bg-[#1F3A5F] hover:bg-[#162B47] text-white text-xs font-semibold shadow-xs"
            >
              Guardar Servicio
            </button>
          </div>
        </form>
      </div>
    </dialog>
  `;
}

export function attachServiciosListeners(onDataChange) {
  // 1. Pestañas de filtro Activos/Inactivos
  const filterTabs = document.querySelectorAll('.filter-service-tab');
  filterTabs.forEach(tab => {
    tab.addEventListener('click', async () => {
      currentFilter = tab.getAttribute('data-filter') || 'all';
      await loadServiciosData();
      if (typeof onDataChange === 'function') onDataChange();
    });
  });

  // 2. Selector de Orden
  const sortSelect = document.getElementById('sort-services-select');
  if (sortSelect) {
    sortSelect.addEventListener('change', async (e) => {
      currentSort = e.target.value;
      await loadServiciosData();
      if (typeof onDataChange === 'function') onDataChange();
    });
  }

  // 3. Modal Nuevo Servicio
  const dialogService = document.getElementById('dialog-servicio-form');
  const openNuevoBtn = document.getElementById('btn-open-nuevo-servicio');
  const closeBtn = document.getElementById('btn-close-service-modal');
  const cancelBtn = document.getElementById('btn-cancel-service-modal');
  const formService = document.getElementById('form-servicio-modal');

  const openModal = (srv = null) => {
    editingService = srv;
    const titleEl = document.getElementById('modal-service-title');
    const hiddenId = document.getElementById('service-id-hidden');
    const nombreInput = document.getElementById('srv-nombre-input');
    const descInput = document.getElementById('srv-desc-input');
    const precioInput = document.getElementById('srv-precio-input');
    const duracionSelect = document.getElementById('srv-duracion-select');
    const visibleCheck = document.getElementById('srv-visible-check');

    if (srv) {
      if (titleEl) titleEl.textContent = 'Editar Servicio';
      if (hiddenId) hiddenId.value = srv.id;
      if (nombreInput) nombreInput.value = srv.nombre;
      if (descInput) descInput.value = srv.descripcion || '';
      if (precioInput) precioInput.value = srv.precio;
      if (duracionSelect) duracionSelect.value = String(srv.duracionMinutos || 30);
      if (visibleCheck) visibleCheck.checked = srv.visibleEnLanding !== false;
    } else {
      if (titleEl) titleEl.textContent = 'Nuevo Servicio';
      if (hiddenId) hiddenId.value = '';
      if (nombreInput) nombreInput.value = '';
      if (descInput) descInput.value = '';
      if (precioInput) precioInput.value = '25000';
      if (duracionSelect) duracionSelect.value = '30';
      if (visibleCheck) visibleCheck.checked = true;
    }

    if (dialogService) dialogService.showModal();
  };

  if (openNuevoBtn) openNuevoBtn.addEventListener('click', () => openModal(null));

  const closeModal = () => {
    if (dialogService) dialogService.close();
  };
  if (closeBtn) closeBtn.addEventListener('click', closeModal);
  if (cancelBtn) cancelBtn.addEventListener('click', closeModal);

  // 4. Submit Formulario
  if (formService) {
    formService.addEventListener('submit', async (e) => {
      e.preventDefault();
      const srvId = document.getElementById('service-id-hidden')?.value;
      const nombre = document.getElementById('srv-nombre-input')?.value.trim();
      const descripcion = document.getElementById('srv-desc-input')?.value.trim();
      const precio = Number(document.getElementById('srv-precio-input')?.value) || 25000;
      const duracionMinutos = Number(document.getElementById('srv-duracion-select')?.value) || 30;
      const visibleEnLanding = document.getElementById('srv-visible-check')?.checked;

      try {
        if (srvId) {
          await serviciosService.actualizarServicio(srvId, {
            nombre,
            descripcion,
            precio,
            duracionMinutos,
            visibleEnLanding
          });
        } else {
          await serviciosService.crearServicio({
            nombre,
            descripcion,
            precio,
            duracionMinutos,
            visibleEnLanding
          });
        }

        closeModal();
        await loadServiciosData();
        if (typeof onDataChange === 'function') onDataChange();
      } catch (err) {
        alert('Error al guardar servicio: ' + err.message);
      }
    });
  }

  // 5. Botones Editar
  const editBtns = document.querySelectorAll('.btn-edit-service');
  editBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-id');
      const srv = cachedServicios.find(item => item.id === id);
      if (srv) openModal(srv);
    });
  });

  // 6. Botones Toggle Estado
  const toggleBtns = document.querySelectorAll('.btn-toggle-service-status');
  toggleBtns.forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = btn.getAttribute('data-id');
      const isActivo = btn.getAttribute('data-activo') === 'true';
      const newStatus = !isActivo;

      if (confirm(`¿Desea ${newStatus ? 'reactivar' : 'desactivar'} este servicio en el catálogo?`)) {
        await serviciosService.cambiarEstadoServicio(id, newStatus);
        await loadServiciosData();
        if (typeof onDataChange === 'function') onDataChange();
      }
    });
  });
}
