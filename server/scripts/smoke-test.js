/**
 * @file smoke-test.js
 * @description Script ejecutable de prueba de humo (Smoke Test) para validar la conexión real,
 * el acceso al esquema de PostgreSQL RDS, los repositorios modulares y las restricciones GiST.
 */
import { checkDatabaseHealth } from '../shared/database/health.js';
import { getDatabasePool, closeDatabasePool } from '../shared/database/connection.js';
import { runTransaction } from '../shared/database/transaction.js';
import { ExclusionViolationError } from '../shared/errors/domainErrors.js';
import { sedeRepository } from '../modules/sedes/index.js';
import { barberoRepository } from '../modules/barberos/index.js';
import { servicioRepository } from '../modules/servicios/index.js';
import { clienteRepository } from '../modules/clientes/index.js';
import { citaRepository } from '../modules/agendamiento/index.js';
import { inventarioRepository } from '../modules/inventario/index.js';

async function runSmokeTest() {
  console.log('================================================================');
  console.log('🧪 SMARTBARBER - SMOKE TEST DE BASE DE DATOS Y CAPA DE MODELOS');
  console.log('================================================================\n');

  let passedTests = 0;
  let totalTests = 0;

  const assertTest = (name, condition, extra = '') => {
    totalTests++;
    if (condition) {
      passedTests++;
      console.log(`✅ [TEST ${totalTests}] ${name} ${extra ? `-> ${extra}` : ''}`);
    } else {
      console.error(`❌ [TEST ${totalTests}] FALLÓ: ${name} ${extra ? `-> ${extra}` : ''}`);
    }
  };

  try {
    // 1. Health Check y Conexión
    console.log('--- 1. Chequeo de Conectividad y Health Check ---');
    const health = await checkDatabaseHealth();
    assertTest('Conectividad con PostgreSQL RDS', health.ok, `Latencia: ${health.latencyMs}ms`);
    assertTest('Timezone configurado en la sesión', health.configuredTimezone === 'UTC', `TZ: ${health.configuredTimezone}`);
    console.log(`   ℹ️ Versión del motor: ${health.version.split('\n')[0]}\n`);

    // 2. Verificación de Esquema y Tablas
    console.log('--- 2. Verificación de Esquema de Base de Datos ---');
    const pool = getDatabasePool();
    const tablesRes = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `);
    const existingTables = tablesRes.rows.map((r) => r.table_name);
    const requiredTables = [
      'sedes',
      'usuarios',
      'sesiones_usuarios',
      'barberos',
      'horarios_barberos',
      'bloqueos_horarios',
      'servicios',
      'clientes',
      'citas',
      'citas_servicios',
      'historial_estados_citas',
      'notificaciones_correo',
      'registros_cortes',
      'registros_cortes_servicios',
      'productos_inventario',
      'movimientos_inventario'
    ];

    const missingTables = requiredTables.filter((t) => !existingTables.includes(t));
    assertTest('Presencia de las 16 tablas del modelo', missingTables.length === 0, missingTables.length ? `Faltan: ${missingTables.join(', ')}` : '16/16 tablas presentes');

    // 3. Verificación de Extensión btree_gist
    const extRes = await pool.query("SELECT installed_version FROM pg_available_extensions WHERE name = 'btree_gist'");
    const gistInstalled = extRes.rows.length > 0 && extRes.rows[0].installed_version !== null;
    assertTest('Extensión btree_gist instalada', gistInstalled, `Versión: ${extRes.rows[0]?.installed_version}`);

    // 4. Prueba de Repositorios Modulares
    console.log('\n--- 3. Prueba de Acceso mediante Repositorios Modulares ---');
    const sedePrincipal = await sedeRepository.findPrincipal();
    assertTest('Recuperación de Sede Principal', sedePrincipal !== null, `Nombre: ${sedePrincipal?.nombreComercial}`);

    if (sedePrincipal) {
      const barberos = await barberoRepository.findBySede(sedePrincipal.sedeId);
      assertTest('Listado de Barberos activos', barberos.length > 0, `Total barberos: ${barberos.length}`);

      const servicios = await servicioRepository.findBySede(sedePrincipal.sedeId);
      assertTest('Listado de Catálogo de Servicios', servicios.length > 0, `Total servicios: ${servicios.length}`);

      const alertasStock = await inventarioRepository.findAlertasStock(sedePrincipal.sedeId);
      assertTest('Detección de alertas de Stock Bajo (Índice parcial)', Array.isArray(alertasStock), `Items con alerta: ${alertasStock.length}`);

      // 5. Prueba de Transacción ACID y Rollback
      console.log('\n--- 4. Prueba de Transacción ACID y Unit of Work ---');
      let rollbackOk = false;
      try {
        await runTransaction(async (client) => {
          await client.query(
            "INSERT INTO clientes (sede_id, nombre_completo, telefono_whatsapp, correo) VALUES ($1, 'Test Rollback', '3000000000', 'rollback@test.com')",
            [sedePrincipal.sedeId]
          );
          // Forzar fallo para probar rollback
          throw new Error('Fallo provocado para verificar ROLLBACK');
        });
      } catch (err) {
        // Verificar que no se persistió
        const checkClient = await clienteRepository.findByCorreo(sedePrincipal.sedeId, 'rollback@test.com');
        rollbackOk = checkClient === null;
      }
      assertTest('Transacción ACID ejecutó ROLLBACK ante fallo', rollbackOk);

      // 6. Prueba de Exclusión GiST de Citas (Anti-solapamiento RN-01)
      console.log('\n--- 5. Prueba de Control de Concurrencia (Exclusión GiST) ---');
      if (barberos.length > 0 && servicios.length > 0) {
        // Crear cliente temporal de prueba
        const clienteTest = await clienteRepository.upsert({
          sedeId: sedePrincipal.sedeId,
          nombreCompleto: 'Cliente Concurrencia Test',
          telefonoWhatsapp: '3109998877',
          correo: 'concurrencia.test@smartbarber.co',
          aceptoPoliticaDatosEn: new Date()
        });

        // Liberar cualquier cita previa del cliente de prueba
        await pool.query(
          "UPDATE citas SET estado = 'cancelada' WHERE cliente_id = $1 AND estado IN ('pendiente', 'confirmada')",
          [clienteTest.clienteId]
        );

        const barberoId = barberos[0].barberoId;
        const fechaTest = '2026-12-01';
        const horaInicioTest = '10:00:00';
        const horaFinTest = '10:30:00';
        const inicioEnTest = '2026-12-01T15:00:00.000Z';
        const finEnTest = '2026-12-01T15:30:00.000Z';

        // Generar códigos Crockford conformes con regex ^SB-[A-HJ-NP-Z2-9]{6}$
        const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
        const genCode = () => 'SB-' + Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
        const code1 = genCode();
        const code2 = genCode();

        // 1ra cita
        const cita1 = await citaRepository.createWithServices(
          {
            sedeId: sedePrincipal.sedeId,
            codigoReserva: code1,
            clienteId: clienteTest.clienteId,
            barberoId,
            barberoAsignadoAutomaticamente: false,
            fecha: fechaTest,
            horaInicio: horaInicioTest,
            horaFin: horaFinTest,
            inicioEn: inicioEnTest,
            finEn: finEnTest,
            bloquesTotales: 1,
            precioEstimadoCop: 25000,
            estado: 'confirmada',
            origen: 'landing'
          },
          [
            {
              servicioId: servicios[0].servicioId,
              nombreServicioSnapshot: servicios[0].nombre,
              precioCopSnapshot: servicios[0].precioCop,
              duracionBloquesSnapshot: servicios[0].duracionBloques
            }
          ]
        );

        assertTest('Creación exitosa de Cita #1', cita1 !== null, `Código: ${cita1?.codigoReserva}`);

        // 2da cita en el mismo bloque y barbero (DEBE fallar por EXCLUDE USING GIST)
        let colisionDetectada = false;
        try {
          await citaRepository.createWithServices(
            {
              sedeId: sedePrincipal.sedeId,
              codigoReserva: code2,
              clienteId: clienteTest.clienteId,
              barberoId,
              barberoAsignadoAutomaticamente: false,
              fecha: fechaTest,
              horaInicio: horaInicioTest,
              horaFin: horaFinTest,
              inicioEn: inicioEnTest,
              finEn: finEnTest,
              bloquesTotales: 1,
              precioEstimadoCop: 25000,
              estado: 'confirmada',
              origen: 'landing'
            },
            [
              {
                servicioId: servicios[0].servicioId,
                nombreServicioSnapshot: servicios[0].nombre,
                precioCopSnapshot: servicios[0].precioCop,
                duracionBloquesSnapshot: servicios[0].duracionBloques
              }
            ]
          );
        } catch (err) {
          colisionDetectada = err instanceof ExclusionViolationError || err.code === 'EXCLUSION_VIOLATION';
        }

        assertTest('Motor GiST bloqueó cita solapada (ExclusionViolationError)', colisionDetectada);

        // Limpieza controlada: transición a 'cancelada' (libera el bloque GiST respetando la inmutabilidad de la auditoría)
        await citaRepository.updateEstado(cita1.citaId, {
          nuevoEstado: 'cancelada',
          observacion: 'Smoke test finalizado con éxito',
          motivoCancelacion: 'Limpieza automatizada de prueba'
        });
        console.log('   🧹 Cita de prueba cancelada correctamente (bloque GiST liberado preservando auditoría).');
      }
    }

    console.log('\n================================================================');
    console.log(`📊 RESULTADO FINAL: ${passedTests}/${totalTests} pruebas superadas (${Math.round((passedTests / totalTests) * 100)}%)`);
    console.log('================================================================\n');

    return passedTests === totalTests;
  } catch (err) {
    console.error('💥 Excepción no controlada en el Smoke Test:', err);
    return false;
  } finally {
    await closeDatabasePool();
  }
}

runSmokeTest().then((success) => {
  process.exit(success ? 0 : 1);
});
