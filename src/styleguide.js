/**
 * SmartBarber - Catálogo UI & Design System (styleguide.html)
 * Showcase interactivo de tokens, tipografía, componentes núcleo y comportamiento accesible.
 */

import { openDialog } from './components/ui-dialog.js';
import { openDrawer } from './components/ui-drawer.js';
import {
  renderPaymentMethodSelector,
  attachPaymentMethodSelectorListeners,
  PAYMENT_METHODS
} from './components/payment-method-selector.js';
import { renderStatusBadge } from './components/status-badge.js';
import { renderKpiCard } from './components/kpi-card.js';
import { renderEmptyState } from './components/empty-state.js';
import { renderServiceCard } from './components/service-card.js';
import { renderBookingStepper } from './components/booking-stepper.js';
import { formatCOP, formatDurationBlocks } from './utils/formatters.js';

const app = document.getElementById('app');

function renderStyleguide() {
  if (!app) return;

  const colorPalettes = [
    {
      group: 'Marca & Acción',
      colors: [
        { name: 'Prussian Blue (Primary)', token: '--color-brand-primary', hex: '#1F3A5F', bg: 'bg-[#1F3A5F]', text: 'text-white' },
        { name: 'Prussian Hover', token: '--color-brand-primary-hover', hex: '#162B47', bg: 'bg-[#162B47]', text: 'text-white' },
        { name: 'Carbon Black (Structure)', token: '--color-brand-secondary', hex: '#1C1C1C', bg: 'bg-[#1C1C1C]', text: 'text-[#F2EBDD]' },
        { name: 'Sangria Red (Accent CTA)', token: '--color-brand-accent', hex: '#8B1E1E', bg: 'bg-[#8B1E1E]', text: 'text-white' },
        { name: 'Sangria Hover', token: '--color-brand-accent-hover', hex: '#6E1616', bg: 'bg-[#6E1616]', text: 'text-white' }
      ]
    },
    {
      group: 'Superficies & Fondos',
      colors: [
        { name: 'Warm Alabaster (Canvas)', token: '--color-bg-canvas', hex: '#F2EBDD', bg: 'bg-[#F2EBDD]', text: 'text-[#1C1C1C]', border: true },
        { name: 'Warm Ivory (Cards/Modals)', token: '--color-bg-surface', hex: '#FAF7F2', bg: 'bg-[#FAF7F2]', text: 'text-[#1C1C1C]', border: true },
        { name: 'Parchment (Hover/Disabled)', token: '--color-bg-surface-subtle', hex: '#E8DFCE', bg: 'bg-[#E8DFCE]', text: 'text-[#1C1C1C]', border: true },
        { name: 'Pure White (Inputs)', token: '--color-bg-input', hex: '#FFFFFF', bg: 'bg-white', text: 'text-[#1C1C1C]', border: true },
        { name: 'Charcoal Lift (Dark Active)', token: '--color-bg-dark-elevated', hex: '#2A2A2A', bg: 'bg-[#2A2A2A]', text: 'text-[#F2EBDD]' }
      ]
    },
    {
      group: 'Estados Semánticos (WCAG 2.1 AA)',
      colors: [
        { name: 'Éxito / Disponible', token: '--color-status-success', hex: '#235D3A / #E3EFE7', bg: 'bg-[#E3EFE7]', text: 'text-[#235D3A]', border: true },
        { name: 'Advertencia / Stock Bajo', token: '--color-status-warning', hex: '#8A5300 / #FDF1DC', bg: 'bg-[#FDF1DC]', text: 'text-[#8A5300]', border: true },
        { name: 'Error / Cancelada / Agotado', token: '--color-status-error', hex: '#B3261E / #FCE8E6', bg: 'bg-[#FCE8E6]', text: 'text-[#B3261E]', border: true },
        { name: 'Info / Confirmada', token: '--color-status-info', hex: '#1F3A5F / #E4ECF5', bg: 'bg-[#E4ECF5]', text: 'text-[#1F3A5F]', border: true },
        { name: 'Neutro / Inactivo', token: '--color-status-neutral', hex: '#4F4A42 / #E8DFCE', bg: 'bg-[#E8DFCE]', text: 'text-[#4F4A42]', border: true }
      ]
    }
  ];

  const appointmentStatuses = ['pendiente', 'confirmada', 'completada', 'cancelada', 'no_asistio'];
  const inventoryStatuses = ['disponible', 'stock_bajo', 'agotado'];

  const sampleServices = [
    {
      id: 's1',
      nombre: 'Corte Clásico Tradicional',
      descripcion: 'Tijera y máquina, lavado con toalla caliente y peinado con cera mate.',
      precio: 25000,
      duracionMinutos: 30
    },
    {
      id: 's2',
      nombre: 'Combo Real (Corte + Barba)',
      descripcion: 'Experiencia integral de corte tradicional y diseño de barba con aceites balsámicos.',
      precio: 40000,
      duracionMinutos: 60
    }
  ];

  app.innerHTML = `
    <div class="max-w-[1180px] mx-auto py-8 px-4 flex flex-col gap-12 text-[#1C1C1C]">
      <!-- HEADER PRINCIPAL -->
      <header class="border-b-2 border-[#8B1E1E] pb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div class="inline-flex items-center gap-2 px-2.5 py-1 rounded bg-[#1C1C1C] text-[#F2EBDD] font-sans text-xs font-semibold uppercase tracking-wider mb-2">
            <span class="w-2 h-2 rounded-full bg-[#8B1E1E]"></span>
            <span>Design System & Catálogo UI</span>
          </div>
          <h1 class="font-serif text-3xl sm:text-4xl font-bold tracking-tight text-[#1C1C1C]">
            SmartBarber Heritage Craft UI
          </h1>
          <p class="font-sans text-sm text-[#4F4A42] mt-1">
            Componentes accesibles en VanillaJS moderno (ES Modules), tokens de diseño y contratos visuales WCAG 2.1 AA.
          </p>
        </div>

        <div class="flex items-center gap-2">
          <a href="/" class="min-h-[40px] px-3.5 py-2 rounded-md bg-white border border-[#8C8272] text-xs font-semibold text-[#1C1C1C] hover:bg-[#FAF7F2] transition-colors flex items-center gap-1.5 shadow-2xs">
            <span class="material-symbols-outlined text-[16px]">public</span>
            <span>Portal Público</span>
          </a>
          <a href="/backoffice.html" class="min-h-[40px] px-3.5 py-2 rounded-md bg-[#1C1C1C] text-[#F2EBDD] text-xs font-semibold hover:bg-black transition-colors flex items-center gap-1.5 shadow-2xs">
            <span class="material-symbols-outlined text-[16px]">admin_panel_settings</span>
            <span>Backoffice</span>
          </a>
        </div>
      </header>

      <!-- 1. PALETA DE COLORES Y TOKENS -->
      <section id="colores" class="flex flex-col gap-4">
        <div class="flex items-center gap-2 pb-2 border-b border-[#D5CBB8]">
          <span class="material-symbols-outlined text-[22px] text-[#1F3A5F]">palette</span>
          <h2 class="font-serif text-2xl font-bold">1. Paleta de Colores & Tokens</h2>
        </div>

        <div class="flex flex-col gap-6">
          ${colorPalettes.map(group => `
            <div>
              <h3 class="font-sans text-xs font-bold uppercase tracking-wider text-[#6B645A] mb-3">${group.group}</h3>
              <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                ${group.colors.map(c => `
                  <div class="rounded-lg p-3 ${c.bg} ${c.text} ${c.border ? 'border border-[#D5CBB8]' : ''} shadow-2xs flex flex-col justify-between min-h-[90px]">
                    <span class="font-sans font-bold text-xs leading-tight">${c.name}</span>
                    <div class="mt-2 flex flex-col">
                      <span class="font-mono text-[11px] font-semibold opacity-90 tabular-nums">${c.hex}</span>
                      <span class="font-mono text-[9px] opacity-75">${c.token}</span>
                    </div>
                  </div>
                `).join('')}
              </div>
            </div>
          `).join('')}
        </div>
      </section>

      <!-- 2. ESCALA TIPOGRÁFICA -->
      <section id="tipografia" class="flex flex-col gap-4">
        <div class="flex items-center gap-2 pb-2 border-b border-[#D5CBB8]">
          <span class="material-symbols-outlined text-[22px] text-[#1F3A5F]">text_fields</span>
          <h2 class="font-serif text-2xl font-bold">2. Escala Tipográfica Oficial</h2>
        </div>

        <div class="bg-[#FAF7F2] border border-[#D5CBB8] rounded-xl p-5 space-y-4">
          <div class="flex flex-col sm:flex-row sm:items-baseline justify-between border-b border-[#D5CBB8]/60 pb-3 gap-2">
            <span class="font-sans text-xs font-semibold text-[#6B645A] w-48">Playfair Display (Hero)</span>
            <span class="font-serif text-3xl sm:text-4xl font-bold text-[#1C1C1C]">El Oficio Tradicional</span>
            <span class="font-mono text-xs text-[#6B645A]">36px · 700</span>
          </div>

          <div class="flex flex-col sm:flex-row sm:items-baseline justify-between border-b border-[#D5CBB8]/60 pb-3 gap-2">
            <span class="font-sans text-xs font-semibold text-[#6B645A] w-48">Playfair Display (H1)</span>
            <span class="font-serif text-2xl font-bold text-[#1C1C1C]">Agenda del Día & Operación</span>
            <span class="font-mono text-xs text-[#6B645A]">28px · 700</span>
          </div>

          <div class="flex flex-col sm:flex-row sm:items-baseline justify-between border-b border-[#D5CBB8]/60 pb-3 gap-2">
            <span class="font-sans text-xs font-semibold text-[#6B645A] w-48">Inter (H3 / UI Bold)</span>
            <span class="font-sans text-lg font-semibold text-[#1C1C1C]">Corte Clásico Tradicional</span>
            <span class="font-mono text-xs text-[#6B645A]">18px · 600</span>
          </div>

          <div class="flex flex-col sm:flex-row sm:items-baseline justify-between border-b border-[#D5CBB8]/60 pb-3 gap-2">
            <span class="font-sans text-xs font-semibold text-[#6B645A] w-48">Inter (Body UI)</span>
            <span class="font-sans text-sm text-[#4F4A42]">Puntualidad en bloques de 30 minutos y atención personalizada.</span>
            <span class="font-mono text-xs text-[#6B645A]">14px · 400</span>
          </div>

          <div class="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2">
            <span class="font-sans text-xs font-semibold text-[#6B645A] w-48">JetBrains Mono (Tabular)</span>
            <span class="font-mono text-base font-bold text-[#1F3A5F] tabular-nums">
              ${formatCOP(485000)} · SB-9RGTZM · 10:30 AM
            </span>
            <span class="font-mono text-xs text-[#6B645A]">14px · tabular-nums</span>
          </div>
        </div>
      </section>

      <!-- 3. BOTONES Y ACCIONES (WCAG AA) -->
      <section id="botones" class="flex flex-col gap-4">
        <div class="flex items-center gap-2 pb-2 border-b border-[#D5CBB8]">
          <span class="material-symbols-outlined text-[22px] text-[#1F3A5F]">smart_button</span>
          <h2 class="font-serif text-2xl font-bold">3. Galería de Botones (Min-height $\ge 44\text{ px}$)</h2>
        </div>

        <div class="bg-[#FAF7F2] border border-[#D5CBB8] rounded-xl p-5 flex flex-wrap items-center gap-4">
          <!-- Primary -->
          <button type="button" class="min-h-[44px] px-5 py-2 rounded-md bg-[#1F3A5F] hover:bg-[#162B47] text-white font-sans font-semibold text-xs transition-all shadow-sm active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1F3A5F]">
            Primario Operacional
          </button>

          <!-- Accent CTA -->
          <button type="button" class="min-h-[44px] px-5 py-2 rounded-md bg-[#8B1E1E] hover:bg-[#6E1616] text-white font-sans font-semibold text-xs transition-all shadow-sm active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1F3A5F]">
            Acento Conversión (CTA)
          </button>

          <!-- Secondary Outlined -->
          <button type="button" class="min-h-[44px] px-5 py-2 rounded-md border-[1.5px] border-[#1F3A5F] text-[#1F3A5F] hover:bg-[#E4ECF5] font-sans font-semibold text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1F3A5F]">
            Secundario Delineado
          </button>

          <!-- Danger Destructive -->
          <button type="button" class="min-h-[44px] px-5 py-2 rounded-md bg-[#FCE8E6] border border-[#B3261E] text-[#B3261E] hover:bg-[#B3261E] hover:text-white font-sans font-semibold text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B3261E]">
            Destructivo (Anular)
          </button>

          <!-- Disabled -->
          <button type="button" disabled class="min-h-[44px] px-5 py-2 rounded-md bg-[#E8DFCE] text-[#6B645A] font-sans font-semibold text-xs cursor-not-allowed">
            Deshabilitado
          </button>

          <!-- Loading Spinner -->
          <button type="button" class="min-h-[44px] px-5 py-2 rounded-md bg-[#1F3A5F] text-white font-sans font-semibold text-xs flex items-center gap-2 opacity-90 cursor-wait">
            <span class="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
            <span>Guardando...</span>
          </button>
        </div>
      </section>

      <!-- 4. STATUS BADGES (Citas & Inventario) -->
      <section id="badges" class="flex flex-col gap-4">
        <div class="flex items-center gap-2 pb-2 border-b border-[#D5CBB8]">
          <span class="material-symbols-outlined text-[22px] text-[#1F3A5F]">verified</span>
          <h2 class="font-serif text-2xl font-bold">4. Status Badges Semánticos (Ícono + Texto + WCAG)</h2>
        </div>

        <div class="bg-[#FAF7F2] border border-[#D5CBB8] rounded-xl p-5 flex flex-col gap-5">
          <div>
            <h3 class="font-sans text-xs font-bold uppercase tracking-wider text-[#6B645A] mb-2.5">Estados de Turnos & Citas</h3>
            <div class="flex flex-wrap gap-2.5">
              ${appointmentStatuses.map(s => renderStatusBadge(s)).join('')}
            </div>
          </div>

          <div class="pt-3 border-t border-[#D5CBB8]/60">
            <h3 class="font-sans text-xs font-bold uppercase tracking-wider text-[#6B645A] mb-2.5">Estados de Stock & Kardex</h3>
            <div class="flex flex-wrap gap-2.5">
              ${inventoryStatuses.map(s => renderStatusBadge(s)).join('')}
            </div>
          </div>
        </div>
      </section>

      <!-- 5. SELECTOR DE MÉTODOS DE PAGO COLOMBIA -->
      <section id="selector-pago" class="flex flex-col gap-4">
        <div class="flex items-center gap-2 pb-2 border-b border-[#D5CBB8]">
          <span class="material-symbols-outlined text-[22px] text-[#1F3A5F]">payments</span>
          <h2 class="font-serif text-2xl font-bold">5. Selector de Métodos de Pago (5 Métodos Colombia)</h2>
        </div>

        <div class="bg-[#FAF7F2] border border-[#D5CBB8] rounded-xl p-5 flex flex-col gap-4 max-w-xl">
          <div id="demo-payment-selector-wrapper">
            ${renderPaymentMethodSelector({ selectedMethod: 'efectivo' })}
          </div>

          <div class="p-3 rounded-lg bg-[#E4ECF5] border border-[#1F3A5F]/20 text-xs text-[#1F3A5F] flex items-center justify-between">
            <span class="font-semibold">Selección activa:</span>
            <span id="selected-method-indicator" class="font-mono font-bold uppercase">Efectivo</span>
          </div>
        </div>
      </section>

      <!-- 6. COMPONENTES MODALES (ui-dialog & ui-drawer) -->
      <section id="modales" class="flex flex-col gap-4">
        <div class="flex items-center gap-2 pb-2 border-b border-[#D5CBB8]">
          <span class="material-symbols-outlined text-[22px] text-[#1F3A5F]">web_asset</span>
          <h2 class="font-serif text-2xl font-bold">6. Modales & Drawers Accesibles (Demostración en Vivo)</h2>
        </div>

        <div class="bg-[#FAF7F2] border border-[#D5CBB8] rounded-xl p-5 flex flex-wrap items-center gap-3">
          <button
            type="button"
            id="demo-btn-dialog-primary"
            class="min-h-[44px] px-4 py-2 rounded-md bg-[#1F3A5F] hover:bg-[#162B47] text-white font-sans font-semibold text-xs shadow-sm transition-all"
          >
            Abrir Dialog Estándar
          </button>

          <button
            type="button"
            id="demo-btn-dialog-danger"
            class="min-h-[44px] px-4 py-2 rounded-md bg-[#FCE8E6] border border-[#B3261E] text-[#B3261E] hover:bg-[#B3261E] hover:text-white font-sans font-semibold text-xs transition-colors"
          >
            Abrir Dialog Destructivo
          </button>

          <button
            type="button"
            id="demo-btn-drawer-right"
            class="min-h-[44px] px-4 py-2 rounded-md border-[1.5px] border-[#1F3A5F] text-[#1F3A5F] hover:bg-[#E4ECF5] font-sans font-semibold text-xs transition-colors"
          >
            Abrir Side Drawer (Desktop)
          </button>

          <button
            type="button"
            id="demo-btn-drawer-bottom"
            class="min-h-[44px] px-4 py-2 rounded-md bg-[#FAF7F2] border border-[#8C8272] text-[#1C1C1C] hover:bg-[#E8DFCE] font-sans font-semibold text-xs transition-colors"
          >
            Abrir Bottom Sheet (Móvil)
          </button>
        </div>
      </section>

      <!-- SIMULACIÓN DE ERRORES HTTP & CASOS LÍMITE (FASE 4) -->
      <section id="errores-http" class="flex flex-col gap-4">
        <div class="flex items-center gap-2 pb-2 border-b border-[#D5CBB8]">
          <span class="material-symbols-outlined text-[22px] text-[#B3261E]">error_outline</span>
          <h2 class="font-serif text-2xl font-bold">Manejo de Errores HTTP & Casos Límite (Fase 4)</h2>
        </div>

        <div class="bg-[#FAF7F2] border border-[#D5CBB8] rounded-xl p-5 flex flex-col gap-3">
          <p class="text-xs text-[#4F4A42]">
            Demostración en vivo de errores tipados desde <code>src/services/http-client.js</code> y feedback visual accesible:
          </p>
          <div class="flex flex-wrap items-center gap-3">
            <button type="button" id="demo-err-409" class="min-h-[44px] px-3.5 py-2 rounded-md bg-[#FDF1DC] border border-[#8A5300] text-[#8A5300] hover:bg-[#8A5300] hover:text-white text-xs font-semibold transition-colors">
              Simular Error 409 (Conflicto GiST)
            </button>
            <button type="button" id="demo-err-400" class="min-h-[44px] px-3.5 py-2 rounded-md bg-[#FCE8E6] border border-[#B3261E] text-[#B3261E] hover:bg-[#B3261E] hover:text-white text-xs font-semibold transition-colors">
              Simular Error 400 (Validación Celular)
            </button>
            <button type="button" id="demo-err-429" class="min-h-[44px] px-3.5 py-2 rounded-md bg-white border border-[#8C8272] text-[#1C1C1C] hover:bg-[#E8DFCE] text-xs font-semibold transition-colors">
              Simular Error 429 (Límite Peticiones)
            </button>
            <button type="button" id="demo-err-401" class="min-h-[44px] px-3.5 py-2 rounded-md bg-[#E8DFCE] text-[#4F4A42] hover:bg-[#D5CBB8] text-xs font-semibold transition-colors">
              Simular Error 401 (Sesión Expirada)
            </button>
          </div>
        </div>
      </section>

      <!-- 7. TARJETAS DE SERVICIO, KPIS Y STEPPER -->
      <section id="cards-kpis" class="flex flex-col gap-4">
        <div class="flex items-center gap-2 pb-2 border-b border-[#D5CBB8]">
          <span class="material-symbols-outlined text-[22px] text-[#1F3A5F]">dashboard</span>
          <h2 class="font-serif text-2xl font-bold">7. Tarjetas de Servicio, Indicadores KPI & Stepper</h2>
        </div>

        <!-- Stepper Preview -->
        <div class="bg-[#FAF7F2] border border-[#D5CBB8] rounded-xl p-4">
          <span class="font-sans text-xs font-bold uppercase tracking-wider text-[#6B645A] block mb-3">Booking Stepper (Paso 3 Activo)</span>
          ${renderBookingStepper(3)}
        </div>

        <!-- KPIs Grid -->
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          ${renderKpiCard({
            label: 'Ingresos Hoy',
            value: formatCOP(485000),
            caption: '14 cobros en caja',
            icon: 'payments',
            iconBg: 'bg-[#E3EFE7]',
            iconColor: 'text-[#235D3A]',
            trend: { text: '+12%', isPositive: true }
          })}
          ${renderKpiCard({
            label: 'Turnos del Día',
            value: '18',
            caption: '14 confirmados · 4 pendientes',
            icon: 'calendar_month',
            iconBg: 'bg-[#E4ECF5]',
            iconColor: 'text-[#1F3A5F]'
          })}
          ${renderKpiCard({
            label: 'Cortes Realizados',
            value: '10',
            caption: '8 agendados · 2 walk-in',
            icon: 'content_cut',
            iconBg: 'bg-[#FAF7F2]',
            iconColor: 'text-[#1C1C1C]'
          })}
          ${renderKpiCard({
            label: 'Alertas Inventario',
            value: '3',
            caption: '2 bajo stock · 1 agotado',
            icon: 'warning',
            iconBg: 'bg-[#FDF1DC]',
            iconColor: 'text-[#8A5300]',
            trend: { text: '-2', isPositive: false }
          })}
        </div>

        <!-- Service Cards Grid -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          ${sampleServices.map((s, idx) => renderServiceCard(s, idx === 0)).join('')}
        </div>
      </section>

      <!-- 8. ESTADOS VACÍOS (Empty States) -->
      <section id="empty-state" class="flex flex-col gap-4">
        <div class="flex items-center gap-2 pb-2 border-b border-[#D5CBB8]">
          <span class="material-symbols-outlined text-[22px] text-[#1F3A5F]">search_off</span>
          <h2 class="font-serif text-2xl font-bold">8. Estado Vacío (Empty State)</h2>
        </div>

        ${renderEmptyState({
          title: 'No hay citas registradas para este día',
          description: 'Todos los sillones de barbería se encuentran disponibles para agendamiento o turnos walk-in.',
          icon: 'calendar_today',
          actionText: 'Crear Primera Cita',
          actionId: 'btn-demo-empty-create'
        })}
      </section>
    </div>
  `;

  attachStyleguideListeners();
}

function attachStyleguideListeners() {
  // Listener del selector de pago interactivo
  const paymentContainer = document.getElementById('demo-payment-selector-wrapper');
  const indicator = document.getElementById('selected-method-indicator');

  if (paymentContainer) {
    attachPaymentMethodSelectorListeners(paymentContainer, (selectedId) => {
      const match = PAYMENT_METHODS.find(m => m.id === selectedId);
      if (indicator && match) {
        indicator.textContent = match.label;
      }
    });
  }

  // Demo Dialog Estándar
  const btnDialogPrimary = document.getElementById('demo-btn-dialog-primary');
  if (btnDialogPrimary) {
    btnDialogPrimary.addEventListener('click', () => {
      openDialog({
        title: 'Registrar Cobro de Cita #SB-00124',
        subtitle: 'Cliente: Sebastián Gómez · Servicio: Corte Clásico',
        contentHtml: `
          <div class="flex flex-col gap-4">
            <div class="p-3 rounded-lg bg-[#FAF7F2] border border-[#D5CBB8] flex items-center justify-between">
              <span class="font-sans text-xs text-[#6B645A]">Total a Liquidar:</span>
              <span class="font-mono text-base font-bold text-[#1C1C1C]">${formatCOP(25000)}</span>
            </div>
            ${renderPaymentMethodSelector({ selectedMethod: 'efectivo', name: 'modal_metodo_pago' })}
          </div>
        `,
        confirmText: 'Registrar Cobro',
        cancelText: 'Cancelar',
        confirmVariant: 'primary',
        onConfirm: () => {
          alert('¡Cobro registrado exitosamente en caja diaria!');
          return true;
        }
      });
      // Inicializar el selector dentro del modal
      setTimeout(() => {
        const modal = document.querySelector('dialog.ui-modal');
        if (modal) attachPaymentMethodSelectorListeners(modal);
      }, 50);
    });
  }

  // Demo Dialog Destructivo
  const btnDialogDanger = document.getElementById('demo-btn-dialog-danger');
  if (btnDialogDanger) {
    btnDialogDanger.addEventListener('click', () => {
      openDialog({
        title: '¿Anular Cita #SB-00128?',
        subtitle: 'Esta acción liberará el bloque de 30 minutos de forma irrevocable.',
        contentHtml: `
          <div class="p-3 rounded-lg bg-[#FCE8E6] border border-[#B3261E]/30 text-xs text-[#B3261E]">
            <p><strong>Atención:</strong> Se notificará al cliente Javier Ramírez de la cancelación.</p>
          </div>
        `,
        confirmText: 'Sí, Anular Cita',
        cancelText: 'No, Mantener',
        confirmVariant: 'danger',
        onConfirm: () => {
          alert('Cita anulada correctamente.');
          return true;
        }
      });
    });
  }

  // Demo Drawer Lateral (Desktop)
  const btnDrawerRight = document.getElementById('demo-btn-drawer-right');
  if (btnDrawerRight) {
    btnDrawerRight.addEventListener('click', () => {
      openDrawer({
        title: 'Detalle de Producto',
        subtitle: 'SKU: POM-MATE-01 · Peinado',
        position: 'right',
        contentHtml: `
          <div class="flex flex-col gap-4">
            <div class="p-4 rounded-lg bg-white border border-[#D5CBB8]">
              <span class="font-sans text-xs text-[#6B645A]">Nombre comercial</span>
              <p class="font-sans font-bold text-sm text-[#1C1C1C]">Pomada Fijadora Mate Suavecito 4oz</p>
            </div>
            <div class="grid grid-cols-2 gap-3">
              <div class="p-3 rounded-lg bg-white border border-[#D5CBB8]">
                <span class="font-sans text-xs text-[#6B645A]">Stock actual</span>
                <p class="font-mono font-bold text-lg text-[#1C1C1C]">18 und</p>
              </div>
              <div class="p-3 rounded-lg bg-white border border-[#D5CBB8]">
                <span class="font-sans text-xs text-[#6B645A]">Stock mínimo</span>
                <p class="font-mono font-bold text-lg text-[#6B645A]">5 und</p>
              </div>
            </div>
            <div class="p-3 rounded-lg bg-white border border-[#D5CBB8]">
              <span class="font-sans text-xs text-[#6B645A]">Precio venta al público</span>
              <p class="font-mono font-bold text-lg text-[#1F3A5F]">${formatCOP(45000)}</p>
            </div>
            <div class="pt-4 border-t border-[#D5CBB8] flex gap-2">
              <button type="button" class="flex-1 min-h-[44px] rounded-md bg-[#1F3A5F] text-white font-sans font-semibold text-xs">
                Registrar Movimiento
              </button>
            </div>
          </div>
        `
      });
    });
  }

  // Demo Bottom Sheet (Móvil)
  const btnDrawerBottom = document.getElementById('demo-btn-drawer-bottom');
  if (btnDrawerBottom) {
    btnDrawerBottom.addEventListener('click', () => {
      openDrawer({
        title: 'Acciones Rápidas de Turno',
        subtitle: 'Sillón 1 · Mateo Restrepo',
        position: 'bottom',
        contentHtml: `
          <div class="flex flex-col gap-2.5 pb-4">
            <button type="button" class="min-h-[48px] w-full px-4 rounded-lg bg-white border border-[#D5CBB8] text-left font-sans font-semibold text-sm flex items-center gap-3">
              <span class="material-symbols-outlined text-[20px] text-[#235D3A]">check_circle</span>
              <span>Marcar como Completada y Cobrar</span>
            </button>
            <button type="button" class="min-h-[48px] w-full px-4 rounded-lg bg-white border border-[#D5CBB8] text-left font-sans font-semibold text-sm flex items-center gap-3">
              <span class="material-symbols-outlined text-[20px] text-[#8A5300]">person_off</span>
              <span>Marcar como No Asistió</span>
            </button>
            <button type="button" class="min-h-[48px] w-full px-4 rounded-lg bg-white border border-[#B3261E]/40 text-left font-sans font-semibold text-sm text-[#B3261E] flex items-center gap-3">
              <span class="material-symbols-outlined text-[20px]">cancel</span>
              <span>Cancelar Cita</span>
            </button>
          </div>
        `
      });
    });
  }

  // Demos de Errores HTTP
  const btnErr409 = document.getElementById('demo-err-409');
  if (btnErr409) {
    btnErr409.addEventListener('click', () => {
      openDialog({
        title: 'Horario No Disponible (HTTP 409)',
        subtitle: 'Conflicto de concurrencia detectado.',
        contentHtml: `
          <div class="p-3.5 rounded-lg bg-[#FDF1DC] border border-[#8A5300]/30 text-xs text-[#8A5300]">
            El horario seleccionado acaba de ser reservado por otro cliente. Por favor elige otro bloque de 30 minutos.
          </div>
        `,
        confirmText: 'Elegir Otro Horario',
        cancelText: 'Cerrar',
        confirmVariant: 'accent'
      });
    });
  }

  const btnErr400 = document.getElementById('demo-err-400');
  if (btnErr400) {
    btnErr400.addEventListener('click', () => {
      openDialog({
        title: 'Error de Validación (HTTP 400)',
        subtitle: 'Datos de cliente no conformes.',
        contentHtml: `
          <div class="p-3.5 rounded-lg bg-[#FCE8E6] border border-[#B3261E]/30 text-xs text-[#B3261E]">
            El número celular debe tener 10 dígitos y comenzar por 3 (ej: 3101234567).
          </div>
        `,
        confirmText: 'Entendido',
        cancelText: null,
        confirmVariant: 'danger'
      });
    });
  }

  const btnErr429 = document.getElementById('demo-err-429');
  if (btnErr429) {
    btnErr429.addEventListener('click', () => {
      openDialog({
        title: 'Demasiadas Solicitudes (HTTP 429)',
        subtitle: 'Límite de peticiones alcanzado.',
        contentHtml: `
          <div class="p-3.5 rounded-lg bg-[#FAF7F2] border border-[#8C8272] text-xs text-[#1C1C1C]">
            Demasiadas solicitudes. Por favor espera unos momentos antes de reintentar.
          </div>
        `,
        confirmText: 'Aceptar',
        cancelText: null,
        confirmVariant: 'primary'
      });
    });
  }

  const btnErr401 = document.getElementById('demo-err-401');
  if (btnErr401) {
    btnErr401.addEventListener('click', () => {
      openDialog({
        title: 'Sesión Expirada (HTTP 401)',
        subtitle: 'Tu token de acceso ya no es válido.',
        contentHtml: `
          <div class="p-3.5 rounded-lg bg-[#FAF7F2] border border-[#8C8272] text-xs text-[#1C1C1C]">
            Tu sesión ha expirado o no tienes permisos para acceder a esta vista.
          </div>
        `,
        confirmText: 'Iniciar Sesión',
        cancelText: 'Cerrar',
        confirmVariant: 'primary'
      });
    });
  }
}

// Inicializar catálogo interactivo
renderStyleguide();

