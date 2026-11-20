/**
 * @file build-sw.js
 * @description Compilador multiplataforma de Service Worker mediante Workbox InjectManifest.
 * Precaches los activos reales de dist/ y sincroniza dist/sw.js y public/sw.js.
 */
import { injectManifest } from 'workbox-build';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../..');

async function buildServiceWorker() {
  console.log('📦 Inyectando manifiesto de precaché en Service Worker con Workbox InjectManifest...');
  
  const distDir = path.join(rootDir, 'dist');
  if (!fs.existsSync(distDir)) {
    throw new Error("El directorio 'dist' no existe. Ejecuta 'npm run build' primero.");
  }

  const { count, size, warnings } = await injectManifest({
    globDirectory: distDir,
    globPatterns: [
      'index.html',
      'backoffice.html',
      'offline.html',
      'styleguide.html',
      'manifest.json',
      'assets/*.{css,js}',
      'icons/*.png'
    ],
    globIgnores: [
      'lib/**/*',
      'sw.js',
      'sw-propio.js',
      'workbox-*.js'
    ],
    swSrc: path.join(rootDir, 'public/sw-propio.js'),
    swDest: path.join(rootDir, 'dist/sw.js')
  });

  if (warnings && warnings.length > 0) {
    warnings.forEach((w) => console.warn('⚠️ Warning Workbox:', w));
  }

  // Copiar también a public/sw.js para desarrollo estático y alineación con la spec
  fs.copyFileSync(path.join(rootDir, 'dist/sw.js'), path.join(rootDir, 'public/sw.js'));
  console.log(`✅ Service Worker generado con éxito: ${count} archivos precacheados (${Math.round(size / 1024)} KiB).`);
}

buildServiceWorker().catch((err) => {
  console.error('❌ Error al compilar Service Worker:', err);
  process.exit(1);
});
