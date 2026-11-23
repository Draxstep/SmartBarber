// @ts-check
import { defineConfig, devices } from '@playwright/test';

/**
 * Configuración de Playwright para SmartBarber PWA
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ['html', { outputFolder: 'tests/reports/playwright' }],
    ['list']
  ],
  timeout: 30000,

  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure'
  },

  projects: [
    {
      name: 'chromium-desktop',
      use: { ...devices['Desktop Chrome'] }
    },
    {
      name: 'mobile-android',
      use: { ...devices['Pixel 7'] }
    },
    {
      name: 'mobile-ios',
      use: { ...devices['iPhone 14'] }
    }
  ],

  /* Levantar servidor de desarrollo antes de ejecutar los tests */
  webServer: [
    {
      command: 'npm run dev:server',
      port: 3001,
      reuseExistingServer: !process.env.CI,
      timeout: 15000
    },
    {
      command: 'npm run dev',
      port: 5173,
      reuseExistingServer: !process.env.CI,
      timeout: 15000
    }
  ]
});
