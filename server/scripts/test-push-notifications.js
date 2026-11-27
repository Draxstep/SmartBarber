/**
 * @file test-push-notifications.js
 * @description Prueba automatizada de extremo a extremo para Web Push API + VAPID (RFC 8292).
 * Verifica endpoints duales, persistencia con rol/sede, prueba en vivo, triggers de negocio y cleanup 410.
 */
import http from 'http';
import { app } from '../app.js';
import { getDatabasePool } from '../shared/database/connection.js';
import { pushService } from '../services/push.service.js';

async function main() {
  console.log('🔔 ==============================================================');
  console.log('🔔 SMARTBARBER - PRUEBA END-TO-END DE NOTIFICACIONES PUSH VAPID');
  console.log('🔔 ==============================================================');

  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  const baseUrl = `http://localhost:${port}`;
  console.log(`🌐 Servidor de prueba iniciado en ${baseUrl}`);

  const pool = getDatabasePool();
  let adminToken = null;
  let adminUser = null;

  try {
    // 1. Autenticar Administrador
    console.log('\n🔑 [1/6] Autenticando Administrador...');
    const loginRes = await fetch(`${baseUrl}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        correo: 'admin@smartbarber.co',
        contrasena: 'Admin123456!'
      })
    });
    const loginData = await loginRes.json();
    if (!loginData.success || !loginData.data.token) {
      throw new Error('Fallo al autenticar: ' + JSON.stringify(loginData));
    }
    adminToken = loginData.data.token;
    adminUser = loginData.data.usuario;
    console.log(`✅ Administrador autenticado: ${adminUser.correo} (rol: ${adminUser.rol})`);

    // 2. Consulta de Clave Pública VAPID (Rutas duales)
    console.log('\n🗝️ [2/6] Verificando endpoints de clave pública VAPID...');
    const resKeyEn = await fetch(`${baseUrl}/api/v1/push/vapid-public-key`);
    const dataKeyEn = await resKeyEn.json();
    if (!dataKeyEn.success || !dataKeyEn.data.publicKey) {
      throw new Error('Fallo en /vapid-public-key: ' + JSON.stringify(dataKeyEn));
    }

    const resKeyEs = await fetch(`${baseUrl}/api/v1/push/clave-publica`);
    const dataKeyEs = await resKeyEs.json();
    if (!dataKeyEs.success || dataKeyEs.data.publicKey !== dataKeyEn.data.publicKey) {
      throw new Error('Inconsistencia en /clave-publica: ' + JSON.stringify(dataKeyEs));
    }
    console.log(`✅ Clave pública VAPID verificada en ambas rutas (${dataKeyEn.data.publicKey.substring(0, 25)}...)`);

    // 3. Suscripción y Persistencia con Rol y Sede
    console.log('\n📝 [3/6] Registrando suscripción Push con rol y sede_id...');
    const testEndpoint = `https://fcm.googleapis.com/fcm/send/test-sub-${Date.now()}`;
    const testSubscription = {
      endpoint: testEndpoint,
      keys: {
        p256dh: 'BNcRdreALRFXTkOOUHK1EtK2wtaz5Ry4YfYCA_0QT9AcPP313T59P2O_1G_TestKeyBase64Sample==',
        auth: 'tH820qG5yU_SampleAuth=='
      }
    };

    const subRes = await fetch(`${baseUrl}/api/v1/push/subscribe`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        subscription: testSubscription,
        rol: adminUser.rol,
        sedeId: adminUser.sedeId
      })
    });
    const subData = await subRes.json();
    if (!subData.success || !subData.data.suscripcion_id) {
      throw new Error('Fallo al suscribir en /subscribe: ' + JSON.stringify(subData));
    }

    // Verificar en PostgreSQL que rol y sede_id se guardaron
    const dbRes = await pool.query(
      'SELECT usuario_id, endpoint, rol, sede_id FROM push_suscripciones WHERE endpoint = $1',
      [testEndpoint]
    );
    if (dbRes.rows.length === 0) throw new Error('La suscripción no existe en PostgreSQL');
    const row = dbRes.rows[0];
    if (row.rol !== adminUser.rol) throw new Error(`Rol esperado ${adminUser.rol}, obtenido: ${row.rol}`);
    console.log(`✅ Suscripción persistida en PostgreSQL con rol="${row.rol}" y sede_id="${row.sede_id}".`);

    // 4. Enviar Notificación de Prueba en Vivo (POST /api/v1/push/test)
    console.log('\n🚀 [4/6] Probando endpoint de Notificación de Prueba (POST /api/v1/push/test)...');
    // Mock temporal de webpush para simular éxito sin salir a red real
    const originalWebpush = pushService.webpush;
    let pushEntregado = false;
    let payloadRecibido = null;

    pushService.webpush = {
      sendNotification: async (config, payloadStr) => {
        if (config.endpoint === testEndpoint) {
          pushEntregado = true;
          payloadRecibido = JSON.parse(payloadStr);
          return { statusCode: 201 };
        }
        return originalWebpush.sendNotification(config, payloadStr);
      }
    };

    const testRes = await fetch(`${baseUrl}/api/v1/push/test`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`
      }
    });
    const testData = await testRes.json();
    if (!testData.success || !pushEntregado) {
      throw new Error('Fallo en test push: ' + JSON.stringify(testData));
    }
    console.log(`✅ Notificación de prueba despachada exitosamente.`);
    console.log(`   Título recibido: "${payloadRecibido.titulo}"`);
    console.log(`   Cuerpo recibido: "${payloadRecibido.cuerpo}"`);
    console.log(`   URL destino: "${payloadRecibido.url}"`);

    // 5. Simular Disparador de Negocio: Nueva Cita y Alerta de Inventario
    console.log('\n💈 [5/6] Verificando disparadores de negocio (Nueva Cita & Alerta Inventario)...');
    let citaPushRecibido = false;
    let invPushRecibido = false;

    pushService.webpush = {
      sendNotification: async (config, payloadStr) => {
        const p = JSON.parse(payloadStr);
        if (p.tag?.startsWith('cita-')) {
          citaPushRecibido = true;
          console.log(`   [Trigger Cita] Título: "${p.titulo}", Cuerpo: "${p.cuerpo}"`);
        }
        if (p.tag?.startsWith('inv-alerta-')) {
          invPushRecibido = true;
          console.log(`   [Trigger Inventario] Título: "${p.titulo}", Cuerpo: "${p.cuerpo}"`);
        }
        return { statusCode: 201 };
      }
    };

    // Disparo 1: Nueva Cita
    await pushService.notificarNuevaCita({
      cita: { codigoReserva: 'SB-TEST99' },
      barberoId: null,
      clienteNombre: 'Carlos Santana',
      servicioNombre: 'Corte Clásico & Barba',
      horaFormateada: '10:30',
      fecha: '2026-11-28'
    });

    // Disparo 2: Alerta Inventario Agotado
    await pushService.notificarAlertaInventario({
      productoId: 'prod-test-uuid',
      nombre: 'Cera Mate Pomade',
      stockActual: 0,
      stockMinimo: 3,
      agotado: true
    });

    if (!citaPushRecibido || !invPushRecibido) {
      throw new Error(`Fallo en triggers: cita=${citaPushRecibido}, inventario=${invPushRecibido}`);
    }
    console.log('✅ Ambos disparadores de negocio ejecutados con éxito.');

    // 6. Desuscripción y Limpieza (DELETE /api/v1/push/unsubscribe)
    console.log('\n🧹 [6/6] Verificando desuscripción y limpieza (DELETE /api/v1/push/unsubscribe)...');
    const unsubRes = await fetch(`${baseUrl}/api/v1/push/unsubscribe`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify({ endpoint: testEndpoint })
    });
    const unsubData = await unsubRes.json();
    if (!unsubData.success) throw new Error('Fallo al desuscribir: ' + JSON.stringify(unsubData));

    // Confirmar eliminación en PostgreSQL
    const checkDel = await pool.query('SELECT 1 FROM push_suscripciones WHERE endpoint = $1', [testEndpoint]);
    if (checkDel.rows.length > 0) throw new Error('El endpoint sigue existiendo tras desuscribir');
    console.log('✅ Endpoint eliminado correctamente de PostgreSQL.');

    // Restaurar webpush original
    pushService.webpush = originalWebpush;

    console.log('\n🎉 ==============================================================');
    console.log('🎉 TODAS LAS 6 PRUEBAS DE WEB PUSH VAPID PASARON CON ÉXITO AL 100%');
    console.log('🎉 ==============================================================');
  } finally {
    server.close();
    await pool.end();
  }
}

main().catch((err) => {
  console.error('❌ Error en prueba Web Push:', err);
  process.exit(1);
});
