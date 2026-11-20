/**
 * StatusBadge Component
 * Badges semánticos para estados de citas e inventario.
 * Estricto cumplimiento WCAG 2.1 AA: siempre ícono + texto explícito + fondo de alto contraste.
 */

const STATUS_CONFIGS = {
  // Estados de Citas / Cortes
  pendiente: {
    label: 'Pendiente',
    icon: 'hourglass_empty',
    bg: 'bg-[#FDF1DC]',
    text: 'text-[#8A5300]',
    border: 'border-[#8A5300]/30'
  },
  confirmada: {
    label: 'Confirmada',
    icon: 'schedule',
    bg: 'bg-[#E4ECF5]',
    text: 'text-[#1F3A5F]',
    border: 'border-[#1F3A5F]/30'
  },
  completada: {
    label: 'Completada',
    icon: 'check_circle',
    bg: 'bg-[#E3EFE7]',
    text: 'text-[#235D3A]',
    border: 'border-[#235D3A]/30'
  },
  cancelada: {
    label: 'Cancelada',
    icon: 'cancel',
    bg: 'bg-[#FCE8E6]',
    text: 'text-[#B3261E]',
    border: 'border-[#B3261E]/30'
  },
  no_asistio: {
    label: 'No asistió',
    icon: 'person_off',
    bg: 'bg-[#E8DFCE]',
    text: 'text-[#4F4A42]',
    border: 'border-[#4F4A42]/30'
  },

  // Estados de Inventario
  disponible: {
    label: 'Disponible',
    icon: 'check_circle',
    bg: 'bg-[#E3EFE7]',
    text: 'text-[#235D3A]',
    border: 'border-[#235D3A]/30'
  },
  stock_bajo: {
    label: 'Stock bajo',
    icon: 'warning',
    bg: 'bg-[#FDF1DC]',
    text: 'text-[#8A5300]',
    border: 'border-[#8A5300]/30'
  },
  agotado: {
    label: 'Agotado',
    icon: 'error',
    bg: 'bg-[#FCE8E6]',
    text: 'text-[#B3261E]',
    border: 'border-[#B3261E]/30'
  }
};

/**
 * Renderiza un badge semántico accesible.
 * @param {string} status - Clave de estado (ej: 'pendiente', 'confirmada', 'stock_bajo', etc.)
 * @param {Object} [options]
 * @param {string} [options.customLabel] - Sobrescribe la etiqueta de texto por defecto
 * @param {'sm'|'md'} [options.size] - Tamaño del badge ('sm' para tablas, 'md' para tarjetas)
 * @returns {string} HTML string
 */
export function renderStatusBadge(status, { customLabel = '', size = 'md' } = {}) {
  const normalizedKey = (status || '').toLowerCase().replace(/[\s-]/g, '_');
  const config = STATUS_CONFIGS[normalizedKey] || {
    label: customLabel || status || 'Desconocido',
    icon: 'info',
    bg: 'bg-[#E8DFCE]',
    text: 'text-[#4F4A42]',
    border: 'border-[#D5CBB8]'
  };

  const label = customLabel || config.label;
  const sizeClasses = size === 'sm'
    ? 'text-[11px] py-0.5 px-2 gap-1'
    : 'text-xs py-1 px-2.5 gap-1.5';
  const iconSize = size === 'sm' ? 'text-[13px]' : 'text-[15px]';

  return `
    <span
      class="inline-flex items-center font-sans font-semibold rounded-full border ${config.bg} ${config.text} ${config.border} ${sizeClasses} select-none"
      role="status"
    >
      <span class="material-symbols-outlined ${iconSize} shrink-0" aria-hidden="true">
        ${config.icon}
      </span>
      <span class="leading-none whitespace-nowrap">${label}</span>
    </span>
  `;
}
