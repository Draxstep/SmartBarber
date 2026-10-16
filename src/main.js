// src/main.js
import './style.css';
import { initRouter } from './router.js';
import { CitasRepository } from './db/citasRepository.js';
import { CortesRepository } from './db/cortesRepository.js';
import { ServiciosRepository } from './db/serviciosRepository.js';
import { InventarioRepository } from './db/inventarioRepository.js';
import { encryptSensitiveField } from './crypto/webCrypto.js';
import { initPwaUX } from './pwa-ux.js';

// Función para poblar la DB local con datos realistas si está vacía
async function inicializarDatosPrueba() {
  const citasRepo = new CitasRepository();
  const serviciosRepo = new ServiciosRepository();
  const invRepo = new InventarioRepository();
  const cortesRepo = new CortesRepository();

  const hoy = new Date().toISOString().split('T')[0];

  // 1. Sembrado de Servicios
  const serviciosExistentes = await serviciosRepo.getAll();
  if (serviciosExistentes.length === 0) {
    console.log('Sembrando catálogo de servicios...');
    await serviciosRepo.create({
      id: 'serv-01',
      nombre: 'Corte Clásico & Fade',
      categoria: 'Corte',
      duracionMinutos: 35,
      precio: 25000,
      insumoId: 'prod-01', // Consume Cuchilla
      cantidadInsumo: 1
    });
    await serviciosRepo.create({
      id: 'serv-02',
      nombre: 'Barba Spa con Toalla Caliente',
      categoria: 'Barba',
      duracionMinutos: 30,
      precio: 20000,
      insumoId: 'prod-02', // Consume Gel de Afeitar
      cantidadInsumo: 1
    });
    await serviciosRepo.create({
      id: 'serv-03',
      nombre: 'Combo VIP: Corte + Barba + Mascarilla',
      categoria: 'Combos',
      duracionMinutos: 60,
      precio: 42000,
      insumoId: 'prod-01',
      cantidadInsumo: 1
    });
    await serviciosRepo.create({
      id: 'serv-04',
      nombre: 'Perfilado de Cejas y Cerquillo',
      categoria: 'Detalle',
      duracionMinutos: 15,
      precio: 12000
    });
  }

  // 2. Sembrado de Productos e Insumos (RF-INV)
  const prodsExistentes = await invRepo.getAllProductos();
  if (prodsExistentes.length === 0) {
    console.log('Sembrando inventario y Kardex inicial...');
    const items = [
      {
        id: 'prod-01',
        nombre: 'Cuchillas Barber Derby Premium (Caja x 100)',
        tipo: 'insumo',
        categoria: 'Navajas y Cuchillas',
        codigoBarras: '770987654321',
        stockActual: 15,
        stockMinimo: 20, // ⚠️ Genera alerta de stock mínimo
        costo: 35000,
        precioVenta: 0
      },
      {
        id: 'prod-02',
        nombre: 'Gel de Afeitar Mentolado 500ml',
        tipo: 'insumo',
        categoria: 'Facial y Afeitado',
        codigoBarras: '770112233445',
        stockActual: 8,
        stockMinimo: 5,
        costo: 18000,
        precioVenta: 0
      },
      {
        id: 'prod-03',
        nombre: 'Loción Aftershave Eucalipto 250ml',
        tipo: 'insumo',
        categoria: 'Facial y Afeitado',
        codigoBarras: '770554433221',
        stockActual: 4,
        stockMinimo: 6, // ⚠️ Genera alerta de stock mínimo
        costo: 14000,
        precioVenta: 0
      },
      {
        id: 'prod-04',
        nombre: 'Cera Moldeadora Pomade Mate 100g',
        tipo: 'venta',
        categoria: 'Cuidado Capilar',
        codigoBarras: '770667788990',
        stockActual: 12,
        stockMinimo: 4,
        costo: 15000,
        precioVenta: 28000
      },
      {
        id: 'prod-05',
        nombre: 'Aceite para Barba Wood & Vanilla 30ml',
        tipo: 'venta',
        categoria: 'Cuidado de Barba',
        codigoBarras: '770998877665',
        stockActual: 3,
        stockMinimo: 5, // ⚠️ Genera alerta de stock mínimo
        costo: 19000,
        precioVenta: 35000
      }
    ];

    for (const item of items) {
      await invRepo.createProducto(item);
      await invRepo.registrarMovimientoKardex({
        productoId: item.id,
        tipo: 'entrada',
        cantidad: item.stockActual,
        motivo: 'Inventario inicial de apertura',
        responsable: 'Administrador'
      });
    }
  }

  // 3. Sembrado de Citas para Hoy (RF-AGE)
  const citasHoy = await citasRepo.getCitasPorRangoFechaConCursor(hoy, hoy);
  if (citasHoy.length === 0) {
    console.log('Sembrando citas para hoy...');
    await citasRepo.create({
      id: 'cita-' + Date.now() + '-1',
      clienteId: 'cliente-101',
      clienteNombre: 'Carlos Morales',
      barberoId: 'barbero-01',
      fecha: hoy,
      hora: '10:00',
      duracionMinutos: 35,
      servicioId: 'Corte Clásico & Fade',
      precioTotal: 25000,
      estado: 'confirmada'
    });

    await citasRepo.create({
      id: 'cita-' + Date.now() + '-2',
      clienteId: 'cliente-102',
      clienteNombre: 'Andrés Gómez',
      barberoId: 'barbero-01',
      fecha: hoy,
      hora: '11:00',
      duracionMinutos: 30,
      servicioId: 'Barba Spa con Toalla Caliente',
      precioTotal: 20000,
      estado: 'pendiente'
    });

    await citasRepo.create({
      id: 'cita-' + Date.now() + '-3',
      clienteId: 'cliente-103',
      clienteNombre: 'Mateo Restrepo',
      barberoId: 'barbero-02',
      fecha: hoy,
      hora: '10:30',
      duracionMinutos: 60,
      servicioId: 'Combo VIP: Corte + Barba + Mascarilla',
      precioTotal: 42000,
      estado: 'en_atencion'
    });
  }

  // 4. Sembrado de Ficha de Corte Cifrada de Ejemplo (RF-COR / WebCrypto)
  const cortePrueba = await cortesRepo.getById('corte-inicial-01');
  if (!cortePrueba) {
    const passwordBarbero = 'ClaveMaestraBarberia2026';
    const cifrado = await encryptSensitiveField(
      'Degradado alto en nuca con cuchilla 1.5; cuero cabelludo sensible, no aplicar alcohol puro.',
      passwordBarbero
    );

    await cortesRepo.create({
      id: 'corte-inicial-01',
      citaId: 'cita-ejemplo-01',
      clienteId: 'cliente-101',
      barberoId: 'barbero-01',
      fecha: hoy,
      precioCobrado: 25000,
      metodoPago: 'efectivo',
      detallesTecnicosCifrados: cifrado.cipherText,
      cryptoIv: cifrado.iv,
      cryptoSalt: cifrado.salt
    });
  }

  // 5. Actualizar Contadores del Dashboard en Tiempo Real
  await actualizarDashboardCounters();
}

export async function actualizarDashboardCounters() {
  const citasRepo = new CitasRepository();
  const invRepo = new InventarioRepository();
  const cortesRepo = new CortesRepository();

  const hoy = new Date().toISOString().split('T')[0];
  const citasDelDia = await citasRepo.getCitasPorRangoFechaConCursor(hoy, hoy);
  const turnosPendientes = citasDelDia.filter(c => c.estado === 'pendiente' || c.estado === 'confirmada');

  const alertasStock = await invRepo.getProductosBajoStock();
  const historialCliente = await cortesRepo.getHistorialClienteConCursor('cliente-101');

  const turnosEl = document.getElementById('turnos-counter');
  const cortesEl = document.getElementById('cortes-counter');
  const stockEl = document.getElementById('stock-counter');

  if (turnosEl) turnosEl.innerText = turnosPendientes.length.toString();
  if (cortesEl) cortesEl.innerText = (historialCliente.length || 1).toString();
  if (stockEl) stockEl.innerText = alertasStock.length.toString();
}

// Inicialización de la aplicación
document.addEventListener('DOMContentLoaded', async () => {
  // 1. Inicia la experiencia y eventos PWA
  initPwaUX();

  // 2. Inicializar la navegación (SPA)
  initRouter();
  
  // 3. Crear datos de prueba si la DB está vacía y actualizar contadores
  await inicializarDatosPrueba();
});
