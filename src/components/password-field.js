/**
 * @file password-field.js
 * @description Campo de contraseña reutilizable con toggle accesible de visibilidad (WCAG 2.2 / Heurística #5).
 */

/**
 * Renderiza un input de contraseña con botón interno mostrar/ocultar.
 * @param {Object} options
 * @returns {string}
 */
export function renderPasswordField({
  id,
  label,
  required = true,
  minlength = null,
  placeholder = '',
  autocomplete = 'current-password'
} = {}) {
  return `
    <div class="flex flex-col gap-1.5">
      <label class="font-semibold text-xs text-[#1C1C1C]" for="${id}">
        ${label} ${required ? '<span class="text-[#8B1E1E]">*</span>' : ''}
      </label>
      <div class="relative flex items-center">
        <input
          type="password"
          id="${id}"
          autocomplete="${autocomplete}"
          ${required ? 'required' : ''}
          ${minlength ? `minlength="${minlength}"` : ''}
          ${placeholder ? `placeholder="${placeholder}"` : ''}
          class="h-11 pl-3 pr-12 w-full bg-white border border-[#8C8272] rounded-lg text-sm text-[#1C1C1C] placeholder-[#57534E] focus:outline-none focus:ring-2 focus:ring-[#1F3A5F]"
        />
        <button
          type="button"
          data-toggle-password="${id}"
          aria-label="Mostrar contraseña"
          aria-pressed="false"
          title="Mostrar u ocultar contraseña"
          class="absolute right-1 min-w-[40px] min-h-[40px] flex items-center justify-center rounded-md text-[#57534E] hover:text-[#1C1C1C] hover:bg-[#E8DFCE]/60 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1F3A5F]"
        >
          <span class="material-symbols-outlined text-[20px]" aria-hidden="true">visibility</span>
        </button>
      </div>
    </div>
  `;
}

/**
 * Activa todos los toggles de visibilidad de contraseña dentro del contenedor dado.
 * @param {ParentNode} [root=document]
 */
export function attachPasswordToggles(root = document) {
  root.querySelectorAll('button[data-toggle-password]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const targetId = btn.getAttribute('data-toggle-password');
      const input = targetId ? document.getElementById(targetId) : null;
      if (!input) return;

      const isHidden = input.type === 'password';
      input.type = isHidden ? 'text' : 'password';
      btn.setAttribute('aria-pressed', isHidden ? 'true' : 'false');
      btn.setAttribute('aria-label', isHidden ? 'Ocultar contraseña' : 'Mostrar contraseña');
      const iconEl = btn.querySelector('.material-symbols-outlined');
      if (iconEl) {
        iconEl.textContent = isHidden ? 'visibility_off' : 'visibility';
      }
    });
  });
}
