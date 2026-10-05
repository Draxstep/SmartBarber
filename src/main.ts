// src/main.ts
import './style.css';
import { initRouter } from './router';
import { CitasRepository } from './db/citasRepository';
import { CortesRepository } from './db/cortesRepository';
import { encryptSensitiveField } from './crypto/webCrypto';
import { initPwaUX } from './pwa-ux';

// Función para poblar la DB local si está vacía (Solo para propósitos de prueba)
async function inicializarDatosPrueba() {
  const citasRepo = new CitasRepository();
  const citas = await citasRepo.getCitasPorRangoFechaConCursor('2026-10-05', '2026-10-05');
  
  // Si ya hay citas, no hacemos nada (ya se insertaron antes)
  if (citas.length > 0) {
    document.getElementById('turnos-counter')!.innerText = citas.length.toString();
    return;
  }

  console.log('Sembrando base de datos inicial...');
  
  // 1. Crear Cita
  const cita = {
    id: 'cita-' + Date.now(),
    clienteId: 'cliente-101',
    clienteNombre: 'Carlos Morales',
    barberoId: 'barbero-01',
    fecha: '2026-10-05',
    hora: '10:30',
    servicioId: 'Corte Clásico',
    estado: 'completada' as const
  };
  await citasRepo.create(cita);

  // 2. Crear Corte Cifrado
  const cortesRepo = new CortesRepository();
  const passwordBarbero = 'ClaveMaestraBarberia2026';
  const cifrado = await encryptSensitiveField('Dermatitis leve en nuca; no usar navaja en seco.', passwordBarbero);

  await cortesRepo.create({
    id: 'corte-' + Date.now(),
    citaId: cita.id,
    clienteId: cita.clienteId,
    barberoId: cita.barberoId,
    fecha: cita.fecha,
    precioCobrado: 25000,
    metodoPago: 'efectivo',
    detallesTecnicosCifrados: cifrado.cipherText,
    cryptoIv: cifrado.iv,
    cryptoSalt: cifrado.salt
  });

  document.getElementById('turnos-counter')!.innerText = '1';
  document.getElementById('cortes-counter')!.innerText = '1';
}

// Inicialización
document.addEventListener('DOMContentLoaded', async () => {
  // 1. Inicializar la navegación (SPA)
  initRouter();
  
  // 2. Crear datos de prueba si la DB está vacía
  await inicializarDatosPrueba();
});

document.addEventListener('DOMContentLoaded', async () => {
  initPwaUX(); // Inicia la lógica de la PWA
  initRouter();
  await inicializarDatosPrueba();
});

// Registro del Service Worker
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js');
  });
}