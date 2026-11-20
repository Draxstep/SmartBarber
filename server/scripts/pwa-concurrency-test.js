/**
 * @file pwa-concurrency-test.js
 * @description Suite de certificación de capacidades PWA Offline-First y Concurrencia ACID para SmartBarber.
 * 
 * Valida de forma reproducible:
 * 1. Build y Precache de Workbox v7 (sin CDN, imports locales, __WB_MANIFEST inyectado, offline.html).
 * 2. Condición de carrera en agendamiento público: 10 peticiones concurrentes -> 1 éxito (201) + 9 conflictos (409 SLOT_CONFLICT).
 * 3. Condición de carrera en inventario: 5 salidas simultáneas de stock=1 -> 1 éxito (201) + 4 conflictos (409 INSUFFICIENT_STOCK).
 * 4. Idempotencia estricta de la cola Outbox (/api/v1/sync/outbox con sync_idempotencia).
 * 5. Depuración automática de suscripciones Push muertas (HTTP 410 Gone) en push_suscripciones.
 */

import http from 'http';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { app } from '../app.js';
import { getDatabasePool, closeDatabasePool } from '../shared/database/connection.js';
import { pushService } from '../services/push.service.js';
import { webpush } from '../config/vapid.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../..');

let server;
let baseUrl;

function logTest(num, name, passed, details = '') {
  const icon = passed ? '✅' : '❌';
  console.log(`${icon} [PWA-TEST ${String(num).padStart(2, '0')}] ${name}${details ? ` -> ${details}` : ''}`);
  if (!passed) {
    throw new Error(`Prueba PWA ${num} falló: ${name} (${details})`);
  }
}

async function request(pathUrl, options = {}) {
  const url = `${baseUrl}${pathUrl}`;
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };

  const response = await fetch(url, {
    ...options,
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined
  });

  let data;
  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    data = await response.json();
  } else {
    data = await response.text();
  }

  return { status: response.status, headers: response.headers, data };
}

async function runPwaConcurrencyTests() {
  console.log('💈 ==============================================================================');
  console.log('💈 SMARTBARBER - CERTIFICACIÓN DE ARQUITECTURA PWA OFFLINE-FIRST & CONCURRENCIA');
  console.log('💈 ==============================================================================\n');

  // Agregar ruta de mock para prueba de Push 410 Gone
  app.post('/api/test/mock-push-410', (req, res) => {
    res.status(410).json({ error: 'Subscription expired or unsubscribed (Mock 410)' });
  });

  // Iniciar servidor HTTP en puerto efímero asignado por el SO
  await new Promise((resolve) => {
    server = http.createServer(app);
    server.listen(0, () => {
      const port = server.address().port;
      baseUrl = `http://localhost:${port}`;
      console.log(`🌐 Servidor de certificación PWA iniciado en ${baseUrl}\n`);
      resolve();
    });
  });

  const pool = getDatabasePool();

  try {
    // Limpiar suscripciones residuales de pruebas previas
    await pool.query("DELETE FROM push_suscripciones WHERE endpoint LIKE '%test%' OR endpoint LIKE '%localhost%'");
    // --------------------------------------------------------------------------
    // TEST 1: Service Worker Build Validation & Local Precache Assets
    // --------------------------------------------------------------------------
    console.log('📦 [1/5] Verificando compilación de Service Worker e Infraestructura PWA...');

    const swDistPath = path.join(rootDir, 'dist/sw.js');
    const offlineHtmlPath = path.join(rootDir, 'dist/offline.html');
    const manifestPath = path.join(rootDir, 'dist/manifest.json');
    const icon192Path = path.join(rootDir, 'dist/icons/icon-192.png');
    const icon512Path = path.join(rootDir, 'dist/icons/icon-512-maskable.png');
    const workboxLocalDir = path.join(rootDir, 'public/lib/workbox-v7.4.1');

    const swDistExists = fs.existsSync(swDistPath);
    const swContent = swDistExists ? fs.readFileSync(swDistPath, 'utf8') : '';

    const hasNoCDN = !swContent.includes('storage.googleapis.com') && !swContent.includes('cdn.jsdelivr.net');
    const usesLocalWorkbox = swContent.includes('/lib/workbox-v7.4.1/');
    const hasManifestInjected = !swContent.includes('self.__WB_MANIFEST') && swContent.includes('precacheAndRoute');
    const shellAssetsExist = fs.existsSync(offlineHtmlPath) && fs.existsSync(manifestPath) && fs.existsSync(icon192Path) && fs.existsSync(icon512Path);
    const workboxFilesExist = fs.existsSync(workboxLocalDir) && fs.readdirSync(workboxLocalDir).length >= 10;

    logTest(
      1,
      'Service Worker compilado con Workbox local v7 (cero CDN, precache inyectado y assets offline)',
      swDistExists && hasNoCDN && usesLocalWorkbox && hasManifestInjected && shellAssetsExist && workboxFilesExist,
      `SW: ${swContent.length} bytes, Workbox local: OK, Manifest: inyectado`
    );

    // --------------------------------------------------------------------------
    // TEST 2: Concurrency Race for Public Appointments (GiST Exclusion / 10 concurrent)
    // --------------------------------------------------------------------------
    console.log('\n⚡ [2/5] Ejecutando condición de carrera de Agendamiento (10 peticiones concurrentes)...');

    const resInfo = await request('/api/v1/public/info');
    const sedeId = resInfo.data.data.negocio.sedeId;
    const barbero = resInfo.data.data.barberos[0];
    const servicio = resInfo.data.data.servicios[0];

    // Buscar una fecha y horario disponible sin citas previas en la agenda del barbero
    let fechaCarrera = '';
    let horaCarrera = '';

    for (let offset = 25; offset < 60; offset++) {
      const candidateDate = new Date();
      candidateDate.setDate(candidateDate.getDate() + offset);
      const fechaStr = candidateDate.toISOString().slice(0, 10);

      const resDisp = await request(`/api/v1/public/disponibilidad?fecha=${fechaStr}&barberoId=${barbero.barberoId}&duracionBloques=1`);
      if (resDisp.status === 200 && Array.isArray(resDisp.data?.data?.horariosDisponibles) && resDisp.data.data.horariosDisponibles.length > 0) {
        // Verificar que no haya ninguna cita residual en esa fecha y primer slot
        const slotCandidato = resDisp.data.data.horariosDisponibles[0];
        const resPrevia = await pool.query(
          'SELECT 1 FROM citas WHERE barbero_id = $1 AND fecha = $2 AND hora_inicio = $3',
          [barbero.barberoId, fechaStr, `${slotCandidato.slice(0, 5)}:00`]
        );
        if (resPrevia.rows.length === 0) {
          fechaCarrera = fechaStr;
          horaCarrera = slotCandidato;
          break;
        }
      }
    }

    if (!fechaCarrera || !horaCarrera) {
      throw new Error('No se encontró franja disponible y limpia para la prueba de concurrencia.');
    }

    console.log(`   Slot objetivo para la carrera: Barbero ${barbero.nombrePublico || barbero.nombre} · Fecha ${fechaCarrera} a las ${horaCarrera}`);

    // Lanzar 10 solicitudes de reserva simultáneas compitiendo por exactamente el mismo bloque
    const appointmentPromises = Array.from({ length: 10 }, (_, i) => {
      return request('/api/public/citas', {
        method: 'POST',
        headers: {
          'X-Forwarded-For': `192.168.10.${100 + i}` // Distintas IPs para aislar la prueba de la limitación anti-bot
        },
        body: {
          sedeId,
          barberoId: barbero.barberoId,
          servicioIds: [servicio.servicioId],
          fecha: fechaCarrera,
          horaInicio: horaCarrera,
          cliente: {
            nombreCompleto: `Cliente Concurrencia ${i + 1}`,
            telefono: `+57300700${String(i).padStart(4, '0')}`,
            correo: `cliente.carrera.${i + 1}.${Date.now()}@prueba.smartbarber.co`,
            aceptoPoliticaDatos: true
          },
          notasCliente: `Carrera concurrente slot ${i + 1}`
        }
      });
    });

    const appointmentResults = await Promise.all(appointmentPromises);

    const exitososCita = appointmentResults.filter((r) => r.status === 201);
    const conflictosCita = appointmentResults.filter((r) => r.status === 409);
    const codigosConflicto = conflictosCita.map((r) => r.data?.error?.code);
    const todosSonSlotConflict = codigosConflicto.every((c) => c === 'SLOT_CONFLICT' || c === 'CONFLICT');

    // Verificar en BD que existe EXACTAMENTE 1 cita persistida para esa franja
    const checkDbCitas = await pool.query(
      'SELECT cita_id, codigo_reserva, hora_inicio FROM citas WHERE barbero_id = $1 AND fecha = $2 AND hora_inicio = $3 AND estado IN (\'pendiente\', \'confirmada\')',
      [barbero.barberoId, fechaCarrera, `${horaCarrera.slice(0, 5)}:00`]
    );

    logTest(
      2,
      'Condición de carrera GiST: 10 reservas simultáneas -> exactamente 1 éxito (201) y 9 rechazos (409 SLOT_CONFLICT)',
      exitososCita.length === 1 && conflictosCita.length === 9 && todosSonSlotConflict && checkDbCitas.rows.length === 1,
      `Exitosos: ${exitososCita.length}, Conflictos 409: ${conflictosCita.length}, Citas en BD: ${checkDbCitas.rows.length}`
    );

    // --------------------------------------------------------------------------
    // TEST 3: Concurrency Race for Inventory (Pessimistic FOR UPDATE / 5 concurrent)
    // --------------------------------------------------------------------------
    console.log('\n⚡ [3/5] Ejecutando condición de carrera de Inventario (5 salidas simultáneas de stock=1)...');

    // Obtener token de administrador
    const resLogin = await request('/api/v1/auth/login', {
      method: 'POST',
      body: { correo: 'admin@smartbarber.co', contrasena: 'Admin123456!' }
    });
    const adminToken = resLogin.data.data.token;
    const adminUser = resLogin.data.data.usuario;
    const authHeaders = { Authorization: `Bearer ${adminToken}` };

    // Crear un producto de prueba con exactamente stockActual = 1
    const skuPrueba = `TEST-PWA-${Date.now()}`;
    const resProd = await request('/api/v1/inventario', {
      method: 'POST',
      headers: authHeaders,
      body: {
        sedeId,
        sku: skuPrueba,
        nombre: 'Pomada de Prueba Concurrencia PWA',
        categoria: 'Ceras y Pomadas',
        precioVentaCop: 35000,
        costoUnitarioCop: 18000,
        stockInicial: 1,
        stockMinimo: 1,
        estado: 'activo'
      }
    });

    const productoCarreraId = resProd.data?.data?.productoId;

    // Lanzar 5 salidas simultáneas de 1 unidad cada una
    const inventoryPromises = Array.from({ length: 5 }, (_, i) => {
      return request(`/api/v1/inventario/${productoCarreraId}/salidas`, {
        method: 'POST',
        headers: authHeaders,
        body: {
          cantidad: 1,
          tipo: 'venta_al_publico',
          metodoPago: 'efectivo',
          observacion: `Salida concurrente ${i + 1}`
        }
      });
    });

    const inventoryResults = await Promise.all(inventoryPromises);

    const exitososInv = inventoryResults.filter((r) => r.status === 201);
    const conflictosInv = inventoryResults.filter((r) => r.status === 409);
    const todosSonInsufficientStock = conflictosInv.every((r) => r.data?.error?.code === 'INSUFFICIENT_STOCK');

    // Verificar en BD que el stock resultante es exactamente 0 (nunca negativo)
    const checkDbInv = await pool.query(
      'SELECT stock_actual FROM productos_inventario WHERE producto_id = $1',
      [productoCarreraId]
    );
    const stockFinal = checkDbInv.rows[0]?.stock_actual;

    logTest(
      3,
      'Condición de carrera Inventario: 5 salidas simultáneas con stock=1 -> 1 éxito (201) y 4 rechazos (409 INSUFFICIENT_STOCK)',
      exitososInv.length === 1 && conflictosInv.length === 4 && todosSonInsufficientStock && stockFinal === 0,
      `Exitosos: ${exitososInv.length}, Rechazados 409: ${conflictosInv.length}, Stock BD final: ${stockFinal}`
    );

    // --------------------------------------------------------------------------
    // TEST 4: Idempotency of Background Outbox Synchronization
    // --------------------------------------------------------------------------
    console.log('\n🔁 [4/5] Verificando Idempotencia en sincronización Outbox (/api/v1/sync/outbox)...');

    const idCambioUuid = crypto.randomUUID();

    const walkInPayload = {
      barberoId: barbero.barberoId,
      servicioIds: [servicio.servicioId],
      metodoPago: 'efectivo',
      nombreCliente: 'Cliente Offline Idempotente',
      notas: 'Corte sincronizado desde cola Outbox'
    };

    // Primer envío del cambio offline
    const resSync1 = await request('/api/v1/sync/outbox', {
      method: 'POST',
      headers: authHeaders,
      body: {
        idCambio: idCambioUuid,
        tipo: 'CREAR_CORTE_WALKIN',
        payload: walkInPayload
      }
    });

    // Reintento idéntico del mismo cambio (simulando reintento por pérdida de paquete o reconexión)
    const resSync2 = await request('/api/v1/sync/outbox', {
      method: 'POST',
      headers: authHeaders,
      body: {
        idCambio: idCambioUuid,
        tipo: 'CREAR_CORTE_WALKIN',
        payload: walkInPayload
      }
    });

    // Validar en BD la tabla sync_idempotencia
    const checkDbSync = await pool.query(
      'SELECT id_cambio, tipo_operacion, creado_en FROM sync_idempotencia WHERE id_cambio = $1',
      [idCambioUuid]
    );

    const primerEnvioOk = resSync1.status === 200 && resSync1.data.ok === true && resSync1.data.duplicado === false;
    const segundoEnvioIdempotente = resSync2.status === 200 && resSync2.data.ok === true && resSync2.data.duplicado === true;
    const unicoRegistroBd = checkDbSync.rows.length === 1;

    logTest(
      4,
      'Idempotencia Outbox: reintento de idCambio responde 200 duplicado=true y registra exactamente 1 transacción',
      primerEnvioOk && segundoEnvioIdempotente && unicoRegistroBd,
      `Envío 1 duplicado: ${resSync1.data?.duplicado}, Envío 2 duplicado: ${resSync2.data?.duplicado}, Filas BD: ${checkDbSync.rows.length}`
    );

    // --------------------------------------------------------------------------
    // TEST 5: Dead Push Subscription Automatic Cleanup (HTTP 410 Gone)
    // --------------------------------------------------------------------------
    console.log('\n🧹 [5/5] Verificando depuración automática de suscripción Push caducada (HTTP 410)...');

    // Generar claves criptográficas válidas de curva elíptica P-256 (RFC 8291)
    const ecdh = crypto.createECDH('prime256v1');
    ecdh.generateKeys();
    const p256dhKey = ecdh.getPublicKey('base64url');
    const authKey = crypto.randomBytes(16).toString('base64url');

    const deadEndpoint = `https://fcm.googleapis.com/fcm/send/dead-token-${Date.now()}`;

    // 1. Registrar suscripción muerta en el sistema
    await pushService.registrarSuscripcion(adminUser.id, {
      endpoint: deadEndpoint,
      keys: {
        p256dh: p256dhKey,
        auth: authKey
      }
    });

    // Comprobar que existe en BD
    const subPrevia = await pool.query(
      'SELECT * FROM push_suscripciones WHERE endpoint = $1',
      [deadEndpoint]
    );
    const existiaEnBd = subPrevia.rows.length === 1;

    // Simular respuesta HTTP 410 (Gone) del proveedor Push para este endpoint específico
    const originalWebpush = pushService.webpush;
    pushService.webpush = {
      sendNotification: async (pushConfig, payloadStr) => {
        if (pushConfig.endpoint === deadEndpoint) {
          const goneErr = new Error('Received unexpected response code 410 from push service');
          goneErr.statusCode = 410;
          throw goneErr;
        }
        return originalWebpush.sendNotification(pushConfig, payloadStr);
      }
    };

    try {
      // 2. Disparar envío Push que provocará HTTP 410
      await pushService.enviarPushAUsuarios([adminUser.id], {
        titulo: 'Prueba de Depuración',
        cuerpo: 'Esta notificación debe gatillar HTTP 410 y eliminar la fila.'
      });
    } finally {
      // Restaurar cliente original
      pushService.webpush = originalWebpush;
    }

    // 3. Comprobar que la suscripción caducada fue ELIMINADA de la base de datos
    const subPosterior = await pool.query(
      'SELECT * FROM push_suscripciones WHERE endpoint = $1',
      [deadEndpoint]
    );
    const fueEliminada = subPosterior.rows.length === 0;

    logTest(
      5,
      'Depuración Push 410: suscripción caducada detectada y eliminada automáticamente de push_suscripciones',
      existiaEnBd && fueEliminada,
      `Existe antes: ${existiaEnBd}, Existe después: ${subPosterior.rows.length === 0 ? 'NO (depurada)' : 'SÍ (error)'}`
    );

    console.log('\n🎉 ==============================================================================');
    console.log('🎉 TODAS LAS 5 PRUEBAS DE CERTIFICACIÓN PWA & CONCURRENCIA FUERON SUPERADAS AL 100%');
    console.log('🎉 ==============================================================================\n');

  } catch (error) {
    console.error('\n❌ ERROR DURANTE LA SUITE DE CERTIFICACIÓN PWA:');
    console.error(error.message);
    process.exitCode = 1;
  } finally {
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
    await closeDatabasePool();
  }
}

runPwaConcurrencyTests();
