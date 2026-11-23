/**
 * SmartBarber - Mi Perfil y Configuración Personal (Barbero y Administrador)
 * Conforme a DESIGN.md: WCAG 2.1 AA, tokens Heritage, esquema de comisión de solo lectura (RN-12),
 * edición de datos permitidos y cambio seguro de contraseña.
 */

import { barberosService, authService } from '../../services/index.js';

let cachedProfile = null;
let profileSuccessMsg = '';
let profileErrorMsg = '';
let passwordSuccessMsg = '';
let passwordErrorMsg = '';

export async function loadPerfilData() {
  profileSuccessMsg = '';
  profileErrorMsg = '';
  passwordSuccessMsg = '';
  passwordErrorMsg = '';

  try {
    const res = await barberosService.getMiPerfil();
    if (res?.ok && res.data) {
      cachedProfile = res.data;
    }
  } catch (err) {
    console.warn('⚠️ No se pudo cargar el perfil:', err.message);
  }
}

export function renderPerfilPage() {
  const user = authService.getCurrentUser() || {};
  const isBarbero = user.rol === 'barbero';
  const data = cachedProfile || {};
  const b = data.barbero || {};
  const horarios = data.horarios || [];

  const nombreCompleto = b.nombreCompleto || user.nombreCompleto || user.nombre || 'Personal';
  const nombrePublico = b.nombrePublico || nombreCompleto;
  const correo = b.correo || user.correo || '';
  const telefono = b.telefono || '';
  const foto = b.fotoUrl || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=160&auto=format&fit=crop&q=80';
  const biografia = b.biografiaBreve || '';
  const comision = b.porcentajeComision || 50;
  const sillon = b.sillon || 'Sillón 01';
  const estado = b.estado || 'activo';

  const diasSemanaMap = {
    1: 'Lunes',
    2: 'Martes',
    3: 'Miércoles',
    4: 'Jueves',
    5: 'Viernes',
    6: 'Sábado',
    7: 'Domingo'
  };

  return `
    <div class="flex flex-col gap-6 w-full max-w-4xl mx-auto animate-fadeIn">
      <!-- HEADER -->
      <section class="flex flex-col gap-1">
        <nav aria-label="Ruta de navegación" class="flex items-center gap-2 text-xs text-[#6B645A]">
          <span>SmartBarber</span>
          <span>/</span>
          <span class="text-[#1C1C1C] font-semibold">Mi Perfil</span>
        </nav>
        <h1 class="font-serif text-2xl sm:text-3xl font-bold text-[#1C1C1C] tracking-tight">
          Mi Perfil & Ajustes Personales
        </h1>
        <p class="text-xs text-[#6B645A]">
          Gestiona tu información pública de atención, consulta tu esquema de comisión asignado y tus horarios laborales.
        </p>
      </section>

      <!-- TARJETA PRINCIPAL DE IDENTIDAD -->
      <section class="bg-[#FAF7F2] border border-[#D5CBB8] rounded-xl p-6 shadow-xs flex flex-col md:flex-row items-center md:items-start gap-6">
        <div class="relative shrink-0">
          <img
            id="profile-avatar-preview"
            src="${foto}"
            alt="${nombreCompleto}"
            class="w-24 h-24 rounded-full object-cover border-2 border-[#D5CBB8] shadow-sm"
          />
          <span
            class="absolute bottom-1 right-1 w-4 h-4 rounded-full ${estado === 'activo' ? 'bg-[#235D3A]' : 'bg-[#6B645A]'} border-2 border-white"
            title="${estado === 'activo' ? 'Cuenta Activa' : 'Inactivo'}"
          ></span>
        </div>

        <div class="flex-1 flex flex-col items-center md:items-start text-center md:text-left gap-1.5 min-w-0">
          <div class="flex flex-wrap items-center justify-center md:justify-start gap-2">
            <h2 class="font-serif text-xl sm:text-2xl font-bold text-[#1C1C1C]">${nombreCompleto}</h2>
            <span class="px-2.5 py-0.5 rounded-full text-[11px] font-bold ${isBarbero ? 'bg-[#8B1E1E] text-white' : 'bg-[#1F3A5F] text-white'}">
              ${isBarbero ? 'Barbero' : 'Administrador'}
            </span>
            ${isBarbero ? `
              <span class="px-2 py-0.5 rounded bg-[#E4ECF5] text-[#1F3A5F] text-[11px] font-semibold">
                ${sillon}
              </span>
            ` : ''}
          </div>

          <p class="text-xs font-mono text-[#6B645A]">${correo}</p>

          ${isBarbero ? `
            <!-- ESQUEMA DE COMISIÓN INMUTABLE POR EL BARBERO (RN-12) -->
            <div class="mt-2 inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-white border border-[#D5CBB8] text-xs shadow-2xs">
              <span class="material-symbols-outlined text-[18px] text-[#1F3A5F]">percent</span>
              <span>Esquema de Comisión Asignado: <strong class="font-mono text-sm text-[#1F3A5F] font-bold">${comision}%</strong></span>
              <span class="text-[10px] text-[#6B645A] italic">(Fijado por administración · RN-12)</span>
            </div>
          ` : ''}
        </div>
      </section>

      <!-- GRID DE FORMULARIOS: DATOS PERSONALES & SEGURIDAD -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
        <!-- FORMULARIO 1: DATOS PERSONALES EDITABLES -->
        <section class="bg-[#FAF7F2] border border-[#D5CBB8] rounded-xl p-5 shadow-xs flex flex-col gap-4">
          <div class="flex items-center gap-2 pb-3 border-b border-[#D5CBB8]">
            <span class="material-symbols-outlined text-[20px] text-[#1F3A5F]">badge</span>
            <h3 class="font-serif text-base font-bold text-[#1C1C1C]">Datos Personales</h3>
          </div>

          ${profileSuccessMsg ? `
            <div class="p-3 rounded-lg bg-[#E3EFE7] text-[#235D3A] text-xs font-semibold flex items-center gap-2">
              <span class="material-symbols-outlined text-[18px]">check_circle</span>
              <span>${profileSuccessMsg}</span>
            </div>
          ` : ''}

          ${profileErrorMsg ? `
            <div class="p-3 rounded-lg bg-[#FCE8E6] text-[#B3261E] text-xs font-semibold flex items-center gap-2">
              <span class="material-symbols-outlined text-[18px]">error</span>
              <span>${profileErrorMsg}</span>
            </div>
          ` : ''}

          <form id="form-perfil-datos" class="flex flex-col gap-3 text-xs">
            <div class="flex flex-col gap-1">
              <label class="font-semibold text-[#1C1C1C]">Nombre Completo (Identificación)</label>
              <input
                type="text"
                disabled
                value="${nombreCompleto}"
                class="h-10 px-3 bg-[#E8DFCE] border border-[#D5CBB8] rounded-lg text-xs text-[#6B645A] cursor-not-allowed font-medium"
                title="Solo el administrador puede modificar el nombre oficial de registro"
              />
              <span class="text-[10px] text-[#6B645A]">Inmutable por el barbero · Solo administrador</span>
            </div>

            <div class="flex flex-col gap-1">
              <label class="font-semibold text-[#1C1C1C]" for="input-perfil-nombre-publico">Nombre Público / Alias de Atención</label>
              <input
                type="text"
                id="input-perfil-nombre-publico"
                value="${nombrePublico}"
                maxlength="80"
                placeholder="Ej. Mateo Barber"
                class="h-10 px-3 bg-white border border-[#8C8272] rounded-lg text-xs text-[#1C1C1C] focus:outline-none focus:ring-2 focus:ring-[#1F3A5F]"
              />
              <span class="text-[10px] text-[#6B645A]">Visible para clientes en la Landing Page pública</span>
            </div>

            <div class="flex flex-col gap-1">
              <label class="font-semibold text-[#1C1C1C]" for="input-perfil-telefono">Teléfono / WhatsApp de Contacto</label>
              <input
                type="tel"
                id="input-perfil-telefono"
                value="${telefono}"
                pattern="^3\\d{9}$"
                placeholder="3101234567"
                class="h-10 px-3 bg-white border border-[#8C8272] rounded-lg text-xs text-[#1C1C1C] font-mono focus:outline-none focus:ring-2 focus:ring-[#1F3A5F]"
              />
            </div>

            <div class="flex flex-col gap-1">
              <label class="font-semibold text-[#1C1C1C]" for="input-perfil-foto">URL de Foto de Perfil (JPG, PNG, WebP &le; 2MB)</label>
              <input
                type="url"
                id="input-perfil-foto"
                value="${foto}"
                placeholder="https://images.unsplash.com/..."
                class="h-10 px-3 bg-white border border-[#8C8272] rounded-lg text-xs text-[#1C1C1C] focus:outline-none focus:ring-2 focus:ring-[#1F3A5F]"
              />
            </div>

            <div class="flex flex-col gap-1">
              <label class="font-semibold text-[#1C1C1C]" for="input-perfil-bio">Biografía Breve / Especialidad</label>
              <textarea
                id="input-perfil-bio"
                rows="3"
                maxlength="200"
                placeholder="Especialista en desvanecidos clásicos y perfilado de barba con toalla caliente..."
                class="p-3 bg-white border border-[#8C8272] rounded-lg text-xs text-[#1C1C1C] focus:outline-none focus:ring-2 focus:ring-[#1F3A5F] resize-none"
              >${biografia}</textarea>
              <span class="text-[10px] text-[#6B645A] text-right">Máximo 200 caracteres</span>
            </div>

            <div class="flex justify-end pt-2">
              <button
                type="submit"
                id="btn-guardar-perfil"
                class="min-h-[44px] px-5 py-2 rounded-lg bg-[#1F3A5F] hover:bg-[#162B47] text-white font-semibold text-xs transition-colors shadow-xs"
              >
                Guardar Datos Personales
              </button>
            </div>
          </form>
        </section>

        <!-- FORMULARIO 2: CAMBIO SEGURO DE CONTRASEÑA -->
        <section class="bg-[#FAF7F2] border border-[#D5CBB8] rounded-xl p-5 shadow-xs flex flex-col gap-4">
          <div class="flex items-center gap-2 pb-3 border-b border-[#D5CBB8]">
            <span class="material-symbols-outlined text-[20px] text-[#8B1E1E]">lock_reset</span>
            <h3 class="font-serif text-base font-bold text-[#1C1C1C]">Seguridad y Contraseña</h3>
          </div>

          ${passwordSuccessMsg ? `
            <div class="p-3 rounded-lg bg-[#E3EFE7] text-[#235D3A] text-xs font-semibold flex items-center gap-2">
              <span class="material-symbols-outlined text-[18px]">check_circle</span>
              <span>${passwordSuccessMsg}</span>
            </div>
          ` : ''}

          ${passwordErrorMsg ? `
            <div class="p-3 rounded-lg bg-[#FCE8E6] text-[#B3261E] text-xs font-semibold flex items-center gap-2">
              <span class="material-symbols-outlined text-[18px]">error</span>
              <span>${passwordErrorMsg}</span>
            </div>
          ` : ''}

          <form id="form-perfil-password" class="flex flex-col gap-3 text-xs">
            <div class="flex flex-col gap-1">
              <label class="font-semibold text-[#1C1C1C]" for="input-pass-actual">Contraseña Actual <span class="text-[#8B1E1E]">*</span></label>
              <input
                type="password"
                id="input-pass-actual"
                required
                class="h-10 px-3 bg-white border border-[#8C8272] rounded-lg text-xs text-[#1C1C1C] focus:outline-none focus:ring-2 focus:ring-[#1F3A5F]"
              />
            </div>

            <div class="flex flex-col gap-1">
              <label class="font-semibold text-[#1C1C1C]" for="input-pass-nueva">Nueva Contraseña <span class="text-[#8B1E1E]">*</span></label>
              <input
                type="password"
                id="input-pass-nueva"
                required
                minlength="8"
                placeholder="Mínimo 8 caracteres"
                class="h-10 px-3 bg-white border border-[#8C8272] rounded-lg text-xs text-[#1C1C1C] focus:outline-none focus:ring-2 focus:ring-[#1F3A5F]"
              />
            </div>

            <div class="flex flex-col gap-1">
              <label class="font-semibold text-[#1C1C1C]" for="input-pass-confirm">Confirmar Nueva Contraseña <span class="text-[#8B1E1E]">*</span></label>
              <input
                type="password"
                id="input-pass-confirm"
                required
                minlength="8"
                class="h-10 px-3 bg-white border border-[#8C8272] rounded-lg text-xs text-[#1C1C1C] focus:outline-none focus:ring-2 focus:ring-[#1F3A5F]"
              />
            </div>

            <div class="p-3 rounded-lg bg-[#F2EBDD] border border-[#D5CBB8] text-[11px] text-[#4F4A42] flex flex-col gap-1">
              <span class="font-semibold text-[#1C1C1C]">Requisitos de seguridad (RNF-09 / RNF-10):</span>
              <span>• Mínimo 8 caracteres.</span>
              <span>• Al cambiarla, se cerrarán otras sesiones activas en otros navegadores.</span>
            </div>

            <div class="flex justify-end pt-2">
              <button
                type="submit"
                id="btn-cambiar-password"
                class="min-h-[44px] px-5 py-2 rounded-lg bg-[#8B1E1E] hover:bg-[#6E1616] text-white font-semibold text-xs transition-colors shadow-xs"
              >
                Actualizar Contraseña
              </button>
            </div>
          </form>
        </section>
      </div>

      ${isBarbero ? `
        <!-- SECCIÓN 3: HORARIOS SEMANALES ASIGNADOS (SOLO LECTURA PARA BARBERO) -->
        <section class="bg-[#FAF7F2] border border-[#D5CBB8] rounded-xl p-5 shadow-xs flex flex-col gap-4">
          <div class="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-[#D5CBB8]">
            <div class="flex items-center gap-2">
              <span class="material-symbols-outlined text-[20px] text-[#1F3A5F]">calendar_month</span>
              <h3 class="font-serif text-base font-bold text-[#1C1C1C]">Mi Horario Laboral Semanal</h3>
            </div>
            <span class="text-xs text-[#6B645A] italic">Configurado por la administración en bloques de 30 minutos</span>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-3">
            ${[1, 2, 3, 4, 5, 6, 7].map(diaNum => {
              const h = horarios.find(item => item.diaSemana === diaNum);
              const diaNombre = diasSemanaMap[diaNum] || `Día ${diaNum}`;
              const esDescanso = !h || h.esDescanso;

              return `
                <div class="flex flex-col p-3 rounded-lg border ${esDescanso ? 'bg-[#F2EBDD]/60 border-[#D5CBB8]' : 'bg-white border-[#1F3A5F]/30 shadow-2xs'} text-center gap-1.5">
                  <span class="text-xs font-bold text-[#1C1C1C]">${diaNombre}</span>
                  ${esDescanso ? `
                    <span class="text-[11px] text-[#8A5300] font-semibold bg-[#FDF1DC] px-2 py-1 rounded">
                      Descanso
                    </span>
                  ` : `
                    <div class="flex flex-col font-mono text-[11px] text-[#1F3A5F] font-bold">
                      <span>${h.horaInicio?.slice(0, 5) || '09:00'}</span>
                      <span class="text-[10px] text-[#6B645A] font-normal">a</span>
                      <span>${h.horaFin?.slice(0, 5) || '19:00'}</span>
                    </div>
                  `}
                </div>
              `;
            }).join('')}
          </div>
        </section>
      ` : ''}
    </div>
  `;
}

export function attachPerfilListeners(refresh) {
  // 1. Guardar Datos Personales
  const formDatos = document.getElementById('form-perfil-datos');
  if (formDatos) {
    formDatos.addEventListener('submit', async (e) => {
      e.preventDefault();
      profileSuccessMsg = '';
      profileErrorMsg = '';

      const nombrePublico = document.getElementById('input-perfil-nombre-publico')?.value.trim();
      const telefono = document.getElementById('input-perfil-telefono')?.value.trim();
      const fotoUrl = document.getElementById('input-perfil-foto')?.value.trim();
      const biografiaBreve = document.getElementById('input-perfil-bio')?.value.trim();

      const btn = document.getElementById('btn-guardar-perfil');
      if (btn) btn.disabled = true;

      try {
        const res = await barberosService.actualizarMiPerfil({
          nombrePublico,
          telefono,
          fotoUrl: fotoUrl || null,
          biografiaBreve: biografiaBreve || null
        });

        if (res?.ok || res?.success) {
          profileSuccessMsg = 'Tus datos personales fueron actualizados correctamente.';
          await loadPerfilData();
        } else {
          profileErrorMsg = res?.error?.message || 'No fue posible guardar los cambios.';
        }
      } catch (err) {
        profileErrorMsg = err.message || 'Error de comunicación con el servidor.';
      } finally {
        if (btn) btn.disabled = false;
        if (typeof refresh === 'function') refresh();
      }
    });
  }

  // 2. Cambio Seguro de Contraseña
  const formPass = document.getElementById('form-perfil-password');
  if (formPass) {
    formPass.addEventListener('submit', async (e) => {
      e.preventDefault();
      passwordSuccessMsg = '';
      passwordErrorMsg = '';

      const contrasenaActual = document.getElementById('input-pass-actual')?.value;
      const nuevaContrasena = document.getElementById('input-pass-nueva')?.value;
      const confirmar = document.getElementById('input-pass-confirm')?.value;

      if (nuevaContrasena !== confirmar) {
        passwordErrorMsg = 'La confirmación de la contraseña no coincide.';
        if (typeof refresh === 'function') refresh();
        return;
      }

      if (nuevaContrasena.length < 8) {
        passwordErrorMsg = 'La nueva contraseña debe tener al menos 8 caracteres.';
        if (typeof refresh === 'function') refresh();
        return;
      }

      const btn = document.getElementById('btn-cambiar-password');
      if (btn) btn.disabled = true;

      try {
        const user = authService.getCurrentUser();
        const res = await authService.cambiarContrasena({
          usuarioId: user?.id,
          contrasenaActual,
          nuevaContrasena
        });

        if (res?.ok || res?.success) {
          passwordSuccessMsg = 'Tu contraseña ha sido actualizada con éxito.';
          formPass.reset();
        } else {
          passwordErrorMsg = res?.error?.message || 'Error al cambiar la contraseña. Verifica tu contraseña actual.';
        }
      } catch (err) {
        passwordErrorMsg = err.message || 'Error al cambiar la contraseña.';
      } finally {
        if (btn) btn.disabled = false;
        if (typeof refresh === 'function') refresh();
      }
    });
  }
}
