/**
 * @file user-avatar.js
 * @description Componente reutilizable de avatar de usuario/barbero con fallback determinístico a iniciales (WCAG 2.2 SC 1.1.1).
 */

/**
 * Extrae hasta 2 iniciales en mayúsculas de un nombre o correo.
 * @param {string} name
 * @returns {string}
 */
export function getInitials(name = '') {
  const clean = String(name || '').replace(/\(.*?\)/g, '').trim();
  if (!clean) return 'SB';
  const parts = clean.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

/**
 * Renderiza un avatar circular consistente con fallback automático cuando no hay foto o falla su carga.
 * @param {Object} options
 * @param {string|null} [options.src]
 * @param {string} [options.name='Usuario']
 * @param {string} [options.sizeClass='w-11 h-11']
 * @param {string} [options.textClass='text-sm']
 * @param {string} [options.borderClass='border border-[#8C8272]']
 * @param {string} [options.extraImgClass='']
 * @param {string} [options.imgId='']
 * @param {string|null} [options.statusDotClass=null]
 * @param {string} [options.statusTitle='']
 * @param {string} [options.bgClass='bg-[#1F3A5F] text-white']
 * @returns {string}
 */
export function renderUserAvatar({
  src = null,
  name = 'Usuario',
  sizeClass = 'w-11 h-11',
  textClass = 'text-sm',
  borderClass = 'border border-[#8C8272]',
  extraImgClass = '',
  imgId = '',
  statusDotClass = null,
  statusTitle = '',
  bgClass = 'bg-[#1F3A5F] text-white'
} = {}) {
  const initials = getInitials(name);
  const hasSrc = Boolean(src && typeof src === 'string' && src.trim());
  const altText = `Foto de perfil de ${name}`;

  return `
    <div class="relative inline-flex shrink-0 ${sizeClass}">
      ${hasSrc ? `
        <img
          ${imgId ? `id="${imgId}"` : ''}
          src="${src}"
          alt="${altText}"
          loading="lazy"
          decoding="async"
          data-avatar-img="true"
          class="${sizeClass} rounded-full object-cover ${borderClass} ${extraImgClass}"
          onerror="this.classList.add('hidden'); if (this.nextElementSibling) this.nextElementSibling.classList.remove('hidden');"
        />
      ` : ''}
      <div
        aria-label="${altText}"
        class="${sizeClass} rounded-full ${bgClass} ${borderClass} flex items-center justify-center font-sans font-bold ${textClass} select-none shadow-xs ${hasSrc ? 'hidden' : ''}"
      >
        ${initials}
      </div>
      ${statusDotClass ? `
        <span
          class="absolute bottom-0 right-0 w-3 h-3 rounded-full ${statusDotClass} border-2 border-white"
          ${statusTitle ? `title="${statusTitle}"` : ''}
        ></span>
      ` : ''}
    </div>
  `;
}
