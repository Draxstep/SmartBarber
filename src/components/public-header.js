/**
 * PublicHeader Component
 * Encabezado sticky para el Portal Público Mobile-First.
 * Conforme a DESIGN.md: bg-carbon (#1C1C1C), border-sangria (#8B1E1E), logo Playfair Display.
 */

export function renderPublicHeader({ title = 'SmartBarber', subtitle = 'Tradición & Oficio', ctaText = 'Agendar Cita', ctaHref = '#booking-wizard' } = {}) {
  return `
    <header class="sticky top-0 w-full z-50 bg-[#1C1C1C] border-b-2 border-[#8B1E1E] shadow-[0_2px_12px_rgba(0,0,0,0.35)]">
      <div class="max-w-[1120px] mx-auto h-16 px-4 sm:px-6 flex items-center justify-between">
        <!-- Brand Wordmark -->
        <a href="#inicio" class="flex items-center gap-3 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1F3A5F] rounded-md p-1" aria-label="SmartBarber Inicio">
          <div class="w-9 h-9 rounded-md bg-[#8B1E1E] flex items-center justify-center text-[#F2EBDD] font-bold text-lg shadow-sm">
            <span class="material-symbols-outlined text-[20px]">content_cut</span>
          </div>
          <div class="flex flex-col">
            <span class="font-serif text-xl sm:text-2xl font-bold tracking-tight text-[#F2EBDD] leading-none group-hover:text-white transition-colors">
              ${title}
            </span>
            <span class="font-sans text-[10px] tracking-widest uppercase text-[#BDB4A5] leading-tight">
              ${subtitle}
            </span>
          </div>
        </a>

        <!-- Header Actions -->
        <div class="flex items-center gap-2 sm:gap-3">
          <button
            id="btn-instalar-app"
            type="button"
            style="display: none;"
            class="items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-[#8C8272]/50 text-xs font-semibold text-[#F2EBDD] hover:bg-white/10 transition-colors min-h-[36px]"
            title="Instalar SmartBarber como aplicación"
          >
            <span class="material-symbols-outlined text-[16px]">install_mobile</span>
            <span class="hidden sm:inline">Instalar App</span>
          </button>
          <a href="#consultar" class="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-[#BDB4A5] hover:text-[#F2EBDD] transition-colors rounded-md focus-visible:ring-2 focus-visible:ring-[#1F3A5F]" title="Consultar mi Cita">
            <span class="material-symbols-outlined text-[18px]">manage_search</span>
            <span class="hidden sm:inline">Consultar Cita</span>
          </a>
          <a href="/backoffice.html" class="hidden md:inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-[#BDB4A5] hover:text-[#F2EBDD] transition-colors rounded-md focus-visible:ring-2 focus-visible:ring-[#1F3A5F]" title="Acceso Administrativo">
            <span class="material-symbols-outlined text-[18px]">admin_panel_settings</span>
            <span>Backoffice</span>
          </a>
          <a href="${ctaHref}" class="inline-flex items-center justify-center min-h-[44px] px-2.5 sm:px-4 py-2 rounded-md bg-[#F2EBDD] hover:bg-white text-[#1C1C1C] font-semibold text-xs sm:text-sm shadow-sm transition-all active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1F3A5F]">
            <span class="material-symbols-outlined text-[18px] mr-1 text-[#8B1E1E]">event_available</span>
            <span>${ctaText}</span>
          </a>
        </div>
      </div>
    </header>
  `;
}
