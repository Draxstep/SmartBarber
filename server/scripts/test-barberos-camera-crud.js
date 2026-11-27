/**
 * @file test-barberos-camera-crud.js
 * @description Prueba automatizada de extremo a extremo para la carga de fotografía WebRTC y CRUD de Barberos (CU-014 / CU-015).
 */
import http from 'http';
import fs from 'fs';
import path from 'path';
import { app } from '../app.js';
import { getDatabasePool } from '../shared/database/connection.js';

async function main() {
  console.log('🧪 ==============================================================');
  console.log('🧪 SMARTBARBER - PRUEBA END-TO-END CRUD BARBEROS & SUBIDA DE FOTO');
  console.log('🧪 ==============================================================');

  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  const baseUrl = `http://localhost:${port}`;
  console.log(`🌐 Servidor de prueba iniciado en ${baseUrl}`);

  let adminToken = null;
  let barberoToken = null;
  let sedeId = null;

  try {
    // 1. Obtener tokens de autenticación
    console.log('\n🔑 [1/6] Autenticando Administrador y Barbero...');
    const loginAdminRes = await fetch(`${baseUrl}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        correo: 'admin@smartbarber.co',
        contrasena: 'Admin123456!'
      })
    });
    const adminData = await loginAdminRes.json();
    if (!adminData.success) throw new Error('Fallo al autenticar administrador: ' + JSON.stringify(adminData));
    adminToken = adminData.data.token;
    sedeId = adminData.data.usuario.sedeId;

    const loginBarbRes = await fetch(`${baseUrl}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        correo: 'barbero@smartbarber.co',
        contrasena: 'Barbero123456!'
      })
    });
    const barbData = await loginBarbRes.json();
    if (!barbData.success) throw new Error('Fallo al autenticar barbero: ' + JSON.stringify(barbData));
    barberoToken = barbData.data.token;
    console.log('✅ Tokens de administrador y barbero obtenidos correctamente.');

    // 2. Subida de Fotografía
    console.log('\n📸 [2/6] Probando endpoint POST /api/v1/barberos/upload-foto...');
    // Crear una imagen mínima PNG de 1x1 pixel en base64
    const sampleBase64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

    const uploadRes = await fetch(`${baseUrl}/api/v1/barberos/upload-foto`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify({ imagenBase64: sampleBase64 })
    });
    const uploadData = await uploadRes.json();
    if (!uploadData.success || !uploadData.data.fotoUrl) {
      throw new Error('Fallo al subir foto: ' + JSON.stringify(uploadData));
    }
    const uploadedFotoUrl = uploadData.data.fotoUrl;
    console.log(`✅ Fotografía subida exitosamente: ${uploadedFotoUrl}`);

    // Verificar que el archivo realmente existe en el disco
    const localFilePath = path.resolve(process.cwd(), `public${uploadedFotoUrl}`);
    if (!fs.existsSync(localFilePath)) {
      throw new Error(`El archivo físico no fue creado en: ${localFilePath}`);
    }
    console.log(`✅ Archivo físico confirmado en disco (${fs.statSync(localFilePath).size} bytes).`);

    // Probar que el archivo se sirve estáticamente por HTTP
    const staticRes = await fetch(`${baseUrl}${uploadedFotoUrl}`);
    if (staticRes.status !== 200) {
      throw new Error(`No fue posible consultar el archivo estático en ${uploadedFotoUrl} (HTTP ${staticRes.status})`);
    }
    console.log(`✅ Servido estático HTTP 200 verificado para ${uploadedFotoUrl}.`);

    // 3. Crear Barbero con Fotografía y Cuenta de Usuario
    console.log('\n💈 [3/6] Creando nuevo barbero con foto y credenciales (POST /api/v1/barberos)...');
    const timestamp = Date.now();
    const nuevoBarberoPayload = {
      sedeId,
      nombreCompleto: `Barbero Test ${timestamp}`,
      nombrePublico: `Test Barber ${timestamp}`,
      telefono: `310${String(timestamp).slice(-7)}`,
      correo: `test.barber.${timestamp}@smartbarber.co`,
      fotoUrl: uploadedFotoUrl,
      biografiaBreve: 'Especialista en degradados y toalla caliente de prueba.',
      porcentajeComision: 55.5,
      crearUsuario: true,
      contrasenaInicial: 'TestPassword2026*'
    };

    const createRes = await fetch(`${baseUrl}/api/v1/barberos`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify(nuevoBarberoPayload)
    });
    const createData = await createRes.json();
    const createdId = createData.data?.barberoId || createData.data?.id;
    if (!createData.success || !createdId) {
      throw new Error('Fallo al crear barbero: ' + JSON.stringify(createData));
    }
    const createdBarbero = { ...createData.data, id: createdId };
    console.log(`✅ Barbero creado con ID: ${createdBarbero.id}, usuarioId: ${createdBarbero.usuarioId}, foto: ${createdBarbero.fotoUrl}`);

    // 4. Actualizar Barbero (PUT /api/v1/barberos/:id)
    console.log('\n✏️ [4/6] Actualizando barbero (PUT /api/v1/barberos/:id)...');
    const updateRes = await fetch(`${baseUrl}/api/v1/barberos/${createdBarbero.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        nombrePublico: `Test Barber Actualizado ${timestamp}`,
        porcentajeComision: 62.5
      })
    });
    const updateData = await updateRes.json();
    if (!updateData.success || Number(updateData.data.porcentajeComision) !== 62.5) {
      throw new Error('Fallo al actualizar barbero: ' + JSON.stringify(updateData));
    }
    console.log(`✅ Barbero actualizado. Nueva comisión: ${updateData.data.porcentajeComision}%`);

    // 5. Desactivar y Reactivar Barbero (Borrado lógico RN-13)
    console.log('\n🔄 [5/6] Verificando ciclo de activación/desactivación lógica (RN-13)...');
    const citasFuturasRes = await fetch(`${baseUrl}/api/v1/barberos/${createdBarbero.id}/citas-futuras`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const citasFuturasData = await citasFuturasRes.json();
    console.log(`✅ Consulta de citas futuras activa: ${citasFuturasData.data.length} citas.`);

    const desactivarRes = await fetch(`${baseUrl}/api/v1/barberos/${createdBarbero.id}/desactivar`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const desactivarData = await desactivarRes.json();
    const estadoDesactivado = desactivarData.data?.barbero?.estado || desactivarData.data?.estado;
    if (!desactivarData.success || estadoDesactivado !== 'inactivo') {
      throw new Error('Fallo al desactivar barbero: ' + JSON.stringify(desactivarData));
    }
    console.log('✅ Barbero desactivado lógicamente (estado: inactivo).');

    const activarRes = await fetch(`${baseUrl}/api/v1/barberos/${createdBarbero.id}/activar`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const activarData = await activarRes.json();
    const estadoActivado = activarData.data?.barbero?.estado || activarData.data?.estado;
    if (!activarData.success || estadoActivado !== 'activo') {
      throw new Error('Fallo al reactivar barbero: ' + JSON.stringify(activarData));
    }
    console.log('✅ Barbero reactivado exitosamente (estado: activo).');

    // 6. Restricción RBAC: Barbero NO puede crear otro barbero (HTTP 403)
    console.log('\n🛡️ [6/6] Verificando protección RBAC (Barbero intenta crear barbero -> 403)...');
    const rbacRes = await fetch(`${baseUrl}/api/v1/barberos`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${barberoToken}`
      },
      body: JSON.stringify(nuevoBarberoPayload)
    });
    if (rbacRes.status !== 403) {
      throw new Error(`Se esperaba HTTP 403 Forbidden pero se obtuvo HTTP ${rbacRes.status}`);
    }
    console.log('✅ Protección RBAC confirmada: HTTP 403 Forbidden para rol barbero en POST /barberos.');

    // Limpieza del archivo de prueba
    if (fs.existsSync(localFilePath)) {
      fs.unlinkSync(localFilePath);
      console.log('🧹 Archivo de prueba temporal eliminado del disco.');
    }

    console.log('\n🎉 ==============================================================');
    console.log('🎉 TODAS LAS PRUEBAS DE CRUD DE BARBEROS Y FOTO PASARON CON ÉXITO');
    console.log('🎉 ==============================================================');
  } finally {
    server.close();
    const pool = getDatabasePool();
    await pool.end();
  }
}

main().catch((err) => {
  console.error('❌ Error en prueba:', err);
  process.exit(1);
});
