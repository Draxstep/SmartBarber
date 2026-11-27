/**
 * @file info-note.js
 * @description Nota informativa plana sin aspecto de píldora clicable (evita falsos affordances).
 */

export function renderInfoNote({ text = '', icon = 'info', extraClass = '' } = {}) {
  return `
    <p class="inline-flex items-center gap-1.5 text-xs text-[#57534E] font-normal ${extraClass}">
      <span class="material-symbols-outlined text-[16px] text-[#1F3A5F] shrink-0" aria-hidden="true">${icon}</span>
      <span>${text}</span>
    </p>
  `;
}
