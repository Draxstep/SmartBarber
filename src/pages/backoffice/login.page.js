/**
 * Backoffice Login Page - SmartBarber
 * Fiel a docs/stitch/smartbarber_inicio_de_sesi_n_backoffice
 * Conexión con authService, validación de credenciales y feedback accesible.
 */

import { authService } from '../../services/index.js';

export function renderLoginPage({ error = '' } = {}) {
  return `
    <div class="min-h-screen w-full flex bg-[#F2EBDD] font-sans text-[#1C1C1C]">
      <!-- PANEL IZQUIERDO EDITORIAL (Desktop >= 1024px) -->
      <aside class="relative hidden lg:flex lg:w-1/2 flex-col justify-between bg-[#1C1C1C] border-r-4 border-[#8B1E1E] p-12 xl:p-16 overflow-hidden">
        <!-- Overlay sutil -->
        <div class="absolute inset-0 bg-gradient-to-t from-black via-[#1C1C1C]/90 to-[#1C1C1C]/80 z-10"></div>
        <img
          src="https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=1200&auto=format&fit=crop&q=80"
          alt="Barbería Tradicional"
          class="absolute inset-0 w-full h-full object-cover object-center opacity-30 select-none pointer-events-none"
        />

        <!-- Contenido Superior -->
        <div class="relative z-20">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-lg bg-[#8B1E1E] flex items-center justify-center text-[#F2EBDD] shadow-md">
              <span class="material-symbols-outlined text-[24px]">content_cut</span>
            </div>
            <div>
              <span class="block font-serif text-2xl font-bold tracking-tight text-[#F2EBDD] leading-none">SmartBarber</span>
              <span class="block font-sans text-[11px] text-[#BDB4A5] uppercase tracking-widest mt-1">SISTEMA DE GESTIÓN PATRIMONIAL</span>
            </div>
          </div>
        </div>

        <!-- Cita Editorial Central -->
        <div class="relative z-20 max-w-lg my-auto py-12">
          <div class="w-12 h-1 bg-[#8B1E1E] mb-6"></div>
          <blockquote class="font-serif text-2xl xl:text-3xl font-bold text-[#F2EBDD] leading-relaxed">
            "La precisión en cada corte, la disciplina en cada bloque de 30 minutos y la fidelidad al oficio tradicional."
          </blockquote>
          <p class="font-sans text-xs text-[#BDB4A5] mt-4 uppercase tracking-wider">
            Sede Principal · La Candelaria, Bogotá D.C.
          </p>
        </div>

        <!-- Footer Izquierdo -->
        <div class="relative z-20 flex items-center justify-between text-xs text-[#BDB4A5] pt-6 border-t border-white/10">
          <span>&copy; 2026 SmartBarber Bogotá</span>
          <span class="font-mono text-[11px]">v2.0 · Monolito Modular PWA</span>
        </div>
      </aside>

      <!-- PANEL DERECHO: FORMULARIO DE ACCESO -->
      <main class="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12">
        <div class="w-full max-w-md flex flex-col gap-6 bg-[#FAF7F2] p-8 sm:p-10 rounded-2xl border border-[#D5CBB8] shadow-md">
          <!-- Header del Formulario -->
          <div class="flex flex-col gap-2">
            <div class="lg:hidden flex items-center gap-2 mb-2">
              <div class="w-8 h-8 rounded-md bg-[#8B1E1E] flex items-center justify-center text-white text-base">
                <span class="material-symbols-outlined text-[18px]">content_cut</span>
              </div>
              <span class="font-serif text-xl font-bold text-[#1C1C1C]">SmartBarber</span>
            </div>

            <div class="inline-flex items-center gap-2 px-2.5 py-1 rounded bg-[#E4ECF5] text-[#1F3A5F] text-[11px] font-semibold uppercase tracking-wider w-fit">
              <span class="material-symbols-outlined text-[15px]">lock</span>
              <span>Acceso Administrativo</span>
            </div>
            <h1 class="font-serif text-2xl sm:text-3xl font-bold text-[#1C1C1C] tracking-tight">
              Iniciar Sesión
            </h1>
          </div>

          <!-- Banner de Error si aplica -->
          ${error ? `
            <div class="p-3.5 rounded-lg bg-[#FCE8E6] border border-[#B3261E]/30 text-xs text-[#B3261E] flex items-start gap-2.5" role="alert">
              <span class="material-symbols-outlined text-[18px] shrink-0 mt-0.5">error</span>
              <div>
                <strong class="font-semibold">Error de autenticación:</strong>
                <p class="mt-0.5">${error}</p>
              </div>
            </div>
          ` : ''}

          <!-- Formulario -->
          <form id="backoffice-login-form" class="flex flex-col gap-4">
            <div class="flex flex-col gap-1.5">
              <label for="login-email" class="font-sans font-semibold text-xs text-[#1C1C1C]">
                Correo Electrónico
              </label>
              <div class="relative">
                <span class="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-[#6B645A]">mail</span>
                <input
                  type="email"
                  id="login-email"
                  name="email"
                  required
                  placeholder="admin@smartbarber.co"
                  value="admin@smartbarber.co"
                  class="h-11 pl-10 pr-3 w-full rounded-md bg-white border border-[#8C8272] text-sm text-[#1C1C1C] placeholder-[#6B645A] focus:outline-none focus:ring-2 focus:ring-[#1F3A5F]"
                />
              </div>
            </div>

            <div class="flex flex-col gap-1.5">
              <label for="login-password" class="font-sans font-semibold text-xs text-[#1C1C1C]">
                Contraseña
              </label>
              <div class="relative">
                <span class="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-[#6B645A]">key</span>
                <input
                  type="password"
                  id="login-password"
                  name="password"
                  required
                  placeholder="••••••••••••"
                  value="Admin123456!"
                  class="h-11 pl-10 pr-3 w-full rounded-md bg-white border border-[#8C8272] text-sm text-[#1C1C1C] placeholder-[#6B645A] focus:outline-none focus:ring-2 focus:ring-[#1F3A5F]"
                />
              </div>
            </div>

            <!-- Botón de Entrada -->
            <button
              type="submit"
              id="btn-login-submit"
              class="mt-2 min-h-[44px] px-6 py-2.5 rounded-md bg-[#1F3A5F] hover:bg-[#162B47] text-white font-sans font-semibold text-sm shadow-sm transition-all active:scale-[0.98] flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1F3A5F]"
            >
              <span>Ingresar al Sistema</span>
              <span class="material-symbols-outlined text-[18px]">arrow_forward</span>
            </button>
          </form>

          <!-- Credenciales Rápidas para Demostración -->
          <div class="p-4 rounded-xl bg-[#E8DFCE]/40 border border-[#D5CBB8] flex flex-col gap-2">
            <span class="text-[11px] font-bold text-[#4F4A42] uppercase tracking-wider">Atajos de Demostración:</span>
            <div class="flex flex-wrap gap-2">
              <button
                type="button"
                id="btn-demo-admin"
                class="px-2.5 py-1.5 rounded-md bg-white border border-[#8C8272] text-[11px] font-semibold text-[#1C1C1C] hover:bg-[#FAF7F2] transition-colors"
              >
                👤 Dueño: admin@smartbarber.co
              </button>
              <button
                type="button"
                id="btn-demo-barbero"
                class="px-2.5 py-1.5 rounded-md bg-white border border-[#8C8272] text-[11px] font-semibold text-[#1C1C1C] hover:bg-[#FAF7F2] transition-colors"
              >
                💈 Barbero: barbero@smartbarber.co
              </button>
            </div>
          </div>

          <!-- Volver al Portal Público -->
          <div class="pt-4 border-t border-[#D5CBB8] text-center">
            <a href="/" class="text-xs font-semibold text-[#1F3A5F] hover:underline flex items-center justify-center gap-1.5">
              <span class="material-symbols-outlined text-[16px]">arrow_back</span>
              <span>Ir al Portal Público de Clientes</span>
            </a>
          </div>
        </div>
      </main>
    </div>
  `;
}

export function attachLoginListeners(onLoginSuccess) {
  const form = document.getElementById('backoffice-login-form');
  const emailInput = document.getElementById('login-email');
  const passwordInput = document.getElementById('login-password');
  const submitBtn = document.getElementById('btn-login-submit');

  const btnDemoAdmin = document.getElementById('btn-demo-admin');
  if (btnDemoAdmin) {
    btnDemoAdmin.addEventListener('click', () => {
      emailInput.value = 'admin@smartbarber.co';
      passwordInput.value = 'Admin123456!';
    });
  }

  const btnDemoBarbero = document.getElementById('btn-demo-barbero');
  if (btnDemoBarbero) {
    btnDemoBarbero.addEventListener('click', () => {
      emailInput.value = 'barbero@smartbarber.co';
      passwordInput.value = 'Barbero123456!';
    });
  }

  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      const email = emailInput.value.trim();
      const password = passwordInput.value;

      try {
        if (submitBtn) {
          submitBtn.disabled = true;
          submitBtn.innerHTML = `
            <span class="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
            <span>Verificando...</span>
          `;
        }

        const res = await authService.login({ email, password });
        if (res.ok) {
          if (typeof onLoginSuccess === 'function') {
            onLoginSuccess(res.data.usuario);
          }
        }
      } catch (err) {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.innerHTML = `
            <span>Ingresar al Sistema</span>
            <span class="material-symbols-outlined text-[18px]">arrow_forward</span>
          `;
        }

        // Re-render con mensaje de error
        const root = document.getElementById('app');
        if (root) {
          root.innerHTML = renderLoginPage({ error: err.message || 'Credenciales inválidas.' });
          attachLoginListeners(onLoginSuccess);
        }
      }
    });
  }
}
