import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    VitePWA({
      registerType: 'prompt',
      manifestFilename: 'manifest.json',
      includeAssets: ['favicon.svg', 'icons/*.png', 'manifest.json'],
      manifest: {
        name: 'Smart Barber - Gestión Integral',
        short_name: 'SmartBarber',
        description: 'Gestión inteligente de turnos, inventario y registro de cortes.',
        theme_color: '#111827',
        background_color: '#ffffff',
        display: 'standalone',
        orientation: 'portrait',
        icons: [
          {
            src: '/icons/launchericon-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: '/icons/launchericon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,json}'],
        runtimeCaching: [
          {
            // Cache First (Imágenes, logos e iconos) - Sesión 23 Workbox
            urlPattern: /\.(?:png|jpg|jpeg|svg|gif|ico)$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'imagenes-cache',
              expiration: { maxEntries: 60, maxAgeSeconds: 30 * 24 * 60 * 60 }
            }
          },
          {
            // Network First (Citas, Inventario y API)
            urlPattern: /\/api\/|\/citas\/|\/inventario\//,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              networkTimeoutSeconds: 3
            }
          }
        ]
      }
    })
  ]
});
