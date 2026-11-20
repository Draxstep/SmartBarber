/**
 * UIDialog Component - VanillaJS Accesible (WCAG 2.1 AA)
 * Utiliza la API nativa de navegador HTMLDialogElement (<dialog>).
 * Incluye trampa de foco, tecla Escape, clic en backdrop y restauración de foco.
 */

let activeDialog = null;
let lastFocusedElement = null;

/**
 * Abre una ventana modal accesible.
 * @param {Object} options
 * @param {string} options.title - Título del diálogo
 * @param {string} [options.subtitle] - Subtítulo descriptivo
 * @param {string} options.contentHtml - Cuerpo HTML del modal
 * @param {string} [options.confirmText] - Texto del botón de confirmación (ej: 'Guardar', 'Aceptar')
 * @param {string} [options.cancelText] - Texto del botón de cancelación (default: 'Cancelar')
 * @param {'primary'|'danger'|'accent'} [options.confirmVariant] - Estilo del botón principal
 * @param {Function} [options.onConfirm] - Callback invocado al confirmar
 * @param {Function} [options.onClose] - Callback invocado al cerrar
 * @returns {HTMLDialogElement}
 */
export function openDialog({
  title = 'Confirmación',
  subtitle = '',
  contentHtml = '',
  confirmText = 'Aceptar',
  cancelText = 'Cancelar',
  confirmVariant = 'primary',
  onConfirm = null,
  onClose = null
} = {}) {
  // Guardar elemento con foco actual para restaurarlo al cerrar
  lastFocusedElement = document.activeElement;

  // Remover diálogo anterior si existiese
  if (activeDialog) {
    closeDialog();
  }

  // Crear elemento <dialog>
  const dialog = document.createElement('dialog');
  dialog.className = 'ui-modal';
  dialog.setAttribute('aria-modal', 'true');
  dialog.setAttribute('aria-labelledby', 'dialog-title');
  if (subtitle) {
    dialog.setAttribute('aria-describedby', 'dialog-subtitle');
  }

  let confirmBtnClasses = 'bg-[#1F3A5F] hover:bg-[#162B47] text-white';
  if (confirmVariant === 'danger') {
    confirmBtnClasses = 'bg-[#B3261E] hover:bg-[#8B1E1E] text-white';
  } else if (confirmVariant === 'accent') {
    confirmBtnClasses = 'bg-[#8B1E1E] hover:bg-[#6E1616] text-white';
  }

  dialog.innerHTML = `
    <div class="flex flex-col max-h-[85vh] w-full">
      <!-- HEADER -->
      <header class="p-4 sm:p-5 border-b border-[#D5CBB8] flex items-start justify-between gap-3 bg-[#FAF7F2] rounded-t-xl">
        <div class="flex flex-col min-w-0">
          <h2 id="dialog-title" class="font-serif text-lg sm:text-xl font-bold text-[#1C1C1C] leading-snug">
            ${title}
          </h2>
          ${subtitle ? `
            <p id="dialog-subtitle" class="font-sans text-xs text-[#6B645A] mt-1">
              ${subtitle}
            </p>
          ` : ''}
        </div>
        <button
          type="button"
          id="dialog-btn-close-x"
          class="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-md text-[#4F4A42] hover:bg-[#E8DFCE] hover:text-[#1C1C1C] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1F3A5F]"
          aria-label="Cerrar modal"
        >
          <span class="material-symbols-outlined text-[20px]">close</span>
        </button>
      </header>

      <!-- BODY -->
      <div id="dialog-content" class="p-4 sm:p-6 overflow-y-auto font-sans text-sm text-[#1C1C1C] bg-[#FAF7F2]">
        ${contentHtml}
      </div>

      <!-- FOOTER ACTIONS -->
      <footer class="p-4 border-t border-[#D5CBB8] bg-[#FAF7F2] rounded-b-xl flex items-center justify-end gap-2.5">
        ${cancelText ? `
          <button
            type="button"
            id="dialog-btn-cancel"
            class="min-h-[44px] px-4 py-2 rounded-md border border-[#8C8272] text-[#1C1C1C] hover:bg-[#E8DFCE] font-sans font-semibold text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1F3A5F]"
          >
            ${cancelText}
          </button>
        ` : ''}
        ${confirmText ? `
          <button
            type="button"
            id="dialog-btn-confirm"
            class="min-h-[44px] px-5 py-2 rounded-md font-sans font-semibold text-xs transition-all shadow-sm active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1F3A5F] ${confirmBtnClasses}"
          >
            ${confirmText}
          </button>
        ` : ''}
      </footer>
    </div>
  `;

  document.body.appendChild(dialog);
  activeDialog = dialog;

  // Clic fuera del contenido (en el backdrop) cierra el diálogo
  dialog.addEventListener('click', (event) => {
    const rect = dialog.getBoundingClientRect();
    const isInDialog = (
      rect.top <= event.clientY &&
      event.clientY <= rect.top + rect.height &&
      rect.left <= event.clientX &&
      event.clientX <= rect.left + rect.width
    );
    if (!isInDialog) {
      handleClose(onClose);
    }
  });

  // Evento cancelar nativo de <dialog> (tecla Escape)
  dialog.addEventListener('cancel', (e) => {
    e.preventDefault();
    handleClose(onClose);
  });

  // Botón X de cabecera
  const btnCloseX = dialog.querySelector('#dialog-btn-close-x');
  if (btnCloseX) {
    btnCloseX.addEventListener('click', () => handleClose(onClose));
  }

  // Botón Cancelar del footer
  const btnCancel = dialog.querySelector('#dialog-btn-cancel');
  if (btnCancel) {
    btnCancel.addEventListener('click', () => handleClose(onClose));
  }

  // Botón Confirmar del footer
  const btnConfirm = dialog.querySelector('#dialog-btn-confirm');
  if (btnConfirm) {
    btnConfirm.addEventListener('click', () => {
      if (typeof onConfirm === 'function') {
        const shouldClose = onConfirm();
        if (shouldClose !== false) {
          handleClose(onClose);
        }
      } else {
        handleClose(onClose);
      }
    });
  }

  // Trampa de foco accesible (Focus Trap)
  dialog.addEventListener('keydown', (e) => {
    if (e.key !== 'Tab') return;

    const focusables = dialog.querySelectorAll(
      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    );
    if (focusables.length === 0) return;

    const firstElement = focusables[0];
    const lastElement = focusables[focusables.length - 1];

    if (e.shiftKey) {
      if (document.activeElement === firstElement) {
        lastElement.focus();
        e.preventDefault();
      }
    } else {
      if (document.activeElement === lastElement) {
        firstElement.focus();
        e.preventDefault();
      }
    }
  });

  // Mostrar modal usando API nativa
  dialog.showModal();

  // Enfocar el primer elemento interactivo
  const firstInput = dialog.querySelector('input:not([disabled]), button:not([disabled])');
  if (firstInput) {
    firstInput.focus();
  }

  return dialog;
}

function handleClose(callback) {
  closeDialog();
  if (typeof callback === 'function') {
    callback();
  }
}

/**
 * Cierra y destruye el diálogo activo, restaurando el foco.
 */
export function closeDialog() {
  if (activeDialog) {
    try {
      activeDialog.close();
    } catch (_) {
      // Ignorar si ya estaba cerrado
    }
    if (activeDialog.parentNode) {
      activeDialog.parentNode.removeChild(activeDialog);
    }
    activeDialog = null;
  }

  // Restaurar foco al elemento detonador
  if (lastFocusedElement && typeof lastFocusedElement.focus === 'function') {
    lastFocusedElement.focus();
    lastFocusedElement = null;
  }
}
