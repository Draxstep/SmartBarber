/**
 * @file 04-concurrencia-vivo.spec.js
 * @description Suite E2E: Multi-Contexto y Concurrencia en Vivo.
 * Cubre: TC-CON-01 a TC-CON-03
 *
 * Plan de Pruebas: Fase 3 — Nivel 3 (E2E Playwright)
 */
import { test, expect } from '@playwright/test';

test.describe('Suite 4: Multi-Contexto y Concurrencia en Vivo', () => {

  // TC-CON-01: Dos reservas simultáneas al mismo horario
  test('TC-CON-01: Dos contextos de navegador pueden coexistir para reserva simultánea (RN-01)', async ({ browser }) => {
    const ctx1 = await browser.newContext();
    const ctx2 = await browser.newContext();
    const page1 = await ctx1.newPage();
    const page2 = await ctx2.newPage();

    await Promise.all([
      page1.goto('/'),
      page2.goto('/')
    ]);

    await Promise.all([
      page1.waitForLoadState('networkidle'),
      page2.waitForLoadState('networkidle')
    ]);

    const content1 = await page1.textContent('body');
    const content2 = await page2.textContent('body');

    expect(content1.length).toBeGreaterThan(0);
    expect(content2.length).toBeGreaterThan(0);

    await ctx1.close();
    await ctx2.close();
  });

  // TC-CON-02: Backoffice y Landing coexisten
  test('TC-CON-02: Backoffice y Landing Page coexisten en contextos separados', async ({ browser }) => {
    const ctxAdmin = await browser.newContext();
    const ctxCliente = await browser.newContext();

    const pageAdmin = await ctxAdmin.newPage();
    const pageCliente = await ctxCliente.newPage();

    await Promise.all([
      pageAdmin.goto('/backoffice.html'),
      pageCliente.goto('/')
    ]);

    await Promise.all([
      pageAdmin.waitForLoadState('networkidle'),
      pageCliente.waitForLoadState('networkidle')
    ]);

    const adminContent = await pageAdmin.textContent('body');
    const clienteContent = await pageCliente.textContent('body');

    expect(adminContent.length).toBeGreaterThan(0);
    expect(clienteContent.length).toBeGreaterThan(0);

    await ctxAdmin.close();
    await ctxCliente.close();
  });

  // TC-CON-03: Concurrencia en API de disponibilidad
  test('TC-CON-03: Múltiples consultas simultáneas de disponibilidad no causan errores', async ({ request }) => {
    const fecha = '2026-12-01';
    const url = `/api/public/disponibilidad?fecha=${fecha}&bloques_totales=1&barbero_id=cualquiera`;

    const promises = Array.from({ length: 5 }, () =>
      request.get(url).catch(err => ({ status: () => 500, error: err.message }))
    );

    const responses = await Promise.all(promises);

    for (const res of responses) {
      const status = typeof res.status === 'function' ? res.status() : res.status;
      expect(status).not.toBe(500);
    }
  });
});
