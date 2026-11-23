/**
 * Landing Page - Portal Público Mobile-First
 * 100% Desacoplado: Renderizado dinámico desde src/services/
 * Estilo tradicional barbershop, Playfair Display, Inter, JetBrains Mono.
 */

import { renderPublicHeader } from '../../components/public-header.js';
import { renderServiceCard } from '../../components/service-card.js';
import { renderEmptyState } from '../../components/empty-state.js';
import { renderServiceCardSkeleton, renderBarberCardSkeleton } from '../../components/skeleton-loader.js';

export function renderLandingPage({ services = [], barbers = [], isLoading = false } = {}) {
  const servicesContent = isLoading
    ? renderServiceCardSkeleton(4)
    : (services.length > 0
        ? services.map(srv => renderServiceCard(srv, false)).join('')
        : renderEmptyState({
            title: 'Catálogo en Actualización',
            description: 'Nuestras tarifas y servicios se están actualizando.',
            icon: 'content_cut'
          }));

  const barbersContent = isLoading
    ? renderBarberCardSkeleton(3)
    : (barbers.length > 0
        ? barbers.map(b => `
            <div class="bg-white rounded-lg p-5 border border-[#D5CBB8] shadow-xs flex flex-col items-center text-center hover:border-[#1F3A5F] transition-all">
              <img
                src="${b.foto}"
                alt="${b.nombre}"
                class="w-20 h-20 rounded-full object-cover border-2 border-[#1F3A5F] mb-3 shadow-xs"
              />
              <h3 class="font-sans font-bold text-base text-[#1C1C1C]">${b.nombre}</h3>
              <span class="font-sans text-xs text-[#8B1E1E] font-semibold mt-0.5">${b.especialidad}</span>
              <span class="font-mono text-[11px] text-[#6B645A] mt-2">${b.experiencia || 'Master Barber'}</span>
              <a
                href="#booking-wizard"
                class="mt-4 w-full min-h-[44px] flex items-center justify-center text-xs font-semibold text-[#1F3A5F] hover:bg-[#E4ECF5] rounded-md border border-[#1F3A5F] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1F3A5F]"
              >
                Agendar con ${b.nombre.split(' ')[0]}
              </a>
            </div>
          `).join('')
        : renderEmptyState({
            title: 'Equipo de Barberos',
            description: 'No hay barberos asignados en este momento.',
            icon: 'person'
          }));

  return `
    <div class="min-h-screen bg-[#F2EBDD] text-[#1C1C1C] flex flex-col font-sans">
      ${renderPublicHeader()}

      <!-- HERO SECTION -->
      <section class="bg-[#1C1C1C] text-[#F2EBDD] py-12 sm:py-16 px-4 relative overflow-hidden border-b-4 border-[#8B1E1E]">
        <div class="max-w-[1120px] mx-auto flex flex-col items-center text-center">
          <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#2A2A2A] border border-white/10 text-[#BDB4A5] text-xs uppercase tracking-widest font-semibold mb-6">
            <span class="w-2 h-2 rounded-full bg-[#8B1E1E]"></span>
            <span>Tradición Bogotana · Desde 2020</span>
          </div>

          <h1 class="font-serif text-3xl sm:text-5xl lg:text-6xl font-bold tracking-tight max-w-2xl leading-tight mb-4">
            El Oficio de la Barbería en su Máxima Expresión
          </h1>

          <p class="font-sans text-sm sm:text-base text-[#BDB4A5] max-w-lg mb-8 leading-relaxed">
            Puntualidad en bloques de 30 minutos, navaja de acero quirúrgico y atención personalizada en el corazón de Bogotá.
          </p>

          <div class="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto">
            <a
              href="#booking-wizard"
              id="hero-book-cta"
              class="w-full sm:w-auto min-h-[48px] px-8 py-3 rounded-md bg-[#8B1E1E] hover:bg-[#6E1616] text-white font-semibold text-base shadow-md transition-all active:scale-[0.98] flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1F3A5F]"
            >
              <span class="material-symbols-outlined text-[20px]">calendar_add_on</span>
              <span>Agendar mi Cita</span>
            </a>
            <a
              href="#servicios"
              class="w-full sm:w-auto min-h-[48px] px-6 py-3 rounded-md border border-[#BDB4A5]/40 text-[#F2EBDD] hover:bg-white/10 font-semibold text-sm transition-colors flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1F3A5F]"
            >
              <span class="material-symbols-outlined text-[18px]">menu_book</span>
              <span>Ver Tarifas</span>
            </a>
          </div>

          <!-- Quick Metrics Bar -->
          <div class="grid grid-cols-3 gap-4 sm:gap-8 mt-12 pt-8 border-t border-white/10 w-full max-w-xl text-center">
            <div>
              <span class="block font-mono text-xl sm:text-2xl font-bold text-[#F2EBDD] tabular-nums">30 min</span>
              <span class="block text-[11px] text-[#BDB4A5] uppercase tracking-wider mt-0.5">Bloques Exactos</span>
            </div>
            <div>
              <span class="block font-mono text-xl sm:text-2xl font-bold text-[#7BA3D4] tabular-nums">4.9 / 5</span>
              <span class="block text-[11px] text-[#BDB4A5] uppercase tracking-wider mt-0.5">Satisfacción</span>
            </div>
            <div>
              <span class="block font-mono text-xl sm:text-2xl font-bold text-[#E07A7A] tabular-nums">100%</span>
              <span class="block text-[11px] text-[#BDB4A5] uppercase tracking-wider mt-0.5">Garantía Oficio</span>
            </div>
          </div>
        </div>
      </section>

      <!-- CATÁLOGO DE SERVICIOS -->
      <section id="servicios" class="py-12 sm:py-16 px-4 max-w-[1120px] mx-auto w-full">
        <div class="flex flex-col items-center text-center mb-8">
          <span class="font-sans text-xs uppercase tracking-widest text-[#8B1E1E] font-bold">Nuestra Carta</span>
          <h2 class="font-serif text-2xl sm:text-4xl font-bold text-[#1C1C1C] mt-1">Servicios & Tarifas</h2>
          <div class="double-rule-divider w-24 my-3"></div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-[800px] mx-auto">
          ${servicesContent}
        </div>

        <div class="mt-8 text-center">
          <a
            href="#booking-wizard"
            class="inline-flex items-center gap-2 min-h-[44px] px-6 py-2.5 rounded-md bg-[#1F3A5F] hover:bg-[#162B47] text-white font-semibold text-sm shadow-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1F3A5F]"
          >
            <span>Reservar Servicios Seleccionados</span>
            <span class="material-symbols-outlined text-[18px]">arrow_forward</span>
          </a>
        </div>
      </section>

      <!-- EQUIPO DE BARBEROS -->
      <section class="py-12 sm:py-16 px-4 bg-[#FAF7F2] border-t border-b border-[#D5CBB8]">
        <div class="max-w-[1120px] mx-auto">
          <div class="flex flex-col items-center text-center mb-8">
            <span class="font-sans text-xs uppercase tracking-widest text-[#8B1E1E] font-bold">Maestros del Oficio</span>
            <h2 class="font-serif text-2xl sm:text-4xl font-bold text-[#1C1C1C] mt-1">Nuestros Barberos</h2>
            <div class="double-rule-divider w-24 my-3"></div>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-3xl mx-auto">
            ${barbersContent}
          </div>
        </div>
      </section>

      <!-- UBICACIÓN & HORARIOS -->
      <section class="py-12 sm:py-16 px-4 max-w-[1120px] mx-auto w-full">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
          <div class="flex flex-col">
            <span class="font-sans text-xs uppercase tracking-widest text-[#8B1E1E] font-bold">Visítanos</span>
            <h2 class="font-serif text-2xl sm:text-3xl font-bold text-[#1C1C1C] mt-1">Sede Centro Histórico</h2>
            <div class="double-rule-divider w-20 my-3"></div>

            <div class="space-y-4 text-sm text-[#4F4A42] mt-2">
              <div class="flex items-start gap-3">
                <span class="material-symbols-outlined text-[20px] text-[#1F3A5F] shrink-0 mt-0.5">location_on</span>
                <div>
                  <strong class="text-[#1C1C1C]">Dirección:</strong>
                  <p>Carrera 7 # 12-45, La Candelaria, Bogotá D.C.</p>
                </div>
              </div>

              <div class="flex items-start gap-3">
                <span class="material-symbols-outlined text-[20px] text-[#1F3A5F] shrink-0 mt-0.5">schedule</span>
                <div>
                  <strong class="text-[#1C1C1C]">Horario de Atención:</strong>
                  <p>Lunes a Sábado: 09:00 AM – 07:00 PM</p>
                  <p class="text-xs text-[#6B645A]">Domingos y Festivos: Cerrado</p>
                </div>
              </div>

              <div class="flex items-start gap-3">
                <span class="material-symbols-outlined text-[20px] text-[#1F3A5F] shrink-0 mt-0.5">call</span>
                <div>
                  <strong class="text-[#1C1C1C]">Teléfono / WhatsApp:</strong>
                  <p class="font-mono">+57 (601) 345-6789</p>
                </div>
              </div>
            </div>
          </div>

          <div class="bg-[#FAF7F2] p-6 rounded-xl border border-[#D5CBB8] shadow-xs text-center flex flex-col items-center">
            <div class="w-12 h-12 rounded-full bg-[#1F3A5F] text-white flex items-center justify-center mb-3 shadow-xs">
              <span class="material-symbols-outlined text-[24px]">verified</span>
            </div>
            <h3 class="font-serif text-lg font-bold text-[#1C1C1C]">Garantía de Satisfacción</h3>
            <p class="text-xs text-[#4F4A42] mt-2 max-w-xs">
              Si tu corte o ritual de barba no cumple al 100% con tu estándar, lo ajustamos sin ningún costo adicional.
            </p>
            <a
              href="#booking-wizard"
              class="mt-5 min-h-[44px] px-6 py-2.5 rounded-md bg-[#8B1E1E] hover:bg-[#6E1616] text-white font-semibold text-sm transition-colors shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1F3A5F]"
            >
              Reservar Turno Ahora
            </a>
          </div>
        </div>
      </section>

      <!-- FOOTER -->
      <footer class="bg-[#1C1C1C] text-[#BDB4A5] py-8 px-4 border-t-2 border-[#8B1E1E] mt-auto">
        <div class="max-w-[1120px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
          <div class="flex items-center gap-2">
            <span class="font-serif text-base font-bold text-[#F2EBDD]">SmartBarber</span>
            <span>· &copy; 2026 Todos los derechos reservados.</span>
          </div>
          <div class="flex items-center gap-4 text-[11px]">
            <a href="#" class="hover:text-white transition-colors">Política de Tratamiento de Datos (Ley 1581)</a>
            <span class="text-white/20">|</span>
            <a href="/backoffice.html" class="hover:text-white transition-colors">Panel Backoffice</a>
          </div>
        </div>
      </footer>
    </div>
  `;
}
