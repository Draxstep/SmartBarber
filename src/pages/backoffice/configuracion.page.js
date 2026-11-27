/**
 * SmartBarber - Módulo de Configuración de Sede y Parámetros (Producción Real)
 * Conectado a GET/PUT /api/v1/sedes y GET /api/v1/usuarios, sincronizando el App Shell via EventBus.
 */

import { sedesService, usuariosService } from '../../services/index.js';
import { emitDataMutation } from '../../utils/event-bus.js';
import { renderActionButton } from '../../components/action-button.js';

let sedeConfig = {
  id: '',
  nombreComercial: 'SmartBarber Studio',
  eslogan: 'El oficio clásico del buen corte tradicional',
  direccionFisica: 'Carrera 3 # 12-42, La Candelaria, Bogotá D.C.',
  telefonoContacto: '',
  correoContacto: '',
  horarioGeneralTexto: 'Lunes a Sábado 08:00 AM - 08:00 PM',
  zonaHoraria: 'America/Bogota',
  diasMaxAnticipacion: 14,
  minutosMinAnticipacion: 120,
  estadoInicialCita: 'pendiente'
};

let cachedUsuarios = [];
let configSuccessMsg = '';
let configErrorMsg = '';
let rulesSuccessMsg = '';

export async function loadConfiguracionData() {
  configSuccessMsg = '';
  configErrorMsg = '';
  rulesSuccessMsg = '';

  const [sedeRes, usersRes] = await Promise.all([
    sedesService.getSedeActiva().catch(() => null),
    usuariosService.listUsuarios().catch(() => null)
  ]);

  if (sedeRes?.data) {
    const s = sedeRes.data;
    sedeConfig = {
      id: s.id || s.sedeId || '',
      nombreComercial: s.nombreComercial || sedeConfig.nombreComercial,
      eslogan: s.eslogan || '',
      direccionFisica: s.direccionFisica || s.direccion || '',
      telefonoContacto: s.telefonoContacto || s.telefono || '',
      correoContacto: s.correoContacto || s.correo || '',
      horarioGeneralTexto: s.horarioGeneralTexto || sedeConfig.horarioGeneralTexto,
      zonaHoraria: s.zonaHoraria || 'America/Bogota',
      diasMaxAnticipacion: Number(s.diasMaxAnticipacion) || 14,
      minutosMinAnticipacion: Number(s.minutosMinAnticipacion) || 120,
      estadoInicialCita: s.estadoInicialCita || 'pendiente'
    };
  }

  cachedUsuarios = Array.isArray(usersRes?.data) ? usersRes.data : [];
}

function formatRoleBadge(rol) {
  const isAdmin = String(rol || '').toLowerCase() === 'administrador';
  return isAdmin
    ? '<span class="px-2 py-0.5 rounded bg-[#E4ECF5] text-[#1F3A5F] font-semibold text-xs">Administrador</span>'
    : '<span class="px-2 py-0.5 rounded bg-[#FDF1DC] text-[#8A5300] font-semibold text-xs">Barbero</span>';
}

export function renderConfiguracionPage() {
  return `
    <div class="flex flex-col gap-6 w-full animate-fadeIn">
      <!-- HEADER DE CONFIGURACIÓN -->
      <section class="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-2 border-b border-[#D5CBB8]">
        <div class="flex flex-col gap-1">
          <h1 class="font-serif text-2xl sm:text-3xl font-bold text-[#1C1C1C] tracking-tight">
            Configuración del Negocio
          </h1>
          <p class="text-xs text-[#57534E]">
            Administra los datos públicos de la sede, parámetros operativos de reserva y cuentas de acceso.
          </p>
        </div>
        <div class="flex items-center gap-2 self-start md:self-auto shrink-0 px-3 py-1.5 rounded-lg bg-[#E8DFCE] text-[#4F4A42] border border-[#D5CBB8] text-xs">
          <span class="material-symbols-outlined text-[16px]" aria-hidden="true">store</span>
          <span class="font-mono font-semibold">${sedeConfig.nombreComercial}</span>
        </div>
      </section>

      <!-- OPERATIONAL DOUBLE RULE -->
      <div aria-hidden="true" class="w-full flex flex-col gap-[3px] -mt-2">
        <div class="h-[2px] bg-[#1C1C1C] w-full"></div>
        <div class="h-[1px] bg-[#8B1E1E] w-full"></div>
      </div>

      ${configErrorMsg ? `
        <div role="alert" class="p-3 rounded-lg bg-[#FCE8E6] border border-[#B3261E]/30 text-xs font-semibold text-[#B3261E] flex items-center gap-2">
          <span class="material-symbols-outlined text-[18px]" aria-hidden="true">error</span>
          <span>${configErrorMsg}</span>
        </div>
      ` : ''}

      ${configSuccessMsg ? `
        <div role="status" class="p-3 rounded-lg bg-[#E3EFE7] border border-[#235D3A]/30 text-xs font-semibold text-[#235D3A] flex items-center gap-2">
          <span class="material-symbols-outlined text-[18px]" aria-hidden="true">check_circle</span>
          <span>${configSuccessMsg}</span>
        </div>
      ` : ''}

      <!-- GRID PRINCIPAL DE 2 COLUMNAS -->
      <div class="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <!-- TARJETA 1: IDENTIDAD Y SEDE (7 cols) -->
        <article class="lg:col-span-7 bg-[#FAF7F2] border border-[#D5CBB8] rounded-xl p-6 shadow-xs flex flex-col gap-6">
          <div class="flex items-start gap-3.5 pb-4 border-b border-[#D5CBB8]">
            <div class="w-10 h-10 rounded-lg bg-[#1F3A5F] text-white flex items-center justify-center shrink-0 shadow-xs">
              <span class="material-symbols-outlined text-[22px]" aria-hidden="true">storefront</span>
            </div>
            <div>
              <h2 class="font-serif text-lg font-bold text-[#1C1C1C]">Información Pública de la Sede</h2>
              <p class="text-xs text-[#57534E]">Visible en el portal de reservas para clientes y encabezado.</p>
            </div>
          </div>

          <form id="form-config-sede" class="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div class="flex flex-col gap-1.5">
              <label for="cfg-nombre" class="font-semibold text-[#1C1C1C]">Nombre comercial <span class="text-[#B3261E]">*</span></label>
              <input
                type="text"
                id="cfg-nombre"
                required
                value="${sedeConfig.nombreComercial}"
                class="h-10 px-3 bg-white border border-[#8C8272] rounded-lg text-xs text-[#1C1C1C] focus:outline-none focus:ring-2 focus:ring-[#1F3A5F]"
              />
            </div>

            <div class="flex flex-col gap-1.5">
              <label for="cfg-eslogan" class="font-semibold text-[#1C1C1C]">Eslogan de marca</label>
              <input
                type="text"
                id="cfg-eslogan"
                value="${sedeConfig.eslogan}"
                class="h-10 px-3 bg-white border border-[#8C8272] rounded-lg text-xs text-[#1C1C1C] focus:outline-none focus:ring-2 focus:ring-[#1F3A5F]"
              />
            </div>

            <div class="flex flex-col gap-1.5 sm:col-span-2">
              <label for="cfg-direccion" class="font-semibold text-[#1C1C1C]">Dirección física de atención <span class="text-[#B3261E]">*</span></label>
              <input
                type="text"
                id="cfg-direccion"
                required
                value="${sedeConfig.direccionFisica}"
                class="h-10 px-3 bg-white border border-[#8C8272] rounded-lg text-xs text-[#1C1C1C] focus:outline-none focus:ring-2 focus:ring-[#1F3A5F]"
              />
            </div>

            <div class="flex flex-col gap-1.5">
              <label for="cfg-telefono" class="font-semibold text-[#1C1C1C]">Teléfono o WhatsApp de contacto</label>
              <input
                type="text"
                id="cfg-telefono"
                value="${sedeConfig.telefonoContacto}"
                class="h-10 px-3 bg-white border border-[#8C8272] rounded-lg text-xs text-[#1C1C1C] font-mono focus:outline-none focus:ring-2 focus:ring-[#1F3A5F]"
              />
            </div>

            <div class="flex flex-col gap-1.5">
              <label for="cfg-correo" class="font-semibold text-[#1C1C1C]">Correo de contacto</label>
              <input
                type="email"
                id="cfg-correo"
                value="${sedeConfig.correoContacto}"
                class="h-10 px-3 bg-white border border-[#8C8272] rounded-lg text-xs text-[#1C1C1C] focus:outline-none focus:ring-2 focus:ring-[#1F3A5F]"
              />
            </div>

            <div class="flex flex-col gap-1.5">
              <label for="cfg-horario" class="font-semibold text-[#1C1C1C]">Horario general publicado</label>
              <input
                type="text"
                id="cfg-horario"
                value="${sedeConfig.horarioGeneralTexto}"
                class="h-10 px-3 bg-white border border-[#8C8272] rounded-lg text-xs text-[#1C1C1C] focus:outline-none focus:ring-2 focus:ring-[#1F3A5F]"
              />
            </div>

            <div class="flex flex-col gap-1.5">
              <label for="cfg-zona" class="font-semibold text-[#1C1C1C]">Zona horaria</label>
              <input
                type="text"
                id="cfg-zona"
                disabled
                value="${sedeConfig.zonaHoraria} (UTC-5 Colombia)"
                class="h-10 px-3 bg-[#E8DFCE]/60 border border-[#D5CBB8] rounded-lg text-xs font-mono text-[#57534E] cursor-not-allowed"
              />
            </div>

            <div class="sm:col-span-2 pt-3 border-t border-[#D5CBB8] flex justify-end">
              ${renderActionButton({
                id: 'btn-guardar-sede',
                type: 'submit',
                variant: 'primary',
                icon: 'save',
                label: 'Guardar Datos de Sede'
              })}
            </div>
          </form>
        </article>

        <!-- TARJETA 2: POLÍTICAS Y REGLAS OPERATIVAS (5 cols) -->
        <article class="lg:col-span-5 flex flex-col gap-6">
          <!-- Reglas de Citas: Parámetros Editables vs Reglas Fijas -->
          <div class="bg-[#FAF7F2] border border-[#D5CBB8] rounded-xl p-6 shadow-xs flex flex-col gap-4">
            <div class="flex items-center gap-3 pb-3 border-b border-[#D5CBB8]">
              <div class="w-9 h-9 rounded-lg bg-[#1F3A5F] text-white flex items-center justify-center shrink-0">
                <span class="material-symbols-outlined text-[20px]" aria-hidden="true">tune</span>
              </div>
              <div>
                <h3 class="font-serif text-base font-bold text-[#1C1C1C]">Reglas de Agendamiento</h3>
                <p class="text-xs text-[#57534E]">Parámetros operativos de reservas online</p>
              </div>
            </div>

            ${rulesSuccessMsg ? `
              <div role="status" class="p-2.5 rounded-lg bg-[#E3EFE7] border border-[#235D3A]/30 text-xs font-semibold text-[#235D3A]">
                ${rulesSuccessMsg}
              </div>
            ` : ''}

            <form id="form-config-reglas" class="flex flex-col gap-3 text-xs">
              <div class="p-3 bg-white border border-[#D5CBB8] rounded-lg flex flex-col gap-1.5">
                <div class="flex items-center justify-between gap-2">
                  <label for="cfg-min-anticipacion" class="font-semibold text-[#1C1C1C]">Anticipación mínima para reservar</label>
                  <span class="text-[11px] font-semibold text-[#1F3A5F]">Editable</span>
                </div>
                <div class="flex items-center gap-2">
                  <input
                    type="number"
                    id="cfg-min-anticipacion"
                    min="0"
                    step="15"
                    max="1440"
                    value="${sedeConfig.minutosMinAnticipacion}"
                    class="h-9 w-28 px-3 bg-white border border-[#8C8272] rounded-lg font-mono font-bold text-xs text-[#1C1C1C]"
                  />
                  <span class="text-xs text-[#57534E]">minutos antes del turno</span>
                </div>
              </div>

              <div class="p-3 bg-white border border-[#D5CBB8] rounded-lg flex flex-col gap-1.5">
                <div class="flex items-center justify-between gap-2">
                  <label for="cfg-dias-max" class="font-semibold text-[#1C1C1C]">Horizonte máximo de agenda</label>
                  <span class="text-[11px] font-semibold text-[#1F3A5F]">Editable</span>
                </div>
                <div class="flex items-center gap-2">
                  <input
                    type="number"
                    id="cfg-dias-max"
                    min="1"
                    max="90"
                    value="${sedeConfig.diasMaxAnticipacion}"
                    class="h-9 w-28 px-3 bg-white border border-[#8C8272] rounded-lg font-mono font-bold text-xs text-[#1C1C1C]"
                  />
                  <span class="text-xs text-[#57534E]">días hacia adelante</span>
                </div>
              </div>

              <div class="p-3 bg-white border border-[#D5CBB8] rounded-lg flex flex-col gap-1.5">
                <div class="flex items-center justify-between gap-2">
                  <label for="cfg-estado-inicial" class="font-semibold text-[#1C1C1C]">Estado inicial de citas web</label>
                  <span class="text-[11px] font-semibold text-[#1F3A5F]">Editable</span>
                </div>
                <select
                  id="cfg-estado-inicial"
                  class="h-9 px-3 bg-white border border-[#8C8272] rounded-lg text-xs font-medium text-[#1C1C1C]"
                >
                  <option value="pendiente" ${sedeConfig.estadoInicialCita === 'pendiente' ? 'selected' : ''}>Pendiente de confirmación</option>
                  <option value="confirmada" ${sedeConfig.estadoInicialCita === 'confirmada' ? 'selected' : ''}>Confirmada automáticamente</option>
                </select>
              </div>

              <div class="flex justify-end pt-1">
                ${renderActionButton({
                  id: 'btn-guardar-reglas',
                  type: 'submit',
                  variant: 'outline',
                  icon: 'check',
                  label: 'Guardar Parámetros'
                })}
              </div>
            </form>

            <!-- Reglas Fijas de Solo Lectura -->
            <div class="pt-3 border-t border-[#D5CBB8] flex flex-col gap-2.5 text-xs">
              <div class="flex items-center gap-1.5 text-xs font-semibold text-[#57534E]">
                <span class="material-symbols-outlined text-[15px]" aria-hidden="true">lock</span>
                <span>Políticas Fijas del Sistema (Solo lectura)</span>
              </div>

              <div class="p-3 bg-[#E8DFCE]/45 border border-[#D5CBB8] rounded-lg flex items-center justify-between gap-2">
                <div>
                  <span class="font-semibold text-[#1C1C1C] block">Bloques de Atención</span>
                  <span class="text-xs text-[#57534E]">Unidad base indivisible de la grilla horaria</span>
                </div>
                <span class="font-mono font-bold text-xs bg-white border border-[#D5CBB8] px-2.5 py-1 rounded shrink-0">30 min</span>
              </div>

              <div class="p-3 bg-[#E8DFCE]/45 border border-[#D5CBB8] rounded-lg flex items-center justify-between gap-2">
                <div>
                  <span class="font-semibold text-[#1C1C1C] block">Tratamiento de Datos (Ley 1581)</span>
                  <span class="text-xs text-[#57534E]">Autorización obligatoria en reservas públicas</span>
                </div>
                <span class="font-mono font-bold text-xs bg-[#E3EFE7] text-[#235D3A] px-2.5 py-1 rounded shrink-0">Activo</span>
              </div>
            </div>
          </div>

          <!-- Usuarios reales con acceso -->
          <div class="bg-[#FAF7F2] border border-[#D5CBB8] rounded-xl p-6 shadow-xs flex flex-col gap-3">
            <div class="flex items-center justify-between gap-2 pb-2 border-b border-[#D5CBB8]">
              <h3 class="font-serif text-base font-bold text-[#1C1C1C]">Usuarios con Acceso</h3>
              <a href="#barberos" class="text-xs font-semibold text-[#1F3A5F] hover:underline">Gestionar barberos →</a>
            </div>
            <div class="flex flex-col gap-2 text-xs">
              ${cachedUsuarios.length === 0 ? `
                <div class="p-3 bg-white border border-[#D5CBB8] rounded-lg text-[#57534E]">
                  No se pudieron cargar las cuentas de usuario en este momento.
                </div>
              ` : cachedUsuarios.map(u => `
                <div class="p-2.5 bg-white border border-[#D5CBB8] rounded-lg flex items-center justify-between gap-2">
                  <div class="min-w-0">
                    <strong class="text-[#1C1C1C] block truncate font-mono">${u.correo}</strong>
                    <span class="text-xs text-[#57534E]">Estado: ${u.estado === 'activo' ? 'Activo' : 'Inactivo'}</span>
                  </div>
                  ${formatRoleBadge(u.rol)}
                </div>
              `).join('')}
            </div>
          </div>
        </article>
      </div>
    </div>
  `;
}

export function attachConfiguracionListeners(refresh) {
  const form = document.getElementById('form-config-sede');
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      configSuccessMsg = '';
      configErrorMsg = '';
      rulesSuccessMsg = '';

      if (!sedeConfig.id) {
        configErrorMsg = 'No se identificó la sede activa para actualizar.';
        if (typeof refresh === 'function') refresh();
        return;
      }

      const nombreComercial = document.getElementById('cfg-nombre')?.value.trim();
      const eslogan = document.getElementById('cfg-eslogan')?.value.trim() || '';
      const direccionFisica = document.getElementById('cfg-direccion')?.value.trim();
      const telefonoContacto = document.getElementById('cfg-telefono')?.value.trim() || '';
      const correoContacto = document.getElementById('cfg-correo')?.value.trim() || '';
      const horarioGeneralTexto = document.getElementById('cfg-horario')?.value.trim() || '';

      if (!nombreComercial || !direccionFisica) {
        configErrorMsg = 'El nombre comercial y la dirección física son obligatorios.';
        if (typeof refresh === 'function') refresh();
        return;
      }

      const btn = document.getElementById('btn-guardar-sede');
      if (btn) btn.disabled = true;

      try {
        await sedesService.actualizarSede(sedeConfig.id, {
          nombreComercial,
          eslogan,
          direccionFisica,
          telefonoContacto,
          correoContacto,
          horarioGeneralTexto
        });

        Object.assign(sedeConfig, {
          nombreComercial,
          eslogan,
          direccionFisica,
          telefonoContacto,
          correoContacto,
          horarioGeneralTexto
        });
        configSuccessMsg = 'Datos de sede actualizados y sincronizados con el sistema.';
        emitDataMutation('sede', 'update');
      } catch (err) {
        configErrorMsg = err.message || 'No fue posible guardar los datos de la sede.';
      } finally {
        if (btn) btn.disabled = false;
        if (typeof refresh === 'function') refresh();
      }
    });
  }

  const formReglas = document.getElementById('form-config-reglas');
  if (formReglas) {
    formReglas.addEventListener('submit', async (e) => {
      e.preventDefault();
      configSuccessMsg = '';
      configErrorMsg = '';
      rulesSuccessMsg = '';

      if (!sedeConfig.id) {
        configErrorMsg = 'No se identificó la sede activa para actualizar.';
        if (typeof refresh === 'function') refresh();
        return;
      }

      const minutosMinAnticipacion = Math.max(0, parseInt(document.getElementById('cfg-min-anticipacion')?.value, 10) || 0);
      const diasMaxAnticipacion = Math.max(1, Math.min(90, parseInt(document.getElementById('cfg-dias-max')?.value, 10) || 14));
      const estadoInicialCita = document.getElementById('cfg-estado-inicial')?.value || 'pendiente';

      const btn = document.getElementById('btn-guardar-reglas');
      if (btn) btn.disabled = true;

      try {
        await sedesService.actualizarSede(sedeConfig.id, {
          minutosMinAnticipacion,
          diasMaxAnticipacion,
          estadoInicialCita
        });

        Object.assign(sedeConfig, {
          minutosMinAnticipacion,
          diasMaxAnticipacion,
          estadoInicialCita
        });
        rulesSuccessMsg = 'Parámetros de agendamiento actualizados correctamente.';
        emitDataMutation('sede', 'update');
      } catch (err) {
        configErrorMsg = err.message || 'No fue posible actualizar las reglas de agendamiento.';
      } finally {
        if (btn) btn.disabled = false;
        if (typeof refresh === 'function') refresh();
      }
    });
  }
}
