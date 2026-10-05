// src/views/agenda.ts
import { CitasRepository } from '../db/citasRepository';

export async function renderizarAgenda() {
  const container = document.getElementById('agenda-container');
  if (!container) return;

  container.innerHTML = '<p>Cargando agenda...</p>';
  
  const repo = new CitasRepository();
  const fechaHoy = '2026-10-05'; // Hardcodeado por el ejemplo, usarías: new Date().toISOString().split('T')[0]
  
  // Usamos el cursor del repositorio
  const citasDia = await repo.getCitasPorRangoFechaConCursor(fechaHoy, fechaHoy);

  if (citasDia.length === 0) {
    container.innerHTML = '<p>No hay citas agendadas para hoy.</p>';
    return;
  }

  container.innerHTML = '';
  citasDia.forEach(cita => {
    const card = document.createElement('div');
    card.className = 'cita-card';
    card.style.cssText = 'border: 1px solid #ccc; padding: 15px; margin-bottom: 10px; border-radius: 8px;';
    
    card.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center;">
        <div>
          <h4 style="margin: 0;">${cita.hora} - ${cita.clienteNombre}</h4>
          <p style="margin: 5px 0 0 0; color: #666;">Servicio: ${cita.servicioId}</p>
        </div>
        <span style="padding: 5px 10px; border-radius: 15px; background: #eee; font-size: 0.85em;">
          ${cita.estado.toUpperCase()}
        </span>
      </div>
    `;
    container.appendChild(card);
  });
}