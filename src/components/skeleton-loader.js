/**
 * SkeletonLoader Component - Estados de Carga Accesibles (WCAG 2.1 AA)
 * Renderiza esqueletos animados mientras los datos se cargan desde src/services/.
 * Utiliza paleta de tokens: bg-[#FAF7F2], borde #D5CBB8 y pulso sutil.
 */

export function renderServiceCardSkeleton(count = 4) {
  return Array.from({ length: count }).map(() => `
    <div class="rounded-lg p-4 border border-[#D5CBB8] bg-[#FAF7F2] animate-pulse flex items-start justify-between gap-3 min-h-[96px]" aria-hidden="true">
      <div class="flex items-start gap-3 w-full">
        <div class="w-5 h-5 rounded bg-[#E8DFCE] shrink-0 mt-0.5"></div>
        <div class="flex flex-col gap-2 w-3/4">
          <div class="h-4 bg-[#E8DFCE] rounded w-2/3"></div>
          <div class="h-3 bg-[#E8DFCE] rounded w-full"></div>
          <div class="h-3 bg-[#E8DFCE] rounded w-1/3 mt-1"></div>
        </div>
      </div>
      <div class="flex flex-col items-end gap-1 shrink-0">
        <div class="h-4 w-16 bg-[#E8DFCE] rounded"></div>
        <div class="h-2.5 w-10 bg-[#E8DFCE] rounded"></div>
      </div>
    </div>
  `).join('');
}

export function renderBarberCardSkeleton(count = 3) {
  return Array.from({ length: count }).map(() => `
    <div class="bg-white rounded-lg p-5 border border-[#D5CBB8] shadow-xs flex flex-col items-center text-center animate-pulse min-h-[220px]" aria-hidden="true">
      <div class="w-20 h-20 rounded-full bg-[#E8DFCE] mb-3"></div>
      <div class="h-4 bg-[#E8DFCE] rounded w-28 mb-2"></div>
      <div class="h-3 bg-[#E8DFCE] rounded w-36 mb-2"></div>
      <div class="h-2.5 bg-[#E8DFCE] rounded w-20 mb-4"></div>
      <div class="w-full h-9 bg-[#E8DFCE] rounded-md"></div>
    </div>
  `).join('');
}

export function renderTableRowSkeleton(columns = 8, rows = 5) {
  return Array.from({ length: rows }).map(() => `
    <tr class="animate-pulse" aria-hidden="true">
      ${Array.from({ length: columns }).map(() => `
        <td class="py-3 px-4">
          <div class="h-3.5 bg-[#E8DFCE] rounded w-full"></div>
        </td>
      `).join('')}
    </tr>
  `).join('');
}
