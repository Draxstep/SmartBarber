# SmartBarber Design System

## Overview
SmartBarber is a heritage-inspired, classic barbershop digital product split into two unified web surfaces: a **Mobile-First Public Booking Portal (Landing Page)** and a **Desktop/Tablet Operational Backoffice** (Daily Agenda, Walk-in POS/Cash Register, Services Catalog, Barbers, and Inventory).
- **Visual Personality:** Traditional craftsmanship meets modern operational precision. Evokes the iconic barber pole, vintage print stationery, warm parchment, and disciplined tailoring without feeling dated or cluttered.
- **Theme Mode:** Warm Light Mode primary canvas (`#F2EBDD`) with crisp elevated ivory cards (`#FAF7F2`), anchored by high-contrast Carbon Black (`#1C1C1C`) structural navigation and hero headers.
- **Density:**
  - *Public Landing & 5-Step Booking:* Medium-airy density with generous touch targets (`>= 44x44px`), editorial typography, and clear conversion hierarchy.
  - *Backoffice Operations:* Medium-compact density optimized for rapid scanning of 30-minute time blocks, tabular COP currency figures, and 4-click walk-in cut registration.
- **Accessibility Baseline:** Strict WCAG 2.1 Level AA compliance (`>= 4.5:1` normal text, `>= 3:1` UI components and large text). Every status indicator must pair color with explicit text labels and icons.

## Colors

### Brand & Action
- `brand-primary`: `#1F3A5F` — Prussian Blue. Primary operational buttons (Backoffice), active step indicators, links, and `Confirmada` status text.
- `brand-primary-hover`: `#162B47` — Deep Prussian. Hover and pressed state for `brand-primary`.
- `brand-secondary`: `#1C1C1C` — Carbon Black. Primary text on light surfaces, Backoffice left sidebar, Public Landing hero/footer surfaces.
- `brand-accent`: `#8B1E1E` — Sangria Red. Primary conversion CTA on Public Landing ("Agendar Cita"), classic barber-pole hairline accents, and featured badges on light backgrounds.
- `brand-accent-hover`: `#6E1616` — Deep Sangria. Hover and pressed state for `brand-accent`.

### Surfaces & Backgrounds
- `bg-canvas`: `#F2EBDD` — Warm Alabaster. Main viewport background for both Public Landing and Backoffice.
- `bg-surface`: `#FAF7F2` — Warm Ivory. Elevated cards, modals, drawers, and sticky booking summary panels.
- `bg-surface-subtle`: `#E8DFCE` — Parchment. Table headers, secondary card footers, disabled time slots, and table row hover states.
- `bg-input`: `#FFFFFF` — Pure White. Form input fills, select dropdowns, and search bars.
- `bg-dark-elevated`: `#2A2A2A` — Charcoal Lift. Hover/active item background inside Carbon Black (`#1C1C1C`) sidebars and dark headers.

### Text & Borders
- `text-primary`: `#1C1C1C` — Headings, COP prices, primary table cells, and body copy.
- `text-secondary`: `#4F4A42` — Warm Charcoal. Service descriptions, form labels, secondary metadata.
- `text-muted`: `#6B645A` — Warm Stone. Placeholders, timestamps, helper captions, and duration hints (`30 min`).
- `text-on-dark`: `#F2EBDD` — Primary text and icons over `#1C1C1C` surfaces.
- `text-on-dark-muted`: `#BDB4A5` — Secondary labels and inactive nav items over `#1C1C1C` surfaces.
- `text-on-brand`: `#FFFFFF` — Text inside `#1F3A5F`, `#8B1E1E`, and `#B3261E` solid buttons.
- `accent-on-dark-blue`: `#7BA3D4` — Derived accessible Prussian tint for active highlights/icons on `#1C1C1C`.
- `accent-on-dark-red`: `#E07A7A` — Derived accessible Sangria tint for alert counters/accents on `#1C1C1C`.
- `border-subtle`: `#D5CBB8` — Sand hairline. Card outlines, table row dividers, and 30-minute agenda grid lines.
- `border-strong`: `#8C8272` — Muted Umber. Default border for form inputs, checkboxes, and radio cards (`3.56:1` UI contrast on `#FAF7F2`).
- `border-focus`: `#1F3A5F` — Focus ring color (`2px solid #1F3A5F` with `2px` offset).

### Semantic Status Tokens (Always Pair Text + Icon + Pill)
- `status-success-text`: `#235D3A` | `status-success-bg`: `#E3EFE7` — `Completada`, `Disponible`, payment registered.
- `status-warning-text`: `#8A5300` | `status-warning-bg`: `#FDF1DC` — `Pendiente`, `Stock bajo` (`0 < stock <= min`).
- `status-error-text`: `#B3261E` | `status-error-bg`: `#FCE8E6` — `Cancelada`, `Agotado` (`stock = 0`), concurrency conflict, validation errors.
- `status-info-text`: `#1F3A5F` | `status-info-bg`: `#E4ECF5` — `Confirmada`, selected booking slot.
- `status-neutral-text`: `#4F4A42` | `status-neutral-bg`: `#E8DFCE` — `No asistió`, `Anulado`, `Inactivo`.

## Typography
- **Display & Headings Font:** `'Playfair Display', Georgia, serif` (Google Fonts) — Used strictly for brand wordmark, hero headlines, section titles, and modal headers to establish classic barbershop authority.
- **Body & UI Font:** `'Inter', system-ui, -apple-system, sans-serif` (Google Fonts) — Used for all UI controls, navigation, forms, tables, descriptions, and badges.
- **Data & Monospace Font:** `'JetBrains Mono', monospace` (Google Fonts) — Used with `font-variant-numeric: tabular-nums` for booking codes (`SB-XXXXXX`), 30-minute time blocks (`09:00 AM`), and Colombian Peso currency (`$ 25.000 COP`).

### Type Scale
- `display-hero`: `40px` (`2.5rem`) desktop / `32px` (`2rem`) mobile | Playfair Display | Weight `700` | Line-height `1.15` | Tracking `-0.02em`
- `heading-h1`: `28px` (`1.75rem`) | Playfair Display | Weight `700` | Line-height `1.25` | Tracking `-0.01em`
- `heading-h2`: `22px` (`1.375rem`) | Playfair Display | Weight `600` | Line-height `1.3`
- `heading-h3`: `18px` (`1.125rem`) | Inter | Weight `600` | Line-height `1.35`
- `body-lg`: `16px` (`1rem`) | Inter | Weight `400` | Line-height `1.5`
- `body-md`: `14px` (`0.875rem`) | Inter | Weight `400` | Line-height `1.5` (Default Backoffice UI size)
- `label-ui`: `14px` (`0.875rem`) | Inter | Weight `600` | Line-height `1.2`
- `caption-sm`: `12px` (`0.75rem`) | Inter | Weight `500` | Line-height `1.35` | Tracking `0.02em`
- `mono-data`: `14px` (`0.875rem`) | JetBrains Mono | Weight `600` | Line-height `1.2` | `tabular-nums`
- `kpi-value`: `28px` (`1.75rem`) | Inter | Weight `700` | Line-height `1.15` | `tabular-nums`

## Layout & Spacing
- **Base Unit:** `4px` micro-grid with `8px` primary spacing scale.
- **Spacing Tokens:** `space-1: 4px`, `space-2: 8px`, `space-3: 12px`, `space-4: 16px`, `space-5: 20px`, `space-6: 24px`, `space-8: 32px`, `space-10: 40px`, `space-12: 48px`, `space-16: 64px`.
- **Breakpoints & Grid:**
  - *Mobile (`360px`–`767px`, Landing Priority):* `4` columns, `16px` outer margins, `12px` gutter. Zero horizontal overflow.
  - *Tablet (`768px`–`1023px`):* `8` columns, `24px` outer margins, `16px` gutter. Collapsible Backoffice sidebar drawer.
  - *Desktop (`>= 1024px`, Backoffice Priority):* `12` columns, `240px` fixed Carbon Black (`#1C1C1C`) left sidebar + fluid main workspace (`max-width: 1280px`, `32px` padding, `20px` gutter).
  - *Public Landing Container:* Centered `max-width: 1120px`; 5-step Booking Wizard constrained to `max-width: 680px` centered column for focused completion under 90 seconds.
- **Agenda Time Grid Geometry:** Each 30-minute block equals `48px` vertical row height on desktop (`56px` on touch devices), allowing multi-block appointments (`2 blocks = 96px`) to span seamlessly.

## Elevation & Depth
SmartBarber uses **print-inspired flat layering** relying on tonal surface shifts and crisp `1px` borders rather than heavy drop shadows.
- `elevation-0 (Canvas)`: Flat `#F2EBDD`, no shadow.
- `elevation-1 (Cards & Panels)`: Background `#FAF7F2`, border `1px solid #D5CBB8`, shadow `0 1px 2px rgba(28, 28, 28, 0.06)`.
- `elevation-2 (Sticky Bars & Dropdowns)`: Background `#FAF7F2`, border `1px solid #D5CBB8`, shadow `0 4px 12px rgba(28, 28, 28, 0.10)`.
- `elevation-3 (Modals & Action Drawers)`: Background `#FAF7F2`, border `1px solid #8C8272`, shadow `0 12px 32px rgba(28, 28, 28, 0.22)` over backdrop `rgba(28, 28, 28, 0.55)`.
- **Heritage Divider:** Standard dividers use `1px solid #D5CBB8`. Major editorial sections on the Landing Page may use a classic double-rule divider (`border-top: 2px solid #1C1C1C` with a `3px` gap and `1px solid #8B1E1E` below).

## Shapes
Restrained, structured geometry echoing classic typography and print cards (avoid overly bubbly pill-everything aesthetics).
- `radius-xs`: `4px` — Status badges, small tags, table checkboxes, 30-minute agenda appointment blocks.
- `radius-sm`: `6px` — Buttons, form inputs, select menus, time-slot buttons.
- `radius-md`: `8px` — Standard cards (services, KPIs, barbers), alerts, dropdown menus.
- `radius-lg`: `12px` — Modals, confirmation receipts (`SB-XXXXXX`), featured hero booking cards.
- `radius-full`: `9999px` — Barber profile avatars (`48px` / `64px` / `80px`), step progress circles, live status dots.

## Components

### Buttons (Minimum height `44px` on mobile / `40px` desktop)
- **Primary Operational (`btn-primary`):** `padding: 10px 20px`, `min-height: 44px`, `radius: 6px`, `bg: #1F3A5F`, `text: #FFFFFF`, `font: Inter 600 14px`, `border: none`.
  - *Hover:* `bg: #162B47`. *Focus:* `outline: 2px solid #1F3A5F; outline-offset: 2px`. *Disabled:* `bg: #D5CBB8`, `text: #6B645A`, `cursor: not-allowed`.
- **Brand Accent CTA (`btn-accent` — Landing "Agendar Cita" / "Confirmar Cita"):** `padding: 12px 24px`, `min-height: 48px`, `radius: 6px`, `bg: #8B1E1E`, `text: #FFFFFF`, `font: Inter 600 15px`.
  - *Hover:* `bg: #6E1616`. *Disabled:* `bg: #D5CBB8`, `text: #6B645A`.
- **Secondary Outlined (`btn-secondary`):** `padding: 10px 20px`, `min-height: 44px`, `radius: 6px`, `bg: transparent`, `text: #1F3A5F`, `border: 1.5px solid #1F3A5F`.
  - *Hover:* `bg: #E4ECF5`. *Disabled:* `border-color: #D5CBB8`, `text: #6B645A`.
- **Destructive (`btn-danger` — Cancelar / Anular):** `padding: 10px 18px`, `min-height: 44px`, `radius: 6px`, `bg: #FCE8E6`, `text: #B3261E`, `border: 1px solid #B3261E`.
  - *Hover:* `bg: #B3261E`, `text: #FFFFFF`.
- **On-Dark Primary (`btn-on-dark` — inside `#1C1C1C` Hero/Sidebar):** `padding: 12px 24px`, `min-height: 48px`, `radius: 6px`, `bg: #F2EBDD`, `text: #1C1C1C`, `font: Inter 700 15px`.
  - *Hover:* `bg: #FFFFFF`.

### Inputs & Selectors
- **Text / Currency / Select Input:** `height: 44px`, `padding: 10px 12px`, `radius: 6px`, `bg: #FFFFFF`, `border: 1px solid #8C8272`, `text: #1C1C1C`, `placeholder: #6B645A`.
  - *Label:* `Inter 600 14px`, `text: #1C1C1C`, `margin-bottom: 6px`.
  - *Focus:* `border: 1.5px solid #1F3A5F`, `box-shadow: 0 0 0 3px rgba(31, 58, 95, 0.16)`.
  - *Error:* `border: 1.5px solid #B3261E`, helper text `12px #B3261E` with alert icon below.
  - *Disabled / Read-only (e.g. locked barber name):* `bg: #E8DFCE`, `text: #4F4A42`, `border: 1px solid #D5CBB8`.
- **Time-Slot Selector Chip (30-min blocks):** `min-height: 44px`, `padding: 10px 12px`, `radius: 6px`, `font: JetBrains Mono 600 13px`.
  - *Available:* `bg: #FFFFFF`, `border: 1px solid #8C8272`, `text: #1C1C1C`.
  - *Selected:* `bg: #1F3A5F`, `border: 1.5px solid #1F3A5F`, `text: #FFFFFF`.
  - *Unavailable:* `bg: #E8DFCE`, `border: 1px dashed #D5CBB8`, `text: #6B645A`, `text-decoration: line-through`.

### Cards
- **Service Selection Card (Public & POS):** `padding: 16px`, `radius: 8px`, `bg: #FAF7F2`, `border: 1px solid #D5CBB8`, flex row with left title (`Inter 600 15px #1C1C1C`), brief description (`13px #4F4A42`), and right-aligned stacked COP price (`JetBrains Mono 700 15px #1C1C1C`) + duration pill (`30 min · 1 bloque` in `#4F4A42`).
  - *Selected State:* `border: 2px solid #1F3A5F`, `bg: #E4ECF5` (subtle tint), checkmark icon `#1F3A5F`.
- **KPI Metric Card (Backoffice Dashboard):** `padding: 20px`, `radius: 8px`, `bg: #FAF7F2`, `border: 1px solid #D5CBB8`, top-left uppercase label (`12px Inter 600 #6B645A`), main value (`28px Inter 700 #1C1C1C tabular-nums`), bottom breakdown caption (`12px #4F4A42`).
- **Agenda Appointment Block (Backoffice Grid):** `padding: 8px 10px`, `radius: 4px`, `border-left: 4px solid [status-text]`, `bg: [status-bg]`, `border-top/right/bottom: 1px solid #D5CBB8`, displays time range (`JetBrains Mono 11px`), client name (`Inter 600 13px #1C1C1C`), service tag, and compact status badge.

### Navigation
- **Public Header (Sticky Top):** `height: 64px`, `bg: #1C1C1C`, `border-bottom: 2px solid #8B1E1E`, left Playfair Display brand logo (`#F2EBDD`), right compact CTA button (`bg: #F2EBDD, text: #1C1C1C, padding: 8px 16px, radius: 6px`).
- **Backoffice Sidebar (Desktop Fixed `240px`):** `bg: #1C1C1C`, `padding: 20px 12px`. Nav items `height: 44px`, `padding: 0 12px`, `radius: 6px`, `text: #BDB4A5`, `gap: 12px`.
  - *Active Nav Item:* `bg: #2A2A2A`, `text: #F2EBDD`, `border-left: 3px solid #7BA3D4`, icon `#7BA3D4`.
  - *Inventory Alert Counter:* inline pill `bg: #E07A7A`, `text: #1C1C1C`, `font: 700 11px`, `radius: 9999px`, `padding: 2px 7px`.
- **5-Step Booking Progress Bar:** Horizontal stepper at top of wizard (`bg: #FAF7F2`, `border-bottom: 1px solid #D5CBB8`, `padding: 12px 16px`). Completed step: circle `24px`, `bg: #235D3A`, white check. Current step: circle `24px`, `bg: #1F3A5F`, white number, label `Inter 600 #1C1C1C`. Upcoming step: circle `24px`, `bg: #E8DFCE`, `text: #6B645A`.

### Badges & Alerts
- **Status Badge (`badge-status`):** `display: inline-flex`, `align-items: center`, `gap: 4px`, `padding: 4px 8px`, `radius: 4px`, `font: Inter 600 12px`. Always includes a `12px` leading icon (`CheckCircle`, `Clock`, `XCircle`, `AlertTriangle`, `UserX`) plus explicit text (`Completada`, `Pendiente`, `Confirmada`, `Cancelada`, `No asistió`, `Stock bajo`, `Agotado`).
- **Sticky Mobile Summary Bar (Booking Flow):** Fixed bottom bar on mobile, `bg: #1C1C1C`, `text: #F2EBDD`, `padding: 12px 16px`, `border-top: 2px solid #8B1E1E`, showing accumulated `60 min (2 bloques) · $ 40.000 COP` on the left and full-contrast `"Continuar"` button (`bg: #F2EBDD, text: #1C1C1C`) on the right.

## Do's and Don'ts

### Do's
- **DO** format all monetary values as whole Colombian Pesos with thousands dot separator and currency label (`$ 25.000 COP`), never decimals, using `tabular-nums`.
- **DO** enforce `>= 44x44px` tap targets across all mobile booking controls (service cards, barber cards, 30-minute slot chips, and form buttons).
- **DO** pair every status color (`Pendiente`, `Confirmada`, `Completada`, `Cancelada`, `No asistió`, `Stock bajo`, `Agotado`) with both a readable label and an icon.
- **DO** reserve `Playfair Display` strictly for display/section headings and brand identity; keep all dense operational tables, buttons, and inputs in `Inter` and `JetBrains Mono`.
- **DO** surface the 5 Colombian payment methods (`Efectivo`, `Transferencia bancaria`, `Tarjeta débito/crédito`, `Nequi`, `Daviplata`) as quick-select visual chips/cards inside Cut Registration modals for <= 4-click completion.

### Don'ts
- **DON'T** place Prussian Blue (`#1F3A5F`) or Sangria Red (`#8B1E1E`) text, thin borders, or icons directly on Carbon Black (`#1C1C1C`) backgrounds (fails WCAG AA contrast). Always use `#F2EBDD`, `#FFFFFF`, `#7BA3D4`, or `#E07A7A` on dark surfaces.
- **DON'T** introduce pure neon colors, glassmorphism blurs, purple gradients, or futuristic sci-fi styling that breaks the classic traditional barbershop identity.
- **DON'T** ask public customers to log in, register a password, or enter credit card details in the Landing Page booking flow.
- **DON'T** allow manual direct editing of `stock_actual` in product edit forms; stock changes must always appear as explicit `Entrada` or `Salida` movement modals.
- **DON'T** use heavy blurred drop shadows or pill-shaped (`9999px`) rectangular buttons; adhere to crisp `1px` borders and `4px`–`8px` corners.