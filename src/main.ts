// 1. Importamos los estilos para que Vite los procese
import './style.css';

// --- IMPORTACIONES DE BASE DE DATOS Y CRIPTOGRAFÍA ---
import type { Cita, RegistroCorte } from './db/database';
import { CitasRepository } from './db/citasRepository';
import { CortesRepository } from './db/cortesRepository';
import { encryptSensitiveField, decryptSensitiveField } from './crypto/webCrypto';

// --- FUNCIÓN DEL FLUJO DE NEGOCIO ---
async function ejecutarFlujoSmartBarber() {
  const citasRepo = new CitasRepository();
  const cortesRepo = new CortesRepository();
  const passwordBarbero = 'ClaveMaestraBarberia2026';

  console.log('=== 1. CLIENTE AGENDA CITA (RF-AGE-04) ===');
  const citaCliente: Cita = {
    id: 'cita-' + Date.now(),
    clienteId: 'cliente-101',
    clienteNombre: 'Carlos Morales',
    barberoId: 'barbero-01',
    fecha: '2026-10-05',
    hora: '10:30',
    servicioId: 'serv-corte-clasico',
    estado: 'confirmada'
  };

  await citasRepo.create(citaCliente);
  console.log(`Cita guardada en IndexedDB para ${citaCliente.clienteNombre}. ID: ${citaCliente.id}`);

  console.log('\n=== 2. BARBERO CONSULTA AGENDA DEL DÍA (RF-AGE-09) ===');
  const citasDia = await citasRepo.getCitasPorRangoFechaConCursor(
    '2026-10-05',
    '2026-10-05',
    (cita) => {
      console.log(`[Cursor Agenda]: Cita a las ${cita.hora} - Cliente: ${cita.clienteNombre} (${cita.estado})`);
    }
  );

  console.log('\n=== 3. ATENCIÓN Y CIERRE DE CITA (RF-AGE-11) ===');
  const citaAtendida = citasDia.find((c) => c.id === citaCliente.id);
  if (citaAtendida) {
    citaAtendida.estado = 'completada';
    await citasRepo.update(citaAtendida);
    console.log(`Estado de la cita actualizado a: ${citaAtendida.estado}`);
  }

  console.log('\n=== 4. BARBERO REGISTRA DETALLES TÉCNICOS CIFRADOS (RF-COR-01, RF-COR-04) ===');
  const notasTecnicasSensibles = 'Degradado máquina peines #1.5 a #0.5. Lunar pronunciado y dermatitis leve en nuca; no usar navaja en seco.';
  const cifrado = await encryptSensitiveField(notasTecnicasSensibles, passwordBarbero);

  const nuevoCorte: RegistroCorte = {
    id: 'corte-' + Date.now(),
    citaId: citaCliente.id,
    clienteId: citaCliente.clienteId,
    barberoId: citaCliente.barberoId,
    fecha: citaCliente.fecha,
    precioCobrado: 25000,
    metodoPago: 'efectivo',
    detallesTecnicosCifrados: cifrado.cipherText,
    cryptoIv: cifrado.iv,
    cryptoSalt: cifrado.salt
  };

  await cortesRepo.create(nuevoCorte);
  console.log('Registro de corte guardado en IndexedDB con ficha técnica cifrada.');

  console.log('\n=== 5. BARBERO CONSULTA HISTORIAL TÉCNICO Y DESCIFRA (RF-COR-07) ===');
  const historial = await cortesRepo.getHistorialClienteConCursor(
    'cliente-101',
    (registro) => {
      console.log(`[Cursor Historial]: Corte ID ${registro.id} realizado el ${registro.fecha}`);
    }
  );

  if (historial.length > 0) {
    const ultimoCorte = historial[historial.length - 1];
    const textoPlano = await decryptSensitiveField(
      { cipherText: ultimoCorte.detallesTecnicosCifrados, iv: ultimoCorte.cryptoIv, salt: ultimoCorte.cryptoSalt },
      passwordBarbero
    );
    console.log('Detalles técnicos descifrados exitosamente:');
    console.log(`"${textoPlano}"`);
  }
}

// 2. Aquí va la lógica visual de tu aplicación de barbería
document.addEventListener('DOMContentLoaded', () => {
  const navBtns = document.querySelectorAll('.nav-btn');
  
  navBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      navBtns.forEach(b => b.classList.remove('active'));
      const target = e.target as HTMLButtonElement;
      target.classList.add('active');
      console.log(`Navegando a la sección: ${target.id}`);
    });
  });
});

// 3. Ejecutar la lógica de datos directamente (sin esperar al DOMContentLoaded que puede haber pasado)
console.log('✅ main.ts cargado correctamente');
ejecutarFlujoSmartBarber().catch(error => {
  console.error('❌ Error en el flujo de SmartBarber:', error);
});

// 4. Registro del Service Worker (Protegido en entorno de desarrollo para evitar fallos de Vite HMR)
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .then(reg => console.log('SW registrado con éxito. Scope:', reg.scope))
      .catch(err => console.error('Error al registrar SW:', err));
  });
}