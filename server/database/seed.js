/**
 * @file seed.js
 * @description Script de sembrado de datos iniciales idóneo e idempotente para SmartBarber.
 */
import { fileURLToPath } from 'url';
import { getDatabasePool, closeDatabasePool } from '../shared/database/connection.js';
import { runTransaction } from '../shared/database/transaction.js';

export async function runSeed() {
  console.log('🌱 Iniciando sembrado de datos base en PostgreSQL RDS...');

  return await runTransaction(async (client) => {
    // 1. Sede Principal
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
      console.log(`✅ Sede creada con ID: ${sedeId}`);
    } else {
      const existingSede = await client.query(`SELECT sede_id FROM sedes LIMIT 1`);
      sedeId = existingSede.rows[0].sede_id;
      console.log(`ℹ️ Sede existente recuperada con ID: ${sedeId}`);
    }

    // 2. Usuario Administrador
    // Hash bcrypt real para 'Admin123456!'
    const adminHash = '$2b$10$c/YXW.wc6h7JrJoG3M.YZeogERXz2Njlr9Vq0b0DgjpuU1kAMFyUO';
    const adminUserResult = await client.query(`
      INSERT INTO usuarios (
        sede_id,
        correo,
        contrasena_hash,
        rol,
        estado
      ) VALUES (
        $1,
        'admin@smartbarber.co',
        $2,
        'administrador',
        'activo'
      )
      ON CONFLICT (correo) DO UPDATE SET estado = 'activo'
      RETURNING usuario_id;
    `, [sedeId, adminHash]);

    const adminUserId = adminUserResult.rows[0].usuario_id;
    console.log(`✅ Usuario administrador verificado con ID: ${adminUserId}`);

    // 3. Barberos Iniciales
    const barbero1 = await client.query(`
      INSERT INTO barberos (
        sede_id,
        nombre_completo,
        nombre_publico,
        telefono,
        correo,
        biografia_breve,
        porcentaje_comision,
        estado
      ) VALUES (
        $1,
        'Carlos Mendoza Ruiz',
        'Carlos Fade Master',
        '+573114445566',
        'carlos.mendoza@smartbarber.co',
        'Especialista en degradados, perfilado de barba clásica y diseño.',
        45.00,
        'activo'
      )
      ON CONFLICT (correo) DO UPDATE SET estado = 'activo'
      RETURNING barbero_id;
    `, [sedeId]);
    const barbero1Id = barbero1.rows[0].barbero_id;

    const barbero2 = await client.query(`
      INSERT INTO barberos (
        sede_id,
        nombre_completo,
        nombre_publico,
        telefono,
        correo,
        biografia_breve,
        porcentaje_comision,
        estado
      ) VALUES (
        $1,
        'Alejandro Torres Peña',
        'Alejo Barber',
        '+573123334455',
        'alejo.torres@smartbarber.co',
        'Máster en corte a tijera clásico, toalla caliente y tratamiento capilar.',
        50.00,
        'activo'
      )
      ON CONFLICT (correo) DO UPDATE SET estado = 'activo'
      RETURNING barbero_id;
    `, [sedeId]);
    const barbero2Id = barbero2.rows[0].barbero_id;

    console.log(`✅ Barberos iniciales registrados: Carlos (${barbero1Id}) y Alejo (${barbero2Id})`);

    // 4. Horarios semanales para Carlos (Lunes a Sábado 09:00 - 13:00 y 14:00 - 19:00, Domingo descanso)
    for (let dia = 1; dia <= 6; dia++) {
      await client.query(`
        INSERT INTO horarios_barberos (barbero_id, dia_semana, numero_franja, es_descanso, hora_inicio, hora_fin)
        VALUES ($1, $2, 1, false, '09:00:00', '13:00:00')
        ON CONFLICT (barbero_id, dia_semana, numero_franja) DO NOTHING;
      `, [barbero1Id, dia]);

      await client.query(`
        INSERT INTO horarios_barberos (barbero_id, dia_semana, numero_franja, es_descanso, hora_inicio, hora_fin)
        VALUES ($1, $2, 2, false, '14:00:00', '19:00:00')
        ON CONFLICT (barbero_id, dia_semana, numero_franja) DO NOTHING;
      `, [barbero1Id, dia]);
    }

    // Domingo descanso para Carlos
    await client.query(`
      INSERT INTO horarios_barberos (barbero_id, dia_semana, numero_franja, es_descanso, hora_inicio, hora_fin)
      VALUES ($1, 7, 1, true, NULL, NULL)
      ON CONFLICT (barbero_id, dia_semana, numero_franja) DO NOTHING;
    `, [barbero1Id]);

    // 5. Catálogo de Servicios Inicial
    const servicios = [
      {
        nombre: 'Corte Clásico & Fade',
        descripcion_breve: 'Degradado con máquina y tijera, incluye lavado rápido y peinado.',
        precio_cop: 25000,
        duracion_bloques: 1, // 30 min
        visible_publico: true,
        orden_visual: 1
      },
      {
        nombre: 'Barba Spa con Toalla Caliente',
        descripcion_breve: 'Ritual tradicional de afeitado con toalla caliente, aceites y bálsamo.',
        precio_cop: 20000,
        duracion_bloques: 1, // 30 min
        visible_publico: true,
        orden_visual: 2
      },
      {
        nombre: 'Combo VIP: Corte + Barba + Mascarilla',
        descripcion_breve: 'Experiencia completa: corte personalizado, perfilado de barba y mascarilla negra.',
        precio_cop: 45000,
        duracion_bloques: 2, // 60 min
        visible_publico: true,
        orden_visual: 3
      },
      {
        nombre: 'Perfilado de Cejas y Cerquillo',
        descripcion_breve: 'Limpieza con navaja y definición de líneas faciales.',
        precio_cop: 12000,
        duracion_bloques: 1, // 30 min
        visible_publico: true,
        orden_visual: 4
      }
    ];

    for (const serv of servicios) {
      await client.query(`
        INSERT INTO servicios (
          sede_id,
          nombre,
          descripcion_breve,
          precio_cop,
          duracion_bloques,
          visible_publico,
          orden_visual,
          estado
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'activo')
        ON CONFLICT DO NOTHING;
      `, [
        sedeId,
        serv.nombre,
        serv.descripcion_breve,
        serv.precio_cop,
        serv.duracion_bloques,
        serv.visible_publico,
        serv.orden_visual
      ]);
    }
    console.log('✅ Catálogo de 4 servicios iniciales sembrado.');

    // 6. Inventario Inicial de Productos
    const productos = [
      {
        sku: 'POM-MATE-100G',
        nombre: 'Cera Pomada Moldeadora Mate 100g',
        categoria: 'Fijación y Estilo',
        precio_venta_cop: 32000,
        costo_unitario_cop: 18000,
        stock_actual: 25,
        stock_minimo: 5
      },
      {
        sku: 'OIL-BEARD-30ML',
        nombre: 'Óleo para Barba con Eucalipto y Argán 30ml',
        categoria: 'Cuidado Facial y Barba',
        precio_venta_cop: 28000,
        costo_unitario_cop: 14000,
        stock_actual: 12,
        stock_minimo: 4
      },
      {
        sku: 'SHAMPOO-ANTI-250',
        nombre: 'Champú Fortificante Anticaspa 250ml',
        categoria: 'Cuidado Capilar',
        precio_venta_cop: 35000,
        costo_unitario_cop: 20000,
        stock_actual: 3, // Alerta stock bajo (stock <= stock_minimo)
        stock_minimo: 5
      }
    ];

    for (const prod of productos) {
      const prodRes = await client.query(`
        INSERT INTO productos_inventario (
          sede_id,
          sku,
          nombre,
          categoria,
          precio_venta_cop,
          costo_unitario_cop,
          stock_actual,
          stock_minimo,
          estado
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'activo')
        ON CONFLICT DO NOTHING
        RETURNING producto_id;
      `, [
        sedeId,
        prod.sku,
        prod.nombre,
        prod.categoria,
        prod.precio_venta_cop,
        prod.costo_unitario_cop,
        prod.stock_actual,
        prod.stock_minimo
      ]);

      if (prodRes.rows.length > 0) {
        const prodId = prodRes.rows[0].producto_id;
        // Kardex inicial inmutable
        await client.query(`
          INSERT INTO movimientos_inventario (
            sede_id,
            producto_id,
            tipo,
            subtipo,
            cantidad,
            stock_anterior,
            stock_resultante,
            costo_unitario_cop,
            precio_unitario_cop,
            valor_total_cop,
            usuario_id,
            observacion
          ) VALUES (
            $1, $2, 'entrada', 'inventario_inicial', $3, 0, $3, $4, NULL, $5, $6, 'Carga de inventario inicial del sistema'
          );
        `, [
          sedeId,
          prodId,
          prod.stock_actual,
          prod.costo_unitario_cop,
          prod.stock_actual * prod.costo_unitario_cop,
          adminUserId
        ]);
      }
    }
    console.log('✅ Inventario y Kardex iniciales sembrados con éxito.');

    return { sedeId, adminUserId, barbero1Id, barbero2Id };
  });
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  runSeed()
    .then(async (ids) => {
      console.log('🎉 Sembrado completado con éxito:', ids);
      await closeDatabasePool();
      process.exit(0);
    })
    .catch(async (err) => {
      console.error('💥 Error en el sembrado:', err.message);
      await closeDatabasePool();
      process.exit(1);
    });
}
