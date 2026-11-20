/**
 * SmartBarber - Módulo de Configuración de Sede y Parámetros
 * Fiel a docs/stitch/smartbarber_configuraci_n_de_sede_y_usuarios
 * Identidad pública de la sede, parámetros operativos (bloques de 30 min, antelación)
 * y usuarios con roles administrativos (Admin vs. Barbero).
 */

let sedeConfig = {
  nombreComercial: 'SmartBarber Bogotá',
  eslogan: 'El oficio clásico del buen corte tradicional',
  direccion: 'Carrera 3 # 12-42, La Candelaria, Bogotá D.C.',
  telefono: '+57 (1) 341 5520',
  whatsapp: '+57 312 458 9210',
  capacidadSillones: 3,
  duracionBloqueMinutos: 30,
  antelacionMinimaHoras: 2,
  ley1581Aceptada: true
};

export function renderConfiguracionPage() {
  return `
    <div class="flex flex-col gap-6 w-full animate-fadeIn">
      <!-- HEADER DE CONFIGURACIÓN -->
      <section class="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-2 border-b border-[#D5CBB8]">
        <div class="flex flex-col gap-1">
          <nav aria-label="Ruta de navegación" class="flex items-center gap-2 text-xs text-[#6B645A]">
            <span>SmartBarber</span>
            <span>/</span>
            <span>Configuración</span>
            <span>/</span>
            <span class="text-[#1C1C1C] font-semibold">Identidad y Parámetros</span>
          </nav>
          <h1 class="font-serif text-2xl sm:text-3xl font-bold text-[#1C1C1C] tracking-tight">
            Configuración del Negocio
          </h1>
          <p class="font-sans text-xs sm:text-sm text-[#4F4A42]">
            Los cambios de sede se reflejan en el Portal Público en tiempo real (PWA).
          </p>
        </div>
        <div class="flex items-center gap-2 self-start md:self-auto shrink-0 px-3 py-1.5 rounded-lg bg-[#E8DFCE] text-[#4F4A42] border border-[#D5CBB8] text-xs">
          <span class="material-symbols-outlined text-[16px]">store</span>
          <span class="font-mono">Sede Principal · La Candelaria</span>
        </div>
      </section>

      <!-- OPERATIONAL DOUBLE RULE -->
      <div aria-hidden="true" class="w-full flex flex-col gap-[3px] -mt-2">
        <div class="h-[2px] bg-[#1C1C1C] w-full"></div>
        <div class="h-[1px] bg-[#8B1E1E] w-full"></div>
      </div>

      <!-- GRID PRINCIPAL DE 2 COLUMNAS (60% / 40%) -->
      <div class="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <!-- TARJETA 1: IDENTIDAD Y SEDE (7 cols) -->
        <article class="lg:col-span-7 bg-[#FAF7F2] border border-[#D5CBB8] rounded-xl p-6 shadow-xs flex flex-col gap-6">
          <div class="flex items-start gap-3.5 pb-4 border-b border-[#D5CBB8]">
            <div class="w-10 h-10 rounded-lg bg-[#1F3A5F] text-white flex items-center justify-center shrink-0 shadow-xs">
              <span class="material-symbols-outlined text-[22px]">storefront</span>
            </div>
            <div>
              <h2 class="font-serif text-lg font-bold text-[#1C1C1C]">Información Pública de la Sede</h2>
              <p class="text-xs text-[#6B645A]">Datos visibles en el Portal de Clientes y confirmaciones de citas.</p>
            </div>
          </div>

          <form id="form-config-sede" class="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div class="flex flex-col gap-1.5">
              <label class="font-semibold text-[#1C1C1C]">Nombre comercial <span class="text-[#8B1E1E]">*</span></label>
              <input
                type="text"
                id="cfg-nombre"
                value="${sedeConfig.nombreComercial}"
                class="h-10 px-3 bg-white border border-[#8C8272] rounded-lg text-xs text-[#1C1C1C] focus:outline-none focus:ring-2 focus:ring-[#1F3A5F]"
              />
            </div>

            <div class="flex flex-col gap-1.5">
              <label class="font-semibold text-[#1C1C1C]">Eslogan de marca</label>
              <input
                type="text"
                id="cfg-eslogan"
                value="${sedeConfig.eslogan}"
                class="h-10 px-3 bg-white border border-[#8C8272] rounded-lg text-xs text-[#1C1C1C] focus:outline-none focus:ring-2 focus:ring-[#1F3A5F]"
              />
            </div>

            <div class="flex flex-col gap-1.5 sm:col-span-2">
              <label class="font-semibold text-[#1C1C1C]">Dirección física de atención <span class="text-[#8B1E1E]">*</span></label>
              <input
                type="text"
                id="cfg-direccion"
                value="${sedeConfig.direccion}"
                class="h-10 px-3 bg-white border border-[#8C8272] rounded-lg text-xs text-[#1C1C1C] focus:outline-none focus:ring-2 focus:ring-[#1F3A5F]"
              />
            </div>

            <div class="flex flex-col gap-1.5">
              <label class="font-semibold text-[#1C1C1C]">Teléfono fijo de contacto</label>
              <input
                type="text"
                id="cfg-telefono"
                value="${sedeConfig.telefono}"
                class="h-10 px-3 bg-white border border-[#8C8272] rounded-lg text-xs text-[#1C1C1C] focus:outline-none focus:ring-2 focus:ring-[#1F3A5F]"
              />
            </div>

            <div class="flex flex-col gap-1.5">
              <label class="font-semibold text-[#1C1C1C]">WhatsApp para notificaciones</label>
              <input
                type="text"
                id="cfg-whatsapp"
                value="${sedeConfig.whatsapp}"
                class="h-10 px-3 bg-white border border-[#8C8272] rounded-lg text-xs text-[#1C1C1C] focus:outline-none focus:ring-2 focus:ring-[#1F3A5F]"
              />
            </div>

            <div class="flex flex-col gap-1.5">
              <label class="font-semibold text-[#1C1C1C]">Sillones Activos en Sede</label>
              <input
                type="number"
                id="cfg-sillones"
                min="1"
                max="10"
                value="${sedeConfig.capacidadSillones}"
                class="h-10 px-3 bg-white border border-[#8C8272] rounded-lg text-xs font-mono font-bold text-[#1C1C1C] focus:outline-none focus:ring-2 focus:ring-[#1F3A5F]"
              />
            </div>

            <div class="flex flex-col gap-1.5">
              <label class="font-semibold text-[#1C1C1C]">Zona Horaria</label>
              <input
                type="text"
                disabled
                value="America/Bogota (UTC-5 Colombia)"
                class="h-10 px-3 bg-[#E8DFCE]/50 border border-[#D5CBB8] rounded-lg text-xs font-mono text-[#6B645A]"
              />
            </div>

            <div class="sm:col-span-2 pt-3 border-t border-[#D5CBB8] flex justify-end">
              <button
                type="submit"
                id="btn-guardar-sede"
                class="min-h-[44px] px-6 py-2 rounded-lg bg-[#1F3A5F] hover:bg-[#162B47] text-white text-xs font-semibold shadow-xs transition-all active:scale-[0.98]"
              >
                Guardar Datos de Sede
              </button>
            </div>
          </form>
        </article>

        <!-- TARJETA 2: POLÍTICAS Y REGLAS OPERATIVAS (5 cols) -->
        <article class="lg:col-span-5 flex flex-col gap-6">
          <!-- Reglas de Citas -->
          <div class="bg-[#FAF7F2] border border-[#D5CBB8] rounded-xl p-6 shadow-xs flex flex-col gap-4">
            <div class="flex items-center gap-3 pb-3 border-b border-[#D5CBB8]">
              <div class="w-9 h-9 rounded-lg bg-[#8B1E1E] text-white flex items-center justify-center shrink-0">
                <span class="material-symbols-outlined text-[20px]">tune</span>
              </div>
              <div>
                <h3 class="font-serif text-base font-bold text-[#1C1C1C]">Reglas de Agendamiento</h3>
                <p class="text-xs text-[#6B645A]">Parámetros estrictos de atención</p>
              </div>
            </div>

            <div class="flex flex-col gap-3 text-xs">
              <div class="p-3 bg-white border border-[#D5CBB8] rounded-lg flex items-center justify-between">
                <div>
                  <span class="font-semibold text-[#1C1C1C] block">Bloques de Atención</span>
                  <span class="text-[11px] text-[#6B645A]">Unidad mínima indivisible de agenda</span>
                </div>
                <span class="font-mono font-bold text-xs bg-[#E8DFCE] px-2.5 py-1 rounded">30 minutos</span>
              </div>

              <div class="p-3 bg-white border border-[#D5CBB8] rounded-lg flex items-center justify-between">
                <div>
                  <span class="font-semibold text-[#1C1C1C] block">Anticipación Mínima Cancelación</span>
                  <span class="text-[11px] text-[#6B645A]">Regla de negocio para clientes</span>
                </div>
                <span class="font-mono font-bold text-xs bg-[#FDF1DC] text-[#8A5300] px-2.5 py-1 rounded">2 horas</span>
              </div>

              <div class="p-3 bg-white border border-[#D5CBB8] rounded-lg flex items-center justify-between">
                <div>
                  <span class="font-semibold text-[#1C1C1C] block">Tratamiento de Datos (Ley 1581)</span>
                  <span class="text-[11px] text-[#6B645A]">Consentimiento obligatorio de clientes</span>
                </div>
                <span class="font-mono font-bold text-xs bg-[#E3EFE7] text-[#235D3A] px-2.5 py-1 rounded">Activo</span>
              </div>
            </div>
          </div>

          <!-- Usuarios del Sistema -->
          <div class="bg-[#FAF7F2] border border-[#D5CBB8] rounded-xl p-6 shadow-xs flex flex-col gap-3">
            <h3 class="font-serif text-base font-bold text-[#1C1C1C]">Usuarios con Acceso</h3>
            <div class="flex flex-col gap-2 text-xs">
              <div class="p-2.5 bg-white border border-[#D5CBB8] rounded-lg flex items-center justify-between">
                <div>
                  <strong class="text-[#1C1C1C] block">Carlos Mendoza</strong>
                  <span class="text-[11px] text-[#6B645A]">admin@smartbarber.co</span>
                </div>
                <span class="px-2 py-0.5 rounded bg-[#E4ECF5] text-[#1F3A5F] font-semibold text-[11px]">Dueño / Admin</span>
              </div>

              <div class="p-2.5 bg-white border border-[#D5CBB8] rounded-lg flex items-center justify-between">
                <div>
                  <strong class="text-[#1C1C1C] block">Mateo Restrepo</strong>
                  <span class="text-[11px] text-[#6B645A]">barbero@smartbarber.co</span>
                </div>
                <span class="px-2 py-0.5 rounded bg-[#FAF3E5] text-[#8A5300] font-semibold text-[11px]">Barbero Principal</span>
              </div>
            </div>
          </div>
        </article>
      </div>
    </div>
  `;
}

export function attachConfiguracionListeners() {
  const form = document.getElementById('form-config-sede');
  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      sedeConfig.nombreComercial = document.getElementById('cfg-nombre')?.value.trim() || sedeConfig.nombreComercial;
      sedeConfig.eslogan = document.getElementById('cfg-eslogan')?.value.trim() || sedeConfig.eslogan;
      sedeConfig.direccion = document.getElementById('cfg-direccion')?.value.trim() || sedeConfig.direccion;
      sedeConfig.telefono = document.getElementById('cfg-telefono')?.value.trim() || sedeConfig.telefono;
      sedeConfig.whatsapp = document.getElementById('cfg-whatsapp')?.value.trim() || sedeConfig.whatsapp;
      sedeConfig.capacidadSillones = Number(document.getElementById('cfg-sillones')?.value) || sedeConfig.capacidadSillones;

      alert('Parámetros de sede guardados exitosamente. Sincronizados con el Portal Público.');
    });
  }
}
