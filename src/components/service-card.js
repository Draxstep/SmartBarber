/**
 * ServiceCard Component
 * Tarjeta de selección de servicio para el portal de reservas y caja POS.
 * Formato COP: $ 25.000 COP, duración en bloques de 30 min.
 * Conforme a DESIGN.md y WCAG 2.1 AA.
 */

import { formatCOP, formatDurationBlocks } from '../utils/formatters.js';

/**
 * Renderiza una tarjeta de servicio accesible y clickeable.
 * @param {Object} service - Objeto servicio
 * @param {boolean} isSelected - Estado de selección actual
 * @returns {string} HTML string
 */
export function renderServiceCard(service, isSelected = false) {
  const {
    id = '',
    nombre = 'Servicio Barbershop',
    descripcion = '',
    precio = 0,
    duracionMinutos = 30
  } = service;

  const cardClasses = isSelected
    ? 'border-2 border-[#1F3A5F] bg-[#E4ECF5] shadow-xs'
    : 'border border-[#D5CBB8] bg-[#FAF7F2] hover:border-[#8C8272] hover:shadow-xs';

  const checkIconClasses = isSelected
    ? 'bg-[#1F3A5F] text-white border-[#1F3A5F]'
    : 'border-2 border-[#8C8272] bg-white text-transparent';

  return `
    <article
      class="service-card cursor-pointer rounded-lg p-4 transition-all duration-150 flex items-start justify-between gap-3 ${cardClasses}"
      data-service-id="${id}"
      data-service-name="${nombre}"
      data-service-price="${precio}"
      data-service-duration="${duracionMinutos}"
      role="checkbox"
      aria-checked="${isSelected}"
      tabindex="0"
    >
      <div class="flex items-start gap-3 min-w-0">
        <!-- Accessible Checkbox indicator -->
        <div class="w-5 h-5 rounded flex items-center justify-center shrink-0 mt-0.5 transition-colors ${checkIconClasses}" aria-hidden="true">
          <span class="material-symbols-outlined text-[16px] font-bold">check</span>
        </div>

        <div class="flex flex-col min-w-0">
          <h3 class="font-sans font-semibold text-[15px] text-[#1C1C1C] leading-snug truncate">
            ${nombre}
          </h3>
          ${descripcion ? `
            <p class="font-sans text-xs text-[#4F4A42] line-clamp-2 mt-0.5">
              ${descripcion}
            </p>
          ` : ''}
          <div class="mt-2 flex items-center gap-2">
            <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#E8DFCE] text-[#4F4A42] font-sans text-xs font-medium">
              <span class="material-symbols-outlined text-[13px]">schedule</span>
              <span>${formatDurationBlocks(duracionMinutos)}</span>
            </span>
          </div>
        </div>
      </div>

      <!-- Price & Badge -->
      <div class="flex flex-col items-end shrink-0 pl-2">
        <span class="font-mono font-bold text-[15px] text-[#1C1C1C] tabular-nums whitespace-nowrap">
          ${formatCOP(precio)}
        </span>
        <span class="font-sans text-[11px] text-[#6B645A] mt-0.5">Tarifa fija</span>
      </div>
    </article>
  `;
}
