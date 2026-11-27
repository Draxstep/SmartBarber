/**
 * KPICard Component - Tarjeta de Métricas Operacionales
 * Formato numérico tabular (JetBrains Mono/Inter), ícono semántico y contexto.
 * Conforme a DESIGN.md: bg-surface (#FAF7F2), border-subtle (#D5CBB8).
 */

/**
 * Renderiza una tarjeta de indicador clave (KPI).
 * @param {Object} options
 * @param {string} options.label - Título del indicador (ej: 'Ingresos Hoy')
 * @param {string|number} options.value - Valor formateado (ej: '$ 485.000 COP' o '18')
 * @param {string} [options.caption] - Subtítulo o desglose (ej: '14 cobros registrados')
 * @param {string} options.icon - Nombre del ícono Material Symbols
 * @param {string} [options.iconBg] - Clase de fondo del ícono (default: 'bg-[#E4ECF5]')
 * @param {string} [options.iconColor] - Clase de color del ícono (default: 'text-[#1F3A5F]')
 * @param {Object} [options.trend] - Opcional { text: '+12%', isPositive: true }
 * @returns {string} HTML string
 */
export function renderKpiCard({
  label = 'Métrica',
  value = '0',
  caption = '',
  icon = 'analytics',
  iconBg = 'bg-[#E4ECF5]',
  iconColor = 'text-[#1F3A5F]',
  trend = null,
  href = '',
  actionLabel = ''
} = {}) {
  const tagOpen = href
    ? `<a href="${href}" class="group block bg-[#FAF7F2] border border-[#D5CBB8] rounded-xl p-4 sm:p-5 shadow-2xs flex flex-col justify-between hover:border-[#1F3A5F] hover:shadow-xs transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1F3A5F]">`
    : `<article class="bg-[#FAF7F2] border border-[#D5CBB8] rounded-xl p-4 sm:p-5 shadow-2xs flex flex-col justify-between hover:border-[#8C8272] transition-colors">`;
  const tagClose = href ? `</a>` : `</article>`;

  return `
    ${tagOpen}
      <div class="flex items-start justify-between gap-2">
        <span class="font-sans text-xs uppercase tracking-wider text-[#57534E] font-bold truncate">
          ${label}
        </span>
        <div class="w-8 h-8 rounded-lg ${iconBg} ${iconColor} flex items-center justify-center shrink-0 shadow-xs">
          <span class="material-symbols-outlined text-[18px]" aria-hidden="true">${icon}</span>
        </div>
      </div>

      <div class="mt-3">
        <div class="flex items-baseline gap-2">
          <span class="font-sans font-bold text-2xl sm:text-3xl text-[#1C1C1C] tabular-nums tracking-tight">
            ${value}
          </span>
          ${trend ? `
            <span class="inline-flex items-center text-xs font-semibold ${trend.isPositive ? 'text-[#235D3A]' : 'text-[#B3261E]'}">
              <span class="material-symbols-outlined text-[14px]">${trend.isPositive ? 'arrow_upward' : 'arrow_downward'}</span>
              <span>${trend.text}</span>
            </span>
          ` : ''}
        </div>
        ${caption ? `
          <p class="font-sans text-xs text-[#4F4A42] mt-1 line-clamp-2">
            ${caption}
          </p>
        ` : ''}
        ${href && actionLabel ? `
          <span class="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-[#1F3A5F] group-hover:underline">
            <span>${actionLabel}</span>
            <span class="material-symbols-outlined text-[14px]" aria-hidden="true">arrow_forward</span>
          </span>
        ` : ''}
      </div>
    ${tagClose}
  `;
}
