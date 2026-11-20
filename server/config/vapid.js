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

if (fs.existsSync(VAPID_FILE)) {
  try {
    const raw = fs.readFileSync(VAPID_FILE, 'utf-8');
    vapidKeys = JSON.parse(raw);
  } catch (err) {
    console.error('⚠️ Error al leer claves-vapid.json, regenerando...', err);
  }
}

if (!vapidKeys || !vapidKeys.publicKey || !vapidKeys.privateKey) {
  // Generar nuevas claves VAPID
  vapidKeys = webpush.generateVAPIDKeys();
  fs.writeFileSync(VAPID_FILE, JSON.stringify(vapidKeys, null, 2), 'utf-8');
  console.log('🔑 Nuevas claves VAPID generadas en server/claves-vapid.json');
}

const contactSubject = env.VAPID_SUBJECT || 'mailto:soporte@smartbarber.co';

webpush.setVapidDetails(
  contactSubject,
  vapidKeys.publicKey,
  vapidKeys.privateKey
);

export { webpush, vapidKeys };
