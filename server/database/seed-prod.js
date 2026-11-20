/**
 * @file seed-prod.js
 * @description Script de inicialización de datos para Producción (Go-Live Sanity).
 * Siembra estrictamente la infraestructura base: Sede, Usuarios Administrativos,
 * Catálogo Oficial de Servicios, Perfiles de Barberos con Turnos Semanales y Productos.
 * 
 * GARANTÍAS DE PRODUCCIÓN:
 * - 0 citas ficticias o de prueba.
 * - 0 registros de corte o movimientos de caja simulados.
 * - 0 clientes ficticios.
 * - Idempotente mediante ON CONFLICT.
 */

import { fileURLToPath } from 'url';
import { getDatabasePool, closeDatabasePool } from '../shared/database/connection.js';
import { runTransaction } from '../shared/database/transaction.js';

export async function runProductionSeed() {
  console.log('🚀 Iniciando sembrado limpio de producción (SmartBarber RDS Go-Live)...');

  return await runTransaction(async (client) => {
    // 1. Sede Principal Oficial
    const sedeResult = await client.query(`
      INSERT INTO sedes (
        nombre_comercial,
        eslogan,
        direccion_fisica,
        telefono_contacto,
        correo_contacto,
        horario_general_texto,
        zona_horaria,
        dias_max_anticipacion,
        minutos_min_anticipacion,
        estado_inicial_cita,
        politica_datos_url,
        estado
      ) VALUES (
        'SmartBarber Studio Bogotá',
        'Estilo, precisión y tradición para el caballero moderno.',
        'Calle 85 # 14-20, Zona Rosa, Bogotá D.C.',
        '+573105550001',
        'contacto@smartbarber.co',
        'Lunes a Sábado: 08:00 - 20:00. Domingos y Festivos: 09:00 - 17:00.',
        'America/Bogota',
        30,
        30,
        'pendiente',
        'https://smartbarber.co/politica-tratamiento-datos',
        'activo'
      )
      ON CONFLICT DO NOTHING
      RETURNING sede_id;
    `);

    let sedeId;
    if (sedeResult.rows.length > 0) {
      sedeId = sedeResult.rows[0].sede_id;
    } else {
      const existingSede = await client.query(`SELECT sede_id FROM sedes LIMIT 1`);
      sedeId = existingSede.rows[0].sede_id;
    }
    console.log(`✅ [PROD] Sede Principal verificada: ${sedeId}`);

    // 2. Usuarios Base: Administrador y Barbero de Turno
    const adminHash = '$2b$10$c/YXW.wc6h7JrJoG3M.YZeogERXz2Njlr9Vq0b0DgjpuU1kAMFyUO'; // 'Admin123456!'
    const adminUserRes = await client.query(`
      INSERT INTO usuarios (
        sede_id, correo, contrasena_hash, rol, estado
      ) VALUES (
        $1, 'admin@smartbarber.co', $2, 'administrador', 'activo'
      )
      ON CONFLICT (correo) DO UPDATE SET estado = 'activo'
      RETURNING usuario_id;
    `, [sedeId, adminHash]);
    const adminUserId = adminUserRes.rows[0].usuario_id;

    const barberoHash = '$2b$10$aWjljaVCIi8cjDWsgtxXbeYRoExyCvPoAuvcl5Wi1eUNvSv6m7srW'; // 'Barbero123456!'
    const barberoUserRes = await client.query(`
      INSERT INTO usuarios (
        sede_id, correo, contrasena_hash, rol, estado
      ) VALUES (
        $1, 'barbero@smartbarber.co', $2, 'barbero', 'activo'
      )
      ON CONFLICT (correo) DO UPDATE SET estado = 'activo'
      RETURNING usuario_id;
    `, [sedeId, barberoHash]);
    const barberoUserId = barberoUserRes.rows[0].usuario_id;
    console.log(`✅ [PROD] Credenciales de Producción: Admin (${adminUserId}) y Barbero (${barberoUserId})`);

    // 3. Perfiles de Barberos
    const barbero1 = await client.query(`
      INSERT INTO barberos (
        sede_id, usuario_id, nombre_completo, nombre_publico, telefono, correo, biografia_breve, porcentaje_comision, estado
      ) VALUES (
        $1, $2, 'Carlos Mendoza Ruiz', 'Carlos Fade Master', '+573114445566', 'carlos.mendoza@smartbarber.co',
        'Especialista en degradados, perfilado de barba clásica y diseño.', 45.00, 'activo'
      )
      ON CONFLICT (correo) DO UPDATE SET usuario_id = $2, estado = 'activo'
      RETURNING barbero_id;
    `, [sedeId, barberoUserId]);
    const barbero1Id = barbero1.rows[0].barbero_id;

    const barbero2 = await client.query(`
      INSERT INTO barberos (
        sede_id, usuario_id, nombre_completo, nombre_publico, telefono, correo, biografia_breve, porcentaje_comision, estado
      ) VALUES (
        $1, NULL, 'Alejandro Torres Peña', 'Alejo Barber', '+573123334455', 'alejo.torres@smartbarber.co',
        'Máster en corte a tijera clásico, toalla caliente y tratamiento capilar.', 50.00, 'activo'
      )
      ON CONFLICT (correo) DO UPDATE SET estado = 'activo'
      RETURNING barbero_id;
    `, [sedeId]);
    const barbero2Id = barbero2.rows[0].barbero_id;
    console.log(`✅ [PROD] Barberos activos vinculados: Carlos (${barbero1Id}), Alejo (${barbero2Id})`);

    // 4. Plantillas de Horarios Semanales (Lunes a Sábado en franjas estándar)
    for (const bId of [barbero1Id, barbero2Id]) {
      for (let dia = 1; dia <= 6; dia++) {
        await client.query(`
          INSERT INTO horarios_barberos (barbero_id, dia_semana, numero_franja, es_descanso, hora_inicio, hora_fin)
          VALUES ($1, $2, 1, false, '08:00:00', '13:00:00')
          ON CONFLICT (barbero_id, dia_semana, numero_franja) DO NOTHING;
        `, [bId, dia]);

        await client.query(`
          INSERT INTO horarios_barberos (barbero_id, dia_semana, numero_franja, es_descanso, hora_inicio, hora_fin)
          VALUES ($1, $2, 2, false, '14:00:00', '19:00:00')
          ON CONFLICT (barbero_id, dia_semana, numero_franja) DO NOTHING;
        `, [bId, dia]);
      }
      // Domingo descanso
      await client.query(`
        INSERT INTO horarios_barberos (barbero_id, dia_semana, numero_franja, es_descanso, hora_inicio, hora_fin)
        VALUES ($1, 7, 1, true, NULL, NULL)
        ON CONFLICT (barbero_id, dia_semana, numero_franja) DO NOTHING;
      `, [bId]);
    }
    console.log('✅ [PROD] Plantillas de horarios semanales aplicadas.');

    // 5. Catálogo Oficial de Servicios
    const servicios = [
      { nombre: 'Corte Clásico & Fade', descripcion_breve: 'Degradado con máquina y tijera, incluye lavado rápido y peinado.', precio_cop: 25000, duracion_bloques: 1, orden_visual: 1 },
      { nombre: 'Barba Spa con Toalla Caliente', descripcion_breve: 'Ritual tradicional de afeitado con toalla caliente, aceites y bálsamo.', precio_cop: 20000, duracion_bloques: 1, orden_visual: 2 },
      { nombre: 'Combo VIP: Corte + Barba + Mascarilla', descripcion_breve: 'Experiencia completa: corte personalizado, perfilado de barba y mascarilla negra.', precio_cop: 45000, duracion_bloques: 2, orden_visual: 3 },
      { nombre: 'Perfilado de Cejas y Cerquillo', descripcion_breve: 'Limpieza con navaja y definición de líneas faciales.', precio_cop: 12000, duracion_bloques: 1, orden_visual: 4 }
    ];

    for (const serv of servicios) {
      await client.query(`
        INSERT INTO servicios (
          sede_id, nombre, descripcion_breve, precio_cop, duracion_bloques, visible_publico, orden_visual, estado
        ) VALUES ($1, $2, $3, $4, $5, true, $6, 'activo')
        ON CONFLICT DO NOTHING;
      `, [sedeId, serv.nombre, serv.descripcion_breve, serv.precio_cop, serv.duracion_bloques, serv.orden_visual]);
    }
    console.log('✅ [PROD] Catálogo de 4 servicios oficiales verificado.');

    // 6. Inventario Inicial de Productos
    const productos = [
      { sku: 'POM-MATE-100G', nombre: 'Cera Pomada Moldeadora Mate 100g', categoria: 'Fijación y Estilo', precio_venta_cop: 32000, costo_unitario_cop: 18000, stock_actual: 25, stock_minimo: 5 },
      { sku: 'OIL-BEARD-30ML', nombre: 'Óleo para Barba con Eucalipto y Argán 30ml', categoria: 'Cuidado Facial y Barba', precio_venta_cop: 28000, costo_unitario_cop: 14000, stock_actual: 12, stock_minimo: 4 },
      { sku: 'SHAMPOO-ANTI-250', nombre: 'Champú Fortificante Anticaspa 250ml', categoria: 'Cuidado Capilar', precio_venta_cop: 35000, costo_unitario_cop: 20000, stock_actual: 10, stock_minimo: 3 }
    ];

    for (const prod of productos) {
      await client.query(`
        INSERT INTO productos_inventario (
          sede_id, sku, nombre, categoria, precio_venta_cop, costo_unitario_cop, stock_actual, stock_minimo, estado
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'activo')
        ON CONFLICT DO NOTHING;
      `, [sedeId, prod.sku, prod.nombre, prod.categoria, prod.precio_venta_cop, prod.costo_unitario_cop, prod.stock_actual, prod.stock_minimo]);
    }
    console.log('✅ [PROD] Inventario base verificado con existencias reales.');

    console.log('🏁 SEMBRADO DE PRODUCCIÓN FINALIZADO: Cero citas ficticias, base lista para clientes reales.');
    return { sedeId, adminUserId, barberoUserId };
  });
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  runProductionSeed()
    .then(async (res) => {
      console.log('🎉 Producción inicializada:', res);
      await closeDatabasePool();
      process.exit(0);
    })
    .catch(async (err) => {
      console.error('💥 Error en sembrado de producción:', err.message);
      await closeDatabasePool();
      process.exit(1);
    });
}
