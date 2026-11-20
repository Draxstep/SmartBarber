/**
 * PaymentMethodSelector Component
 * Selector accesible de los 5 métodos de pago en Colombia.
 * Efectivo, Transferencia, Tarjeta débito/crédito, Nequi, Daviplata.
 * Conforme a DESIGN.md y WCAG 2.1 AA (foco visible #1F3A5F, min-height 44px).
 */

export const PAYMENT_METHODS = [
  {
    id: 'efectivo',
    label: 'Efectivo',
    icon: 'payments',
    subtitle: 'Pago físico en caja'
  },
  {
    id: 'transferencia_bancaria',
    label: 'Transferencia',
    icon: 'account_balance',
    subtitle: 'Bancolombia / PSE'
  },
  {
    id: 'tarjeta_debito_credito',
    label: 'Tarjeta Débito/Crédito',
    icon: 'credit_card',
    subtitle: 'Datafono en sede'
  },
  {
    id: 'nequi',
    label: 'Nequi',
    icon: 'phone_iphone',
    subtitle: 'QR o número directo'
  },
  {
    id: 'daviplata',
    label: 'Daviplata',
    icon: 'smartphone',
    subtitle: 'Daviplata monedero'
  }
];

/**
 * Renderiza el selector de métodos de pago en formato chips/cards.
 * @param {Object} options
 * @param {string} [options.selectedMethod] - ID del método seleccionado (default: 'efectivo')
 * @param {string} [options.name] - Nombre para el input oculto o grupo
 * @returns {string} HTML string
 */
export function renderPaymentMethodSelector({ selectedMethod = 'efectivo', name = 'metodo_pago' } = {}) {
  const chipsHtml = PAYMENT_METHODS.map(method => {
    const isSelected = method.id === selectedMethod;

    const containerClasses = isSelected
      ? 'border-2 border-[#1F3A5F] bg-[#E4ECF5] text-[#1F3A5F] shadow-2xs'
      : 'border border-[#D5CBB8] bg-white text-[#1C1C1C] hover:border-[#8C8272] hover:bg-[#FAF7F2]';

    const checkIndicator = isSelected
      ? '<span class="material-symbols-outlined text-[16px] text-[#1F3A5F] font-bold">check_circle</span>'
      : '<span class="w-4 h-4 rounded-full border border-[#8C8272] shrink-0"></span>';

    return `
      <div
        role="radio"
        aria-checked="${isSelected}"
        tabindex="${isSelected ? '0' : '-1'}"
        data-method-id="${method.id}"
        class="payment-method-chip cursor-pointer rounded-lg p-3 transition-all flex items-center justify-between gap-2.5 min-h-[48px] select-none ${containerClasses}"
      >
        <div class="flex items-center gap-2.5 min-w-0">
          <div class="w-8 h-8 rounded-md bg-[#FAF7F2] border border-[#D5CBB8] flex items-center justify-center shrink-0">
            <span class="material-symbols-outlined text-[20px] ${isSelected ? 'text-[#1F3A5F]' : 'text-[#4F4A42]'}">${method.icon}</span>
          </div>
          <div class="flex flex-col min-w-0">
            <span class="font-sans font-semibold text-xs leading-tight truncate">${method.label}</span>
            <span class="font-sans text-[10px] text-[#6B645A] leading-tight truncate">${method.subtitle}</span>
          </div>
        </div>
        <div class="shrink-0 flex items-center">
          ${checkIndicator}
        </div>
      </div>
    `;
  }).join('');

  return `
    <div class="flex flex-col gap-2">
      <input type="hidden" name="${name}" id="${name}" value="${selectedMethod}" />
      <label class="font-sans font-semibold text-xs text-[#1C1C1C]">
        Método de Pago (Colombia)
      </label>
      <div
        role="radiogroup"
        aria-label="Métodos de pago aceptados"
        class="grid grid-cols-1 sm:grid-cols-2 gap-2"
        id="payment-methods-container"
      >
        ${chipsHtml}
      </div>
    </div>
  `;
}

/**
 * Conecta los eventos de clic y teclado (flechas) para el radiogroup de métodos de pago.
 * @param {HTMLElement} rootContainer - Contenedor padre
 * @param {Function} [onSelect] - Callback invocado con el método seleccionado
 */
export function attachPaymentMethodSelectorListeners(rootContainer, onSelect = null) {
  if (!rootContainer) return;

  const chips = rootContainer.querySelectorAll('.payment-method-chip');
  const hiddenInput = rootContainer.querySelector('input[type="hidden"]');

  const updateSelection = (targetChip) => {
    const selectedId = targetChip.getAttribute('data-method-id');
    if (hiddenInput) {
      hiddenInput.value = selectedId;
    }

    chips.forEach(chip => {
      const isCurrent = chip === targetChip;
      chip.setAttribute('aria-checked', isCurrent ? 'true' : 'false');
      chip.setAttribute('tabindex', isCurrent ? '0' : '-1');

      if (isCurrent) {
        chip.className = 'payment-method-chip cursor-pointer rounded-lg p-3 transition-all flex items-center justify-between gap-2.5 min-h-[48px] select-none border-2 border-[#1F3A5F] bg-[#E4ECF5] text-[#1F3A5F] shadow-2xs';
        const indicator = chip.querySelector('div.shrink-0');
        if (indicator) {
          indicator.innerHTML = '<span class="material-symbols-outlined text-[16px] text-[#1F3A5F] font-bold">check_circle</span>';
        }
      } else {
        chip.className = 'payment-method-chip cursor-pointer rounded-lg p-3 transition-all flex items-center justify-between gap-2.5 min-h-[48px] select-none border border-[#D5CBB8] bg-white text-[#1C1C1C] hover:border-[#8C8272] hover:bg-[#FAF7F2]';
        const indicator = chip.querySelector('div.shrink-0');
        if (indicator) {
          indicator.innerHTML = '<span class="w-4 h-4 rounded-full border border-[#8C8272] shrink-0"></span>';
        }
      }
    });

    if (typeof onSelect === 'function') {
      onSelect(selectedId);
    }
  };

  chips.forEach((chip, index) => {
    chip.addEventListener('click', () => updateSelection(chip));

    chip.addEventListener('keydown', (e) => {
      let nextIndex = null;
      if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
        nextIndex = (index + 1) % chips.length;
      } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
        nextIndex = (index - 1 + chips.length) % chips.length;
      } else if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        updateSelection(chip);
        return;
      }

      if (nextIndex !== null) {
        e.preventDefault();
        chips[nextIndex].focus();
        updateSelection(chips[nextIndex]);
      }
    });
  });
}
