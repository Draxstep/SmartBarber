/**
 * UIDrawer Component - Panel Deslizante Accesible
 * Soporta panel lateral derecho (Desktop/Tablet) o bottom sheet (Móvil).
 * Conforme a DESIGN.md y WCAG 2.1 AA.
 */

let activeDrawer = null;
let lastFocusedElement = null;

/**
 * Abre un panel deslizante (drawer).
 * @param {Object} options
 * @param {string} options.title - Título del drawer
 * @param {string} [options.subtitle] - Subtítulo descriptivo
 * @param {string} options.contentHtml - Contenido HTML del panel
 * @param {'right'|'bottom'} [options.position] - Posición ('right' para desktop, 'bottom' para móvil)
 * @param {Function} [options.onClose] - Callback invocado al cerrar
 * @returns {HTMLElement}
 */
export function openDrawer({
  title = 'Detalles',
  subtitle = '',
  contentHtml = '',
  position = 'right',
  onClose = null
} = {}) {
  lastFocusedElement = document.activeElement;

  if (activeDrawer) {
    closeDrawer();
  }

  // Backdrop
  const backdrop = document.createElement('div');
  backdrop.className = 'ui-drawer-backdrop';
  backdrop.setAttribute('aria-hidden', 'true');

  // Panel contenedor
  const panel = document.createElement('div');
  const posClass = position === 'bottom' ? 'drawer-bottom' : 'drawer-right';
  panel.className = `ui-drawer-panel ${posClass} flex flex-col`;
  panel.setAttribute('role', 'dialog');
  panel.setAttribute('aria-modal', 'true');
  panel.setAttribute('aria-labelledby', 'drawer-title');

  panel.innerHTML = `
    <!-- HEADER -->
    <header class="p-4 sm:p-5 border-b border-[#D5CBB8] flex items-start justify-between gap-3 bg-[#FAF7F2]">
      <div class="flex flex-col min-w-0">
        <h2 id="drawer-title" class="font-serif text-lg sm:text-xl font-bold text-[#1C1C1C]">
          ${title}
        </h2>
        ${subtitle ? `
          <p class="font-sans text-xs text-[#6B645A] mt-1">${subtitle}</p>
        ` : ''}
      </div>
      <button
        type="button"
        id="drawer-btn-close"
        class="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-md text-[#4F4A42] hover:bg-[#E8DFCE] hover:text-[#1C1C1C] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1F3A5F]"
        aria-label="Cerrar panel"
      >
        <span class="material-symbols-outlined text-[20px]">close</span>
      </button>
    </header>

    <!-- CONTENT BODY -->
    <div id="drawer-body" class="p-4 sm:p-6 overflow-y-auto flex-1 font-sans text-sm text-[#1C1C1C] bg-[#FAF7F2]">
      ${contentHtml}
    </div>
  `;

  document.body.appendChild(backdrop);
  document.body.appendChild(panel);

  activeDrawer = { backdrop, panel, onClose };

  // Trigger animations in next microtask
  requestAnimationFrame(() => {
    backdrop.classList.add('active');
    panel.classList.add('active');
  });

  // Listeners
  backdrop.addEventListener('click', () => closeDrawer());

  const btnClose = panel.querySelector('#drawer-btn-close');
  if (btnClose) {
    btnClose.addEventListener('click', () => closeDrawer());
  }

  // Escape key
  const handleKeydown = (e) => {
    if (e.key === 'Escape') {
      closeDrawer();
    } else if (e.key === 'Tab') {
      // Focus trap
      const focusables = panel.querySelectorAll(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );
      if (focusables.length === 0) return;

      const first = focusables[0];
      const last = focusables[focusables.length - 1];

      if (e.shiftKey) {
        if (document.activeElement === first) {
          last.focus();
          e.preventDefault();
        }
      } else {
        if (document.activeElement === last) {
          first.focus();
          e.preventDefault();
        }
      }
    }
  };

  document.addEventListener('keydown', handleKeydown);
  activeDrawer.handleKeydown = handleKeydown;

  // Auto focus first interactive
  setTimeout(() => {
    const firstInteractive = panel.querySelector('button, input, select');
    if (firstInteractive) firstInteractive.focus();
  }, 100);

  return panel;
}

/**
 * Cierra y destruye el drawer activo restaurando el foco.
 */
export function closeDrawer() {
  if (!activeDrawer) return;

  const { backdrop, panel, onClose, handleKeydown } = activeDrawer;

  if (handleKeydown) {
    document.removeEventListener('keydown', handleKeydown);
  }

  backdrop.classList.remove('active');
  panel.classList.remove('active');

  setTimeout(() => {
    if (backdrop.parentNode) backdrop.parentNode.removeChild(backdrop);
    if (panel.parentNode) panel.parentNode.removeChild(panel);
  }, 280);

  if (typeof onClose === 'function') {
    onClose();
  }

  activeDrawer = null;

  if (lastFocusedElement && typeof lastFocusedElement.focus === 'function') {
    lastFocusedElement.focus();
    lastFocusedElement = null;
  }
}
