/**
 * @file vapid.js
 * @description Configuración de claves VAPID (RFC 8292) para Web Push con web-push.
 * Genera o carga server/claves-vapid.json (ignorado en git).
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import * as webpush from 'web-push';
import { env } from './env.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const VAPID_FILE = path.join(__dirname, '..', 'claves-vapid.json');

let vapidKeys;

// 1. Prioridad: Variables de entorno en producción (ej. Heroku Config Vars)
if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  vapidKeys = {
    publicKey: process.env.VAPID_PUBLIC_KEY.trim(),
    privateKey: process.env.VAPID_PRIVATE_KEY.trim()
  };
  console.log('🔑 Claves VAPID cargadas exitosamente desde variables de entorno.');
} else if (fs.existsSync(VAPID_FILE)) {
  // 2. Archivo local server/claves-vapid.json (desarrollo local)
  try {
    const raw = fs.readFileSync(VAPID_FILE, 'utf-8');
    vapidKeys = JSON.parse(raw);
  } catch (err) {
    console.error('⚠️ Error al leer claves-vapid.json, regenerando...', err);
  }
}

if (!vapidKeys || !vapidKeys.publicKey || !vapidKeys.privateKey) {
  // 3. Fallback: Generar nuevas claves VAPID y guardar si el sistema de archivos lo permite
  vapidKeys = webpush.generateVAPIDKeys();
  try {
    fs.writeFileSync(VAPID_FILE, JSON.stringify(vapidKeys, null, 2), 'utf-8');
    console.log('🔑 Nuevas claves VAPID generadas en server/claves-vapid.json');
  } catch (_) {
    console.log('🔑 Claves VAPID generadas en memoria para la sesión activa.');
  }
}

const contactSubject = env.VAPID_SUBJECT || 'mailto:soporte@smartbarber.co';

webpush.setVapidDetails(
  contactSubject,
  vapidKeys.publicKey,
  vapidKeys.privateKey
);

export { webpush, vapidKeys };
