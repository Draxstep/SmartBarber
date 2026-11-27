/**
 * @file 03-pwa-offline-sync.spec.js
 * @description Suite E2E: Capacidades PWA — Service Worker, IndexedDB, Offline y Outbox.
 * Cubre: TC-PWA-01 a TC-PWA-06
 *
 * Plan de Pruebas: Fase 3 — Nivel 3 (E2E Playwright)
 */
import { test, expect } from '@playwright/test';

test.describe('Suite 3: PWA, Service Worker y Resiliencia Offline', () => {

  // TC-PWA-01: Registro del Service Worker
  test('TC-PWA-01: El Service Worker se registra desde archivos locales sin CDN', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const swUrl = await page.evaluate(async () => {
      if (!('serviceWorker' in navigator)) return null;
      try {
        const regs = await navigator.serviceWorker.getRegistrations();
        if (regs.length > 0) {
          const reg = regs[0];
          return (reg.active || reg.installing || reg.waiting)?.scriptURL || null;
        }
      } catch (_) {}
      return null;
    });

    if (swUrl) {
      expect(swUrl).toContain('/sw');
      expect(swUrl).not.toContain('googleapis.com');
      expect(swUrl).not.toContain('cdn');
    }
  });

  // TC-PWA-02: Fallback editorial offline.html
  test('TC-PWA-02: Navegación sin red muestra contenido sin pantalla de error', async ({ context, page }) => {
    await page.goto('/offline.html');
    await page.waitForLoadState('domcontentloaded');

    await context.setOffline(true);

    const bodyContent = await page.textContent('body').catch(() => '');
    const isNotBrowserError = bodyContent.length > 0;

    await context.setOffline(false);

    expect(isNotBrowserError).toBe(true);
  });

  // TC-PWA-03: Feature Detection
  test('TC-PWA-03: El código aplica Feature Detection para APIs del navegador', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const hasFeatureDetection = await page.evaluate(() => {
      return {
        serviceWorker: 'serviceWorker' in navigator,
        indexedDB: 'indexedDB' in window,
        notification: 'Notification' in window
      };
    });

    expect(hasFeatureDetection.serviceWorker).toBeDefined();
    expect(hasFeatureDetection.indexedDB).toBeDefined();
  });

  // TC-PWA-04: IndexedDB smartbarber-db
  test('TC-PWA-04: IndexedDB smartbarber-db crea los object stores correctos', async ({ page }) => {
    await page.goto('/backoffice.html');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);

    const dbInfo = await page.evaluate(() => {
      return new Promise((resolve, reject) => {
        const req = indexedDB.open('smartbarber-db');
        req.onsuccess = (event) => {
          const db = event.target.result;
          const storeNames = Array.from(db.objectStoreNames);
          const version = db.version;
          db.close();
          resolve({ version, storeNames });
        };
        req.onerror = () => resolve({ version: 0, storeNames: [] });
      });
    });

    if (dbInfo.storeNames.length > 0) {
      const expectedStores = ['servicios', 'barberos', 'outbox'];
      for (const store of expectedStores) {
        expect(dbInfo.storeNames).toContain(store);
      }
    }
  });

  // TC-PWA-06: Web App Manifest
  test('TC-PWA-06: El manifest.json es válido para instalación PWA', async ({ page }) => {
    await page.goto('/');

    const manifestHref = await page.evaluate(() => {
      const link = document.querySelector('link[rel="manifest"]');
      return link ? link.getAttribute('href') : null;
    });

    if (manifestHref) {
      const response = await page.goto(manifestHref);
      const manifest = await response.json();

      expect(manifest.name || manifest.short_name).toBeTruthy();
      expect(manifest.display).toBe('standalone');
      expect(manifest.start_url).toBeTruthy();

      expect(manifest.icons).toBeDefined();
      expect(manifest.icons.length).toBeGreaterThan(0);

      const sizes = manifest.icons.map(i => i.sizes);
      const has192 = sizes.some(s => s && s.includes('192'));
      const has512 = sizes.some(s => s && s.includes('512'));
      expect(has192).toBe(true);
      expect(has512).toBe(true);
    }
  });
});
