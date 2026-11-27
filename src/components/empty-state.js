/**
 * EmptyState Component - Estado Vacío Accesible
 * Utilizado cuando no hay citas agendadas, inventario sin coincidencias o listas vacías.
 * Conforme a DESIGN.md: estilo cálido sobre #FAF7F2 con borde #D5CBB8.
 */

/**
 * Renderiza un contenedor de estado vacío con mensaje y acción opcional.
 * @param {Object} options
 * @param {string} options.title - Título del estado vacío
 * @param {string} options.description - Mensaje explicativo o motivacional
 * @param {string} [options.icon] - Ícono Material Symbols (default: 'inventory_2')
 * @param {string} [options.actionText] - Texto del botón de acción (opcional)
 * @param {string} [options.actionId] - ID del botón de acción
 * @returns {string} HTML string
 */
export function renderEmptyState({
  title = 'No se encontraron registros',
  description = 'No hay elementos para mostrar en este momento.',
  icon = 'inbox',
  actionText = '',
  actionId = 'btn-empty-action'
} = {}) {
  return `
    <div class="bg-[#FAF7F2] border border-[#D5CBB8] rounded-xl p-8 sm:p-12 text-center flex flex-col items-center justify-center max-w-lg mx-auto my-4 shadow-xs">
      <div class="w-14 h-14 rounded-full bg-[#E8DFCE] text-[#4F4A42] flex items-center justify-center mb-4">
        <span class="material-symbols-outlined text-[28px]" aria-hidden="true">${icon}</span>
      </div>

      <h3 class="font-serif text-lg sm:text-xl font-bold text-[#1C1C1C]">
        ${title}
      </h3>

      <p class="font-sans text-xs sm:text-sm text-[#6B645A] mt-1.5 max-w-sm leading-relaxed">
        ${description}
      </p>

      ${actionText ? `
        <button
          type="button"
          id="${actionId}"
          class="mt-5 min-h-[44px] px-5 py-2 rounded-md bg-[#1F3A5F] hover:bg-[#162B47] text-white font-sans font-semibold text-xs shadow-sm transition-all flex items-center gap-2 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1F3A5F]"
        >
          <span class="material-symbols-outlined text-[18px]">add</span>
          <span>${actionText}</span>
        </button>
      ` : ''}
    </div>
  `;
}
