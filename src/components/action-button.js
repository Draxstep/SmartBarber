/**
 * @file action-button.js
 * @description Componente declarativo de botón semántico (OCP / WCAG 2.2 AA).
 * Garantiza coherencia cromática: azul primario (#1F3A5F) para acciones constructivas,
 * rojo (#B3261E) exclusivo para acciones destructivas, y objetivos táctiles >= 44px.
 */

const VARIANT_CLASSES = {
  primary: 'bg-[#1F3A5F] hover:bg-[#162B47] text-white border border-transparent shadow-sm',
  secondary: 'bg-white hover:bg-[#FAF3E5] text-[#1F3A5F] border border-[#1F3A5F]/40 shadow-2xs',
  outline: 'bg-transparent hover:bg-[#E4ECF5] text-[#1F3A5F] border-2 border-[#1F3A5F] shadow-xs',
  danger: 'bg-[#FCE8E6] hover:bg-[#B3261E] text-[#B3261E] hover:text-white border border-[#F5B8B4]',
  neutral: 'bg-white hover:bg-[#E8DFCE] text-[#1C1C1C] border border-[#8C8272] shadow-2xs'
};

/**
 * Renderiza un botón o enlace con variante semántica unificada y sin glifos "+" duplicados.
 * @param {Object} options
 * @returns {string}
 */
export function renderActionButton({
  id = '',
  href = '',
  type = 'button',
  variant = 'primary',
  icon = '',
  label = 'Acción',
  title = '',
  size = 'md',
  extraClass = '',
  attrs = ''
} = {}) {
  const cleanLabel = String(label || '').replace(/^\+\s*/, '').trim();
  const variantCls = VARIANT_CLASSES[variant] || VARIANT_CLASSES.primary;
  const sizeCls = size === 'sm' ? 'min-h-[38px] px-3 py-1.5 text-xs' : 'min-h-[44px] px-4 py-2 text-xs';
  const baseCls = `touch-action inline-flex items-center justify-center gap-2 rounded-lg font-sans font-semibold transition-all active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1F3A5F] ${sizeCls} ${variantCls} ${extraClass}`;

  const iconHtml = icon ? `<span class="material-symbols-outlined text-[18px]" aria-hidden="true">${icon}</span>` : '';

  if (href) {
    return `
      <a ${id ? `id="${id}"` : ''} href="${href}" ${title ? `title="${title}"` : ''} class="${baseCls}" ${attrs}>
        ${iconHtml}
        <span>${cleanLabel}</span>
      </a>
    `;
  }

  return `
    <button ${id ? `id="${id}"` : ''} type="${type}" ${title ? `title="${title}"` : ''} class="${baseCls}" ${attrs}>
      ${iconHtml}
      <span>${cleanLabel}</span>
    </button>
  `;
}
