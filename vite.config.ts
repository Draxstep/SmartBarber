import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    VitePWA({
      registerType: 'prompt', 
      includeAssets: ['favicon.svg'],
      manifest: {
        name: 'Smart Barber',
        short_name: 'SmartBarber',
        description: 'Gestión inteligente de turnos, inventario y registro de cortes.',
        theme_color: '#111827',
        background_color: '#ffffff',
        display: 'standalone',
        icons: [
          {
            src: '/icon-192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: '/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable' 
          }
        ]
      },
      workbox: {
        runtimeCaching: [
          {
            // Cache First (Imágenes e iconos)
            urlPattern: /\.(?:png|jpg|jpeg|svg|gif|ico)$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'images-cache',
              expiration: { maxEntries: 50, maxAgeSeconds: 30 * 24 * 60 * 60 }
            }
          },
          {
            // Network First (Citas y API)
            urlPattern: /\/api\/|\/citas\//,
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