// src/views/agenda.js
import { CitasRepository } from '../db/citasRepository.js';
import { ServiciosRepository } from '../db/serviciosRepository.js';
import { InventarioRepository } from '../db/inventarioRepository.js';
import { 
  pedirPermisoSensores, 
  hayLecturasReales, 
  escucharOrientacion, 
  detectarSacudida 
} from '../device/sensores.js';

const citasRepo = new CitasRepository();
const serviciosRepo = new ServiciosRepository();
const invRepo = new InventarioRepository();

let fechaSeleccionada = new Date().toISOString().split('T')[0];
let barberoFiltro = 'todos';

// Estado de Sensores y "Agitar para Deshacer" (Guía Sesión 11 - 25)
let ultimaCitaEliminada = null;
let sensoresActivos = false;
let canceladorSacudida = null;
let canceladorOrientacion = null;

export async function renderizarAgenda() {
  const container = document.getElementById('view-agenda');
  if (!container) return;

  container.innerHTML = `
    <div class="agenda-header">
      <div>
        <h2>📅 Agenda de Turnos y Citas</h2>
        <p>Gestión de disponibilidad, citas programadas y clientes de paso (Walk-ins).</p>
      </div>
      <div class="agenda-actions">
        <button id="btn-toggle-sensores" class="btn-secondary" title="Activa acelerómetro para agitar y deshacer">
          📳 ${sensoresActivos ? 'Sensores: ACTIVOS' : 'Activar Agitar para Deshacer'}
        </button>
        <button id="btn-nueva-cita" class="btn-primary">➕ Agendar Cita</button>
        <button id="btn-walkin" class="btn-secondary">🚶 Cliente de Paso (Walk-in)</button>
      </div>
    </div>

    <!-- Barra de Notificación / Deshacer (Mejora Progresiva con Botón de Respaldo) -->
    <div id="undo-notification-bar" style="display: none; background: #1f2937; color: white; padding: 12px 18px; border-radius: 8px; margin-bottom: 16px; box-shadow: var(--shadow);">
      <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px;">
        <span id="undo-msg">🗑️ Cita eliminada.</span>
        <div style="display: flex; gap: 8px; align-items: center;">
          <small id="undo-sensor-hint" style="color: #9ca3af;"></small>
          <button id="btn-deshacer-accion" class="btn-primary" style="background: #f59e0b; padding: 6px 12px; font-size: 0.85em;">
            ↩ Deshacer eliminación
          </button>
        </div>
      </div>
    </div>

    <!-- Indicador de Inclinación en Vivo (Guía Sesión 11) -->
    <div id="sensor-orientation-box" style="display: none; background: var(--card-bg); border: 1px solid var(--border); padding: 8px 14px; border-radius: 6px; margin-bottom: 14px; font-size: 0.85em; color: var(--text);">
      <span>🧭 Sensores de movimiento: </span>
      <span id="sensor-angles" class="font-mono" style="font-weight: bold; color: var(--accent);">inclinación β 0° · γ 0°</span>
    </div>

    <!-- Barra de Filtros de Agenda -->
    <div class="agenda-toolbar">
      <div class="form-group" style="margin: 0; min-width: 180px;">
        <label style="font-size: 0.85em; font-weight: bold;">Fecha:</label>
        <input type="date" id="agenda-date-picker" value="${fechaSeleccionada}">
      </div>
      <div class="form-group" style="margin: 0; min-width: 180px;">
        <label style="font-size: 0.85em; font-weight: bold;">Barbero:</label>
        <select id="agenda-barber-filter">
          <option value="todos" ${barberoFiltro === 'todos' ? 'selected' : ''}>Todos los Barberos</option>
          <option value="barbero-01" ${barberoFiltro === 'barbero-01' ? 'selected' : ''}>Barbero 1 (Carlos M.)</option>
          <option value="barbero-02" ${barberoFiltro === 'barbero-02' ? 'selected' : ''}>Barbero 2 (Andrés R.)</option>
        </select>
      </div>
      <div style="margin-left: auto; align-self: flex-end;">
        <button id="btn-hoy" class="btn-secondary" style="padding: 6px 12px; font-size: 0.85em;">📅 Ir a Hoy</button>
      </div>
    </div>

    <!-- Contenedor de la Lista de Citas del Día -->
    <div id="agenda-list" class="agenda-list-container" style="margin-top: 20px;">
      <p>Cargando citas...</p>
    </div>

    <!-- Contenedor para Modales Dinámicos -->
    <div id="agenda-modal-container"></div>
  `;

  setupAgendaEvents();
  setupSensoresHandlers();
  await cargarCitasDelDia();
}

async function cargarCitasDelDia() {
  const listContainer = document.getElementById('agenda-list');
  if (!listContainer) return;

  let citas = await citasRepo.getCitasPorRangoFechaConCursor(fechaSeleccionada, fechaSeleccionada);

  if (barberoFiltro !== 'todos') {
    citas = citas.filter(c => c.barberoId === barberoFiltro);
  }

  // Ordenar cronológicamente
  citas.sort((a, b) => (a.hora || '').localeCompare(b.hora || ''));

  // Actualizar contador del dashboard
  const dashTurnos = document.getElementById('turnos-counter');
  if (dashTurnos && fechaSeleccionada === new Date().toISOString().split('T')[0]) {
    const pendientes = citas.filter(c => c.estado === 'pendiente' || c.estado === 'confirmada');
    dashTurnos.innerText = pendientes.length.toString();
  }

  if (citas.length === 0) {
    listContainer.innerHTML = `
      <div class="empty-state">
        <p>No hay citas programadas para el <b>${fechaSeleccionada}</b> con los filtros seleccionados.</p>
        <button id="btn-agendar-vacio" class="btn-primary" style="margin-top: 10px;">➕ Agendar primer turno</button>
      </div>
    `;
    document.getElementById('btn-agendar-vacio')?.addEventListener('click', () => abrirModalAgendamiento());
    return;
  }

  listContainer.innerHTML = citas.map(cita => {
    let badgeClass = 'badge-normal';
    let estadoTexto = cita.estado || 'pendiente';
    if (cita.estado === 'confirmada') badgeClass = 'badge-info';
    else if (cita.estado === 'en_atencion') badgeClass = 'badge-warning';
    else if (cita.estado === 'completada') badgeClass = 'badge-success';
    else if (cita.estado === 'cancelada') badgeClass = 'badge-danger';

    return `
      <div class="cita-card-full ${cita.estado === 'cancelada' ? 'cita-cancelada' : ''}">
        <div class="cita-time-col">
          <span class="cita-hora">${cita.hora}</span>
          <span class="cita-duracion">${cita.duracionMinutos || 30} min</span>
        </div>
        <div class="cita-info-col">
          <div style="display: flex; align-items: center; gap: 8px;">
            <h4 style="margin: 0; font-size: 1.1em;">${cita.clienteNombre}</h4>
            ${cita.esWalkIn ? '<span class="badge badge-warning" style="font-size: 0.7em;">🚶 Walk-in</span>' : ''}
          </div>
          <p class="cita-servicio-desc">
            ✂️ <b>${cita.servicioId}</b> | Barbero: <i>${cita.barberoId === 'barbero-01' ? 'Carlos M.' : 'Andrés R.'}</i>
            ${cita.precioTotal ? `<span class="text-success" style="margin-left: 8px; font-weight: bold;">$${Number(cita.precioTotal).toLocaleString()}</span>` : ''}
          </p>
        </div>
        <div class="cita-status-col">
          <span class="badge ${badgeClass}">${estadoTexto.toUpperCase()}</span>
          <div class="cita-btn-group" style="margin-top: 8px;">
            ${cita.estado === 'pendiente' ? `<button class="btn-mini btn-action-state" data-id="${cita.id}" data-estado="confirmada">Confirmar</button>` : ''}
            ${cita.estado === 'confirmada' ? `<button class="btn-mini btn-action-state" data-id="${cita.id}" data-estado="en_atencion">Atender</button>` : ''}
            ${cita.estado === 'en_atencion' ? `<button class="btn-mini btn-success btn-action-state" data-id="${cita.id}" data-estado="completada">Completar</button>` : ''}
            ${cita.estado !== 'cancelada' ? `<button class="btn-mini btn-danger btn-eliminar-cita" data-id="${cita.id}">Eliminar</button>` : ''}
          </div>
        </div>
      </div>
    `;
  }).join('');

  // Eventos de cambio de estado
  listContainer.querySelectorAll('.btn-action-state').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = btn.dataset.id;
      const nuevoEstado = btn.dataset.estado;
      await citasRepo.cambiarEstado(id, nuevoEstado);

      // Si se completa, descontar insumo asociado automáticamente si aplica
      if (nuevoEstado === 'completada') {
        const cita = await citasRepo.getById(id);
        if (cita && cita.servicioId) {
          const servicios = await serviciosRepo.getAll();
          const serv = servicios.find(s => s.nombre === cita.servicioId);
          if (serv && serv.insumoId) {
            await invRepo.registrarMovimientoKardex({
              productoId: serv.insumoId,
              tipo: 'salida_consumo',
              cantidad: serv.cantidadInsumo || 1,
              motivo: `Consumo automático por servicio completado: ${serv.nombre} (Cita ${cita.id})`,
              responsable: cita.barberoId
            });
            console.log(`✂️ Insumo descontado automáticamente para el servicio ${serv.nombre}`);
          }
        }
      }

      await cargarCitasDelDia();
    });
  });

  // Evento Eliminar Cita con soporte para "Deshacer" (Shake to Undo)
  listContainer.querySelectorAll('.btn-eliminar-cita').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = btn.dataset.id;
      const cita = await citasRepo.getById(id);
      if (!cita) return;

      // 1. Guardar copia en memoria para poder deshacer (Guía Sesión 11)
      ultimaCitaEliminada = { ...cita };

      // 2. Eliminar de IndexedDB
      await citasRepo.delete(id);

      // 3. Mostrar barra de Deshacer
      mostrarBarraDeshacer(`Se eliminó la cita de «${cita.clienteNombre}»`);
      await cargarCitasDelDia();
    });
  });
}

function mostrarBarraDeshacer(mensaje) {
  const bar = document.getElementById('undo-notification-bar');
  const msgEl = document.getElementById('undo-msg');
  const hintEl = document.getElementById('undo-sensor-hint');

  if (bar && msgEl) {
    msgEl.innerText = `🗑️ ${mensaje}`;
    if (hintEl) {
      hintEl.innerText = sensoresActivos 
        ? '(📳 ¡Agita el teléfono o haz clic para deshacer!)' 
        : '(Haz clic en el botón para restaurar)';
    }
    bar.style.display = 'block';
  }
}

async function deshacerEliminacion() {
  if (!ultimaCitaEliminada) return;

  const citaRestaurada = { ...ultimaCitaEliminada };
  // Asignamos nuevo ID si se requiere o conservamos para restaurar idéntica
  await citasRepo.create(citaRestaurada);
  const nombre = citaRestaurada.clienteNombre;
  ultimaCitaEliminada = null;

  const bar = document.getElementById('undo-notification-bar');
  if (bar) bar.style.display = 'none';

  alert(`✅ ¡Restauración exitosa! Se recuperó la cita de «${nombre}».`);
  await cargarCitasDelDia();
}

function setupSensoresHandlers() {
  const btnToggle = document.getElementById('btn-toggle-sensores');
  const btnDeshacer = document.getElementById('btn-deshacer-accion');
  const boxInclinacion = document.getElementById('sensor-orientation-box');
  const textAngles = document.getElementById('sensor-angles');

  btnDeshacer?.addEventListener('click', async () => {
    await deshacerEliminacion();
  });

  btnToggle?.addEventListener('click', async () => {
    if (sensoresActivos) {
      // Apagar sensores (ahorro de batería)
      if (canceladorSacudida) canceladorSacudida();
      if (canceladorOrientacion) canceladorOrientacion();
      canceladorSacudida = null;
      canceladorOrientacion = null;
      sensoresActivos = false;
      btnToggle.innerHTML = '📳 Activar Agitar para Deshacer';
      if (boxInclinacion) boxInclinacion.style.display = 'none';
      return;
    }

    // 1. Pedir permiso (dentro del clic, imprescindible en iOS - Guía Sesión 11)
    const permiso = await pedirPermisoSensores();
    if (permiso === 'denied') {
      alert('Bloqueaste el permiso de sensores de movimiento. Puedes usar el botón «Deshacer» en pantalla.');
      return;
    }

    // 2. Verificar si el dispositivo tiene sensores reales (no un PC)
    const haySensores = await hayLecturasReales(1000);
    if (!haySensores) {
      alert('Este dispositivo no tiene sensores de movimiento (o estás en un PC). El botón de respaldo «Deshacer» seguirá disponible.');
    }

    // 3. Activar detección de sacudida (Shake to Undo) con umbral de 12 m/s² y enfriamiento de 1s
    canceladorSacudida = detectarSacudida((desviacion) => {
      console.log(`📳 ¡Sacudida detectada! Desviación: ${desviacion} m/s²`);
      if (ultimaCitaEliminada) {
        deshacerEliminacion();
      }
    }, { umbral: 12, enfriamientoMs: 1000 });

    // 4. Activar lectura de orientación (limitada a 100ms)
    canceladorOrientacion = escucharOrientacion(({ beta, gamma }) => {
      if (textAngles) {
        textAngles.innerText = `inclinación β ${Math.round(beta)}° · γ ${Math.round(gamma)}°`;
      }
    }, 100);

    sensoresActivos = true;
    btnToggle.innerHTML = '📳 Sensores: ACTIVOS (Toca para apagar)';
    if (boxInclinacion) boxInclinacion.style.display = 'block';
  });
}

function setupAgendaEvents() {
  const datePicker = document.getElementById('agenda-date-picker');
  datePicker?.addEventListener('change', (e) => {
    fechaSeleccionada = e.target.value;
    cargarCitasDelDia();
  });

  const barberSelect = document.getElementById('agenda-barber-filter');
  barberSelect?.addEventListener('change', (e) => {
    barberoFiltro = e.target.value;
    cargarCitasDelDia();
  });

  document.getElementById('btn-hoy')?.addEventListener('click', () => {
    fechaSeleccionada = new Date().toISOString().split('T')[0];
    if (datePicker) datePicker.value = fechaSeleccionada;
    cargarCitasDelDia();
  });

  document.getElementById('btn-nueva-cita')?.addEventListener('click', () => abrirModalAgendamiento(false));
  document.getElementById('btn-walkin')?.addEventListener('click', () => abrirModalAgendamiento(true));
}

// MODAL DE AGENDAMIENTO CON VALIDACIÓN ANTI-SOLAPAMIENTO EN TIEMPO REAL
async function abrirModalAgendamiento(esWalkIn = false) {
  const modalContainer = document.getElementById('agenda-modal-container');
  if (!modalContainer) return;

  const servicios = await serviciosRepo.getAll();

  modalContainer.innerHTML = `
    <div class="modal-overlay" id="modal-agendar">
      <div class="modal-content">
        <div class="modal-header">
          <h3>${esWalkIn ? '🚶 Agendar Cliente de Paso (Walk-in)' : '➕ Agendar Nueva Cita'}</h3>
          <button class="modal-close" id="close-agendar-modal">&times;</button>
        </div>
        <form id="form-agendar" class="modal-form">
          <div class="form-group">
            <label>Nombre del Cliente *</label>
            <input type="text" id="cita-cliente" required placeholder="Ej: Santiago Pérez">
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>Barbero *</label>
              <select id="cita-barbero" required>
                <option value="barbero-01">Barbero 1 (Carlos M.)</option>
                <option value="barbero-02">Barbero 2 (Andrés R.)</option>
              </select>
            </div>
            <div class="form-group">
              <label>Servicio Principal *</label>
              <select id="cita-servicio" required>
                ${servicios.map(s => `
                  <option value="${s.nombre}" data-duracion="${s.duracionMinutos}" data-precio="${s.precio}">
                    ${s.nombre} (${s.duracionMinutos} min - $${Number(s.precio).toLocaleString()})
                  </option>
                `).join('')}
              </select>
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>Fecha *</label>
              <input type="date" id="cita-fecha" value="${fechaSeleccionada}" required>
            </div>
            <div class="form-group">
              <label>Hora de Inicio (HH:mm) *</label>
              <input type="time" id="cita-hora" value="11:00" required>
            </div>
            <div class="form-group">
              <label>Duración Estimada (min)</label>
              <input type="number" id="cita-duracion" value="30" readonly style="background: #f3f4f6;">
            </div>
          </div>

          <!-- Alerta Visual Anti-Solapamiento en Tiempo Real (RF-AGE-04) -->
          <div id="solapamiento-alert" style="margin: 10px 0; padding: 10px; border-radius: 6px; display: none;"></div>

          <div class="modal-footer">
            <button type="button" class="btn-secondary" id="cancel-agendar-modal">Cancelar</button>
            <button type="submit" class="btn-primary" id="btn-submit-cita">Agendar Cita</button>
          </div>
        </form>
      </div>
    </div>
  `;

  const servicioSelect = document.getElementById('cita-servicio');
  const duracionInput = document.getElementById('cita-duracion');
  const barberoSelect = document.getElementById('cita-barbero');
  const fechaInput = document.getElementById('cita-fecha');
  const horaInput = document.getElementById('cita-hora');
  const solapamientoAlert = document.getElementById('solapamiento-alert');
  const submitBtn = document.getElementById('btn-submit-cita');

  const actualizarDuracion = () => {
    const selectedOption = servicioSelect?.options[servicioSelect.selectedIndex];
    if (selectedOption) {
      duracionInput.value = selectedOption.dataset.duracion || '30';
    }
  };
  servicioSelect?.addEventListener('change', () => {
    actualizarDuracion();
    verificarSolapamiento();
  });
  actualizarDuracion();

  const verificarSolapamiento = async () => {
    const barberoId = barberoSelect.value;
    const fecha = fechaInput.value;
    const hora = horaInput.value;
    const duracion = Number(duracionInput.value) || 30;

    if (!barberoId || !fecha || !hora) return;

    const res = await citasRepo.validarSolapamiento(barberoId, fecha, hora, duracion);
    if (res.solapada) {
      solapamientoAlert.style.display = 'block';
      solapamientoAlert.style.background = '#fef2f2';
      solapamientoAlert.style.color = '#991b1b';
      solapamientoAlert.style.border = '1px solid #f87171';
      solapamientoAlert.innerHTML = `
        🚫 <b>Conflicto de Horario (Anti-Solapamiento):</b> El barbero ya tiene una cita ocupada a las <b>${res.conflictoCon.hora}</b> con <i>${res.conflictoCon.clienteNombre}</i>. Por favor elige otro horario o barbero.
      `;
      submitBtn.disabled = true;
      submitBtn.style.opacity = '0.5';
      submitBtn.style.cursor = 'not-allowed';
    } else {
      solapamientoAlert.style.display = 'block';
      solapamientoAlert.style.background = '#f0fdf4';
      solapamientoAlert.style.color = '#166534';
      solapamientoAlert.style.border = '1px solid #86efac';
      solapamientoAlert.innerHTML = `✅ <b>Horario Disponible:</b> No hay cruces de agenda para este barbero.`;
      submitBtn.disabled = false;
      submitBtn.style.opacity = '1';
      submitBtn.style.cursor = 'pointer';
    }
  };

  barberoSelect?.addEventListener('change', verificarSolapamiento);
  fechaInput?.addEventListener('change', verificarSolapamiento);
  horaInput?.addEventListener('change', verificarSolapamiento);
  verificarSolapamiento();

  const close = () => { modalContainer.innerHTML = ''; };
  document.getElementById('close-agendar-modal')?.addEventListener('click', close);
  document.getElementById('cancel-agendar-modal')?.addEventListener('click', close);

  document.getElementById('form-agendar')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const selectedOption = servicioSelect?.options[servicioSelect.selectedIndex];
    const precio = Number(selectedOption?.dataset.precio) || 20000;

    const nuevaCita = {
      id: 'cita-' + Date.now(),
      clienteId: 'cliente-' + Math.floor(Math.random() * 900 + 100),
      clienteNombre: document.getElementById('cita-cliente').value.trim(),
      barberoId: barberoSelect.value,
      servicioId: servicioSelect.value,
      fecha: fechaInput.value,
      hora: horaInput.value,
      duracionMinutos: Number(duracionInput.value) || 30,
      precioTotal: precio,
      estado: esWalkIn ? 'en_atencion' : 'pendiente',
      esWalkIn
    };

    await citasRepo.create(nuevaCita);
    close();
    fechaSeleccionada = nuevaCita.fecha;
    const dp = document.getElementById('agenda-date-picker');
    if (dp) dp.value = fechaSeleccionada;
    await cargarCitasDelDia();
  });
}
