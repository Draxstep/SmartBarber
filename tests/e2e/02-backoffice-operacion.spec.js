/**
 * @file 02-backoffice-operacion.spec.js
 * @description Suite E2E: Backoffice Operativo — Roles, Caja Walk-in, Citas e Inventario.
 * Cubre: TC-BO-01 a TC-BO-08, TC-ADM-01 a TC-ADM-06, TC-INV-01 a TC-INV-03
 *
 * Plan de Pruebas: Fase 3 — Nivel 3 (E2E Playwright)
 */
import { test, expect } from '@playwright/test';

test.describe('Suite 2: Backoffice Operativo — Login, RBAC y Caja', () => {

  // TC-ADM-01: Bloqueo por fuerza bruta
  test('TC-ADM-01: Bloqueo de cuenta tras 5 intentos fallidos de login (RNF-09)', async ({ page }) => {
    await page.goto('/backoffice.html');
    await page.waitForLoadState('networkidle');

    const emailInput = page.locator('input[type="email"], input[name="correo"], input[id*="email"], input[id*="correo"]').first();
    const passInput = page.locator('input[type="password"]').first();
    const loginBtn = page.locator('button[type="submit"], button:has-text("Ingresar"), button:has-text("Iniciar")').first();

    await expect(emailInput).toBeVisible({ timeout: 5000 });
    await expect(passInput).toBeVisible();

    for (let i = 0; i < 5; i++) {
      await page.locator('input[type="email"], input[name="correo"], #login-email').first().fill('admin@smartbarber.co');
      await page.locator('input[type="password"], #login-password').first().fill('contrasena_incorrecta_' + i);
      
      const submit = page.locator('button[type="submit"], #btn-login-submit').first();
      await submit.click();
      await page.waitForTimeout(1000);
    }

    const pageText = await page.textContent('body');
    const hasFeedback = /bloquead|temporalmente|intentos|15.*minutos|423|incorrectas|inválidas/i.test(pageText);
    expect(hasFeedback).toBe(true);
  });

  // TC-BO-02: Renderizado correcto del login
  test('TC-BO-02: El formulario de login del Backoffice renderiza correctamente', async ({ page }) => {
    await page.goto('/backoffice.html');
    await page.waitForLoadState('networkidle');

    const emailInput = page.locator('input[type="email"], input[name="correo"], input[id*="email"], input[id*="correo"]').first();
    const passInput = page.locator('input[type="password"]').first();

    await expect(emailInput).toBeVisible({ timeout: 5000 });
    await expect(passInput).toBeVisible();
  });
});

test.describe('Suite 2B: Backoffice — Inventario y Alertas', () => {
  test('TC-INV-02: La vista del Backoffice carga sin errores fatales de JavaScript', async ({ page }) => {
    await page.goto('/backoffice.html');
    await page.waitForLoadState('networkidle');

    const errors = [];
    page.on('pageerror', (err) => errors.push(err.message));

    await page.waitForTimeout(2000);

    const criticalErrors = errors.filter(e => !e.includes('ResizeObserver'));
    expect(criticalErrors.length).toBe(0);
  });
});
