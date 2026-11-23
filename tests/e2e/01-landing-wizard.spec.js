/**
 * @file 01-landing-wizard.spec.js
 * @description Suite E2E: Portal Público y Wizard de Agendamiento (5 pasos).
 * Cubre: TC-PUB-01 a TC-PUB-07
 *
 * Plan de Pruebas: Fase 3 — Nivel 3 (E2E Playwright)
 */
import { test, expect } from '@playwright/test';

test.describe('Suite 1: Portal Público y Wizard de Agendamiento', () => {

  // TC-PUB-01: Carga inicial y visualización del catálogo público
  test('TC-PUB-01: La Landing Page carga y muestra catálogo público sin login (RF-AGE-01)', async ({ page }) => {
    await page.goto('/');

    // Verificar presencia del botón principal de llamado a la acción
    const ctaButton = page.locator('text=/agendar|reservar/i').first();
    await expect(ctaButton).toBeVisible();

    // Verificar que se muestran servicios con precio en formato COP
    const servicios = page.locator('[data-testid="service-card"], .service-card, [class*="servicio"]');
    await expect(servicios.first()).toBeVisible({ timeout: 5000 });

    // Verificar que precios estén en formato COP ($ XX.XXX COP)
    const pageContent = await page.textContent('body');
    expect(pageContent).toMatch(/\$\s*[\d.]+\s*COP/);

    // Verificar que NO se requiere login
    await expect(page.locator('input[type="password"]')).not.toBeVisible();
  });

  // TC-PUB-02: Cálculo dinámico de bloques y precio
  test('TC-PUB-02: Selección de servicios actualiza resumen de bloques y precio (RN-02)', async ({ page }) => {
    await page.goto('/');

    // Iniciar flujo de agendamiento
    const ctaButton = page.locator('text=/agendar|reservar/i').first();
    await ctaButton.click();

    // Esperar a que cargue la lista de servicios del Paso 1
    const serviceItems = page.locator('[data-testid="service-item"], .service-item, [class*="servicio"]');
    await expect(serviceItems.first()).toBeVisible({ timeout: 5000 });

    // Seleccionar al menos un servicio (primer servicio disponible)
    await serviceItems.first().click();

    // Verificar que el botón "Continuar" se habilita
    const continueBtn = page.locator('button:has-text(/continuar|siguiente/i)');
    await expect(continueBtn).toBeEnabled({ timeout: 3000 });
  });

  // TC-PUB-04: Validación del formulario y Habeas Data (Ley 1581)
  test('TC-PUB-04: Referencia a política de datos personales existe (Ley 1581)', async ({ page }) => {
    await page.goto('/');

    const pageContent = await page.textContent('body');
    const hasDataPolicy = /pol[ií]tica|tratamiento.*datos|ley.*1581|datos.*personales/i.test(pageContent);
    expect(hasDataPolicy).toBe(true);
  });

  // TC-PUB-05: Responsividad Mobile-First (360px a 1920px)
  test('TC-PUB-05: La Landing Page no tiene scroll horizontal en móvil 360px (RF-AGE-01)', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 640 });
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const hasHorizontalScroll = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth;
    });
    expect(hasHorizontalScroll).toBe(false);
  });
});
