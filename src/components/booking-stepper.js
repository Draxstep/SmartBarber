/**
 * BookingStepper Component
 * Indicador de progreso de 5 pasos para el flujo de reserva pública.
 * Conforme a DESIGN.md: WCAG 2.1 AA (ícono + número + texto de estado).
 */

export const STEPS = [
  { id: 1, label: 'Servicios', icon: 'content_cut' },
  { id: 2, label: 'Barbero', icon: 'badge' },
  { id: 3, label: 'Fecha/Hora', icon: 'schedule' },
  { id: 4, label: 'Tus Datos', icon: 'person' },
  { id: 5, label: 'Resumen', icon: 'receipt_long' }
];

/**
 * Renderiza la barra de progreso de los 5 pasos.
 * @param {number} currentStep - Paso actual (1 a 5)
 * @returns {string} HTML string
 */
export function renderBookingStepper(currentStep = 3) {
  const total = STEPS.length;
  const progressPercent = Math.min(100, Math.max(0, ((currentStep - 1) / (total - 1)) * 100));

  const stepsHtml = STEPS.map(step => {
    const isCompleted = step.id < currentStep;
    const isActive = step.id === currentStep;

    let circleClasses = '';
    let content = '';
    let labelClasses = '';

    if (isCompleted) {
      circleClasses = 'bg-[#235D3A] text-white shadow-xs';
      content = '<span class="material-symbols-outlined text-[15px] font-bold">check</span>';
      labelClasses = 'text-[#4F4A42] font-medium';
    } else if (isActive) {
      circleClasses = 'bg-[#1F3A5F] text-white shadow-sm ring-2 ring-[#1F3A5F] ring-offset-2 ring-offset-[#FAF7F2] font-bold';
      content = `<span>${step.id}</span>`;
      labelClasses = 'text-[#1C1C1C] font-semibold';
    } else {
      circleClasses = 'bg-[#E8DFCE] text-[#6B645A] font-medium';
      content = `<span>${step.id}</span>`;
      labelClasses = 'text-[#6B645A]';
    }

    return `
      <div class="flex flex-col items-center z-10 select-none">
        <div class="w-6 h-6 rounded-full flex items-center justify-center text-xs transition-colors duration-200 ${circleClasses}" aria-current="${isActive ? 'step' : 'false'}">
          ${content}
        </div>
        <span class="text-[11px] font-sans mt-1 tracking-tight text-center ${labelClasses}">
          ${step.label}
        </span>
      </div>
    `;
  }).join('');

  return `
    <nav aria-label="Progreso de reserva" class="w-full bg-[#FAF7F2] px-4 py-3 border-b border-[#D5CBB8] shadow-[0_1px_2px_rgba(28,28,28,0.06)]">
      <div class="max-w-[480px] mx-auto">
        <div class="flex items-center justify-between relative">
          <!-- Background connector line -->
          <div class="absolute left-3 right-3 top-3 h-[2px] bg-[#E8DFCE] -z-0"></div>
          <!-- Active completed connector line -->
          <div class="absolute left-3 top-3 h-[2px] bg-[#1F3A5F] -z-0 transition-all duration-300" style="width: calc(${progressPercent}% - 6px);"></div>
          
          ${stepsHtml}
        </div>
      </div>
    </nav>
  `;
}
