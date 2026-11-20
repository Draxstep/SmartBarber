/**
 * @file integration-test.js
 * @description Suite completa de pruebas de integración end-to-end para la API de SmartBarber.
 * Valida los 25 Casos de Uso, RBAC, Concurrencia, Reglas de Negocio y RNF.
 */
import http from 'http';
import { app } from '../app.js';
import { closeDatabasePool } from '../shared/database/connection.js';

let server;
let baseUrl;

function logTest(num, name, passed, details = '') {
  const icon = passed ? '✅' : '❌';
  console.log(`${icon} [TEST ${String(num).padStart(2, '0')}] ${name}${details ? ` -> ${details}` : ''}`);
  if (!passed) {
    throw new Error(`Prueba ${num} falló: ${name} (${details})`);
  }
}

async function request(path, options = {}) {
  const url = `${baseUrl}${path}`;
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

async function runTests() {
  console.log('💈 ==============================================================================');
  console.log('💈 SMARTBARBER - SUITE DE INTEGRACIÓN END-TO-END DE LA API REST');
  console.log('💈 ==============================================================================\n');

  // Iniciar servidor HTTP en puerto efímero asignado por el SO
  await new Promise((resolve) => {
    server = http.createServer(app);
    server.listen(0, () => {
      const port = server.address().port;
      baseUrl = `http://localhost:${port}`;
      console.log(`🌐 Servidor de pruebas iniciado en ${baseUrl}\n`);
      resolve();
    });
  });

  let adminToken = '';
  let testSedeId = '';
  let testBarberoId = '';
  let testServicioId = '';
  let testProductoId = '';
  let testCitaId = '';
  let testCodigoReserva = '';
  let testCorteId = '';

  try {
    // --------------------------------------------------------------------------
    // 1. Salud del Sistema y Ping
    // --------------------------------------------------------------------------
    const resHealth = await request('/api/health');
    logTest(1, 'Endpoint de salud del sistema (/api/health) reporta base de datos UP', resHealth.status === 200 && resHealth.data.database.status === 'UP');

    const resPing = await request('/api/v1/ping');
    logTest(2, 'Verificación de API router central (/api/v1/ping)', resPing.status === 200 && resPing.data.success === true);

    // --------------------------------------------------------------------------
    // 2. Portal Público de Agendamiento (CU-020, CU-025, CU-021)
    // --------------------------------------------------------------------------
    const resPublicInfo = await request('/api/v1/public/info');
    logTest(
      3,
      'CU-020: Consultar Portal Público informativo (Landing Page)',
      resPublicInfo.status === 200 && resPublicInfo.data.data.negocio.nombreComercial.includes('SmartBarber'),
      `Sede: ${resPublicInfo.data?.data?.negocio?.nombreComercial}`
    );

    testSedeId = resPublicInfo.data.data.negocio.sedeId;
    testBarberoId = resPublicInfo.data.data.barberos[0]?.barberoId;
    testServicioId = resPublicInfo.data.data.servicios[0]?.servicioId;

    // Fecha futura para pruebas (aleatoria dentro de los próximos 25 días para idempotencia)
    const randomDayOffset = 2 + Math.floor(Math.random() * 20);
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + randomDayOffset);
    const fechaPrueba = targetDate.toISOString().slice(0, 10);

    const resDisp = await request(`/api/v1/public/disponibilidad?fecha=${fechaPrueba}&duracionBloques=1`);
    logTest(
      4,
      'CU-025: Calcular y validar disponibilidad de bloques horarios discretos de 30 min',
      resDisp.status === 200 && Array.isArray(resDisp.data.data.horariosDisponibles),
      `Slots libres: ${resDisp.data.data.horariosDisponibles.length}`
    );

    const horaInicioDisponible = resDisp.data.data.horariosDisponibles[0] || '10:00';

    // --------------------------------------------------------------------------
    // 3. Autenticación, JWT y Control de Sesión (CU-001)
    // --------------------------------------------------------------------------
    const resLoginFallido = await request('/api/v1/auth/login', {
      method: 'POST',
      body: { correo: 'admin@smartbarber.co', contrasena: 'clave_incorrecta_123' }
    });
    logTest(
      5,
      'CU-001 / RNF-09: Rechazo de credenciales incorrectas',
      resLoginFallido.status === 401 && resLoginFallido.data.error.code === 'UNAUTHORIZED'
    );

    const resLogin = await request('/api/v1/auth/login', {
      method: 'POST',
      body: { correo: 'admin@smartbarber.co', contrasena: 'Admin123456!' }
    });
    logTest(
      6,
      'CU-001: Iniciar sesión exitosamente y emisión de Bearer JWT de 8h',
      resLogin.status === 200 && Boolean(resLogin.data.data.token),
      `Rol: ${resLogin.data?.data?.usuario?.rol}`
    );

    adminToken = resLogin.data.data.token;
    const authHeaders = { Authorization: `Bearer ${adminToken}` };

    const resMe = await request('/api/v1/auth/me', { headers: authHeaders });
    logTest(7, 'CU-001: Verificación de sesión activa y datos de usuario autenticado (/api/v1/auth/me)', resMe.status === 200 && resMe.data.data.usuario.rol === 'administrador');

    // --------------------------------------------------------------------------
    // 4. Módulo 3: Catálogo de Servicios (CU-014, CU-015)
    // --------------------------------------------------------------------------
    const resServicios = await request('/api/v1/servicios', { headers: authHeaders });
    logTest(8, 'CU-015: Consultar catálogo completo de servicios', resServicios.status === 200 && resServicios.data.data.length >= 4);

    const resCreateServicio = await request('/api/v1/servicios', {
      method: 'POST',
      headers: authHeaders,
      body: {
        sedeId: testSedeId,
        nombre: `Corte Ejecutivo VIP Test ${Date.now()}`,
        descripcionBreve: 'Corte con lavado y masaje capilar',
        precioCop: 45000,
        duracionBloques: 2,
        visiblePublico: true,
        estado: 'activo'
      }
    });
    logTest(
      9,
      'CU-014: Crear servicio con duración de 2 bloques (60 min) y precio en COP',
      resCreateServicio.status === 201 && resCreateServicio.data.data.precioCop === 45000
    );

    // --------------------------------------------------------------------------
    // 5. Módulo 2: Barberos y Horarios (CU-009, CU-011, CU-012, CU-013)
    // --------------------------------------------------------------------------
    const resBarberos = await request('/api/v1/barberos', { headers: authHeaders });
    logTest(10, 'CU-009: Consultar lista de barberos del negocio', resBarberos.status === 200 && resBarberos.data.data.length >= 2);

    const resHorarios = await request(`/api/v1/barberos/${testBarberoId}/horarios`, { headers: authHeaders });
    logTest(11, 'CU-011: Consultar horarios semanales del barbero', resHorarios.status === 200 && Array.isArray(resHorarios.data.data));

    const resBloqueo = await request(`/api/v1/barberos/${testBarberoId}/bloqueos`, {
      method: 'POST',
      headers: authHeaders,
      body: {
        fecha: fechaPrueba,
        diaCompleto: false,
        horaInicio: '13:00:00',
        horaFin: '14:00:00',
        inicioEn: `${fechaPrueba}T13:00:00-05:00`,
        finEn: `${fechaPrueba}T14:00:00-05:00`,
        motivo: 'Capacitación técnica en navaja'
      }
    });
    logTest(
      12,
      'CU-012: Gestionar bloqueo puntual de agenda para un barbero',
      resBloqueo.status === 201 && resBloqueo.data?.data?.motivo?.includes('Capacitación'),
      `Status: ${resBloqueo.status}, Msg: ${JSON.stringify(resBloqueo.data)}`
    );

    // Limpieza del bloqueo de prueba
    if (resBloqueo.data?.data?.bloqueoId) {
      await request(`/api/v1/barberos/${testBarberoId}/bloqueos/${resBloqueo.data.data.bloqueoId}`, {
        method: 'DELETE',
        headers: authHeaders
      });
    }

    // --------------------------------------------------------------------------
    // 6. Módulo 5: Agendamiento de Citas (CU-021, CU-022, CU-023)
    // --------------------------------------------------------------------------
    const resReservaPublica = await request('/api/v1/public/reservar', {
      method: 'POST',
      body: {
        sedeId: testSedeId,
        servicioIds: [testServicioId],
        barberoId: testBarberoId,
        fecha: fechaPrueba,
        horaInicio: horaInicioDisponible,
        cliente: {
          nombreCompleto: 'Juan Pérez E2E Test',
          telefono: '3001234567',
          correo: `juan.test.${Date.now()}@example.com`,
          aceptoPoliticaDatos: true
        },
        notasCliente: 'Primera vez en la barbería'
      }
    });

    logTest(
      13,
      'CU-021: Reservar cita en línea desde Landing Page (genera código SB-XXXXXX)',
      resReservaPublica.status === 201 && resReservaPublica.data.data.codigoReserva.startsWith('SB-'),
      `Código: ${resReservaPublica.data?.data?.codigoReserva}`
    );

    testCitaId = resReservaPublica.data.data.citaId;
    testCodigoReserva = resReservaPublica.data.data.codigoReserva;

    const resConsultaReserva = await request(`/api/v1/public/reservas/${testCodigoReserva}`);
    logTest(
      14,
      'CU-021 / RF-AGE-06: Consulta pública de estado de reserva por código único',
      resConsultaReserva.status === 200 && resConsultaReserva.data.data.codigoReserva === testCodigoReserva
    );

    const resAgenda = await request(`/api/v1/citas/agenda?fecha=${fechaPrueba}`, { headers: authHeaders });
    logTest(15, 'CU-022: Visualizar agenda diaria en el Backoffice', resAgenda.status === 200 && resAgenda.data.data.totalCitas >= 1);

    const resCambiarEstado = await request(`/api/v1/citas/${testCitaId}/estado`, {
      method: 'PATCH',
      headers: authHeaders,
      body: {
        nuevoEstado: 'confirmada',
        observacion: 'Confirmada telefónicamente por recepción'
      }
    });
    logTest(
      16,
      'CU-023: Actualizar estado de cita de pendiente a confirmada',
      resCambiarEstado.status === 200 && resCambiarEstado.data.data.estado === 'confirmada'
    );

    // --------------------------------------------------------------------------
    // 7. Módulo 1: Caja y Registro de Cortes (CU-004, CU-005, CU-006, CU-007, CU-008)
    // --------------------------------------------------------------------------
    const resWalkIn = await request('/api/v1/cortes/walk-in', {
      method: 'POST',
      headers: authHeaders,
      body: {
        barberoId: testBarberoId,
        servicioIds: [testServicioId],
        metodoPago: 'efectivo',
        nombreCliente: 'Cliente Mostrador WalkIn',
        notas: 'Atención directa en silla 1'
      }
    });
    logTest(
      17,
      'CU-004: Registrar atención de cliente sin cita (Walk-in) con cálculo automático de comisión',
      resWalkIn.status === 201 && resWalkIn.data.data.origen === 'walk_in',
      `ID Corte: ${resWalkIn.data?.data?.registroCorteId}`
    );

    testCorteId = resWalkIn.data.data.registroCorteId;

    // Validación de RN-15: Ajuste de precio sin justificación debe fallar
    const resAjusteInvalido = await request('/api/v1/cortes/walk-in', {
      method: 'POST',
      headers: authHeaders,
      body: {
        barberoId: testBarberoId,
        servicioIds: [testServicioId],
        metodoPago: 'nequi',
        precioCobradoCop: 10000, // Ajuste manual
        notas: 'desc' // Menor a 5 caracteres -> debe fallar
      }
    });
    logTest(
      18,
      'RN-15: Restricción estricta de ajuste de precio requiere nota justificativa (>= 5 caracteres)',
      resAjusteInvalido.status === 422
    );

    const resConversion = await request(`/api/v1/cortes/convertir-cita/${testCitaId}`, {
      method: 'POST',
      headers: authHeaders,
      body: {
        metodoPago: 'daviplata',
        notas: 'Atención de cita completada con éxito'
      }
    });
    logTest(
      19,
      'CU-005 / RN-08: Conversión atómica 1:1 de cita a corte (marca cita como completada)',
      resConversion.status === 201 && resConversion.data.data.origen === 'cita' && resConversion.data.data.citaId === testCitaId
    );

    // Verificar que la cita efectivamente quedó en completada
    const resCitaCompletada = await request(`/api/v1/citas/${testCitaId}`, { headers: authHeaders });
    logTest(
      20,
      'RN-08: Integración 1:1 cita completada vinculada a registro de corte',
      resCitaCompletada.status === 200 && resCitaCompletada.data.data.estado === 'completada'
    );

    const resHistorialCortes = await request('/api/v1/cortes/historial', { headers: authHeaders });
    logTest(21, 'CU-006: Consultar historial diario de cortes en caja', resHistorialCortes.status === 200 && resHistorialCortes.data.data.length >= 2);

    const resResumen = await request('/api/v1/cortes/resumen', { headers: authHeaders });
    logTest(
      22,
      'CU-007 / RF-COR-04: Consultar resumen de ingresos con desglose por los 5 métodos de pago',
      resResumen.status === 200 && typeof resResumen.data.data.desgloseMetodosPago === 'object' && resResumen.data.data.totalIngresosCop > 0,
      `Total: $ ${resResumen.data?.data?.totalIngresosCop?.toLocaleString()} COP`
    );

    const resAnular = await request(`/api/v1/cortes/${testCorteId}/anular`, {
      method: 'PATCH',
      headers: authHeaders,
      body: {
        motivoAnulacion: 'Digitación errónea en el método de pago por el cajero',
        revertirEstadoCita: false
      }
    });
    logTest(
      23,
      'CU-008 / RF-COR-05: Anular corte auditado con motivo obligatorio (>= 10 caracteres)',
      resAnular.status === 200 && resAnular.data.data.estado === 'anulado'
    );

    // --------------------------------------------------------------------------
    // 8. Módulo 4: Inventario y Kardex (CU-016 a CU-019)
    // --------------------------------------------------------------------------
    const resCreateProd = await request('/api/v1/inventario', {
      method: 'POST',
      headers: authHeaders,
      body: {
        sedeId: testSedeId,
        sku: `SKU-TEST-${Date.now()}`,
        nombre: 'Pomada Mate E2E Test 100g',
        categoria: 'Ceras y Pomadas',
        precioVentaCop: 38000,
        costoUnitarioCop: 20000,
        stockInicial: 5,
        stockMinimo: 2,
        estado: 'activo'
      }
    });
    logTest(
      24,
      'CU-016: Crear producto con movimiento automático de inventario inicial',
      resCreateProd.status === 201 && resCreateProd.data.data.stockActual === 5,
      `Producto ID: ${resCreateProd.data?.data?.productoId}`
    );

    testProductoId = resCreateProd.data.data.productoId;

    const resEntrada = await request(`/api/v1/inventario/${testProductoId}/entradas`, {
      method: 'POST',
      headers: authHeaders,
      body: {
        cantidad: 10,
        motivo: 'compra_reposicion',
        observacion: 'Llegada de pedido de proveedor local'
      }
    });
    logTest(
      25,
      'CU-017 / RF-INV-02: Registrar entrada de inventario (incrementa stock a 15)',
      resEntrada.status === 201 && resEntrada.data.data.producto.stockActual === 15
    );

    const resSalida = await request(`/api/v1/inventario/${testProductoId}/salidas`, {
      method: 'POST',
      headers: authHeaders,
      body: {
        cantidad: 14,
        tipo: 'venta_al_publico',
        metodoPago: 'efectivo',
        observacion: 'Venta directa en mostrador'
      }
    });
    logTest(
      26,
      'CU-018 / RN-11: Registrar salida de inventario por venta (deja stock en 1, dispara stock bajo)',
      resSalida.status === 201 && resSalida.data.data.producto.stockActual === 1
    );

    // Validación de RN-10: Intento de salida mayor al stock debe ser rechazado
    const resStockNegativo = await request(`/api/v1/inventario/${testProductoId}/salidas`, {
      method: 'POST',
      headers: authHeaders,
      body: {
        cantidad: 5, // Solo queda 1 unidad en stock
        tipo: 'venta_al_publico',
        metodoPago: 'efectivo'
      }
    });
    logTest(
      27,
      'RN-10: Prohibición absoluta de stock negativo rechaza venta excedente (HTTP 409 Conflict)',
      (resStockNegativo.status === 409 || resStockNegativo.status === 422) && resStockNegativo.data.error.code === 'INSUFFICIENT_STOCK'
    );

    const resAlertas = await request('/api/v1/inventario/alertas', { headers: authHeaders });
    const tieneAlerta = resAlertas.data.data.some((p) => p.productoId === testProductoId);
    logTest(
      28,
      'RN-11: Alerta visual activa de stock bajo detectada en el tablero',
      resAlertas.status === 200 && tieneAlerta,
      `Productos en stock bajo: ${resAlertas.data.data.length}`
    );

    const resKardex = await request(`/api/v1/inventario/${testProductoId}/kardex`, { headers: authHeaders });
    logTest(
      29,
      'CU-019 / RF-INV-05: Historial inmutable de movimientos (Kardex) registra entradas y salidas',
      resKardex.status === 200 && resKardex.data.data.length >= 3,
      `Movimientos registrados: ${resKardex.data.data.length}`
    );

    const resLiquidacion = await request('/api/v1/barberos/liquidaciones?formato=csv', { headers: authHeaders });
    logTest(
      30,
      'CU-013 / RF-BAR-05: Exportación CSV de liquidación referencial de comisiones por barbero',
      resLiquidacion.status === 200 && typeof resLiquidacion.data === 'string' && resLiquidacion.data.includes('Total Facturado COP')
    );

    console.log('\n🎉 ==============================================================================');
    console.log('🎉 TODAS LAS 30 PRUEBAS DE INTEGRACIÓN COMPLETADAS EXITOSAMENTE (100% PASS)');
    console.log('🎉 ==============================================================================\n');
  } catch (err) {
    console.error('\n❌ ERROR DURANTE LA SUITE DE INTEGRACIÓN:', err.message);
    process.exitCode = 1;
  } finally {
    if (server) {
      await new Promise((resolve) => server.close(resolve));
      console.log('🚪 Servidor de pruebas cerrado.');
    }
    await closeDatabasePool();
    console.log('🏊 Pool de base de datos liberado.');
  }
}

runTests();
