// src/db/citasRepository.js
import { openSmartBarberDB } from './database.js';

export class CitasRepository {
  // CREATE
  async create(cita) {
    const db = await openSmartBarberDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('citas', 'readwrite');
      const store = tx.objectStore('citas');
      const request = store.add(cita);

      request.onsuccess = () => resolve(cita.id);
      request.onerror = () => reject(request.error);
    });
  }

  // READ (por Clave Primaria)
  async getById(id) {
    const db = await openSmartBarberDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('citas', 'readonly');
      const store = tx.objectStore('citas');
      const request = store.get(id);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  // READ ALL
  async getAll() {
    const db = await openSmartBarberDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('citas', 'readonly');
      const store = tx.objectStore('citas');
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  // UPDATE
  async update(cita) {
    const db = await openSmartBarberDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('citas', 'readwrite');
      const store = tx.objectStore('citas');
      const request = store.put(cita);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // CAMBIAR ESTADO DE CITA (RF-AGE-06)
  async cambiarEstado(id, nuevoEstado) {
    const cita = await this.getById(id);
    if (!cita) throw new Error(`Cita no encontrada con ID ${id}`);
    cita.estado = nuevoEstado;
    await this.update(cita);
    return cita;
  }

  // DELETE
  async delete(id) {
    const db = await openSmartBarberDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('citas', 'readwrite');
      const store = tx.objectStore('citas');
      const request = store.delete(id);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * CURSOR: Itera sobre el índice 'fecha' en un rango específico.
   * Procesa registros uno por uno para optimizar memoria en listas extensas.
   */
  async getCitasPorRangoFechaConCursor(fechaInicio, fechaFin, onRecordFound) {
    const db = await openSmartBarberDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('citas', 'readonly');
      const store = tx.objectStore('citas');
      const index = store.index('fecha');

      const range = IDBKeyRange.bound(fechaInicio, fechaFin);
      const request = index.openCursor(range);
      const resultados = [];

      request.onsuccess = (event) => {
        const cursor = event.target.result;
        if (cursor) {
          const citaActual = cursor.value;
          resultados.push(citaActual);

          if (onRecordFound) {
            onRecordFound(citaActual);
          }

          cursor.continue();
        } else {
          resolve(resultados);
        }
      };

      request.onerror = () => reject(request.error);
    });
  }

  /**
   * OBTENER CITAS DE UN BARBERO EN UNA FECHA DADA
   * Utiliza el índice compuesto 'barbero_fecha'
   */
  async getCitasPorBarberoYFecha(barberoId, fecha) {
    const db = await openSmartBarberDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('citas', 'readonly');
      const store = tx.objectStore('citas');
      const index = store.index('barbero_fecha');

      const range = IDBKeyRange.only([barberoId, fecha]);
      const request = index.getAll(range);

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * VALIDACIÓN ANTI-SOLAPAMIENTO (RF-AGE-04)
   * Verifica si existe otra cita en el mismo rango de tiempo para el mismo barbero.
   * @param {string} barberoId
   * @param {string} fecha YYYY-MM-DD
   * @param {string} horaInicio HH:mm
   * @param {number} duracionMinutos
   * @param {string|null} excluirCitaId Si se está editando una cita existente
   * @returns {Promise<{solapada: boolean, conflictoCon?: any}>}
   */
  async validarSolapamiento(barberoId, fecha, horaInicio, duracionMinutos = 30, excluirCitaId = null) {
    const citasDelDia = await this.getCitasPorBarberoYFecha(barberoId, fecha);

    // Convertir HH:mm a minutos desde las 00:00
    const parseMinutos = (horaStr) => {
      const [h, m] = (horaStr || '00:00').split(':').map(Number);
      return h * 60 + m;
    };

    const inicioNuevo = parseMinutos(horaInicio);
    const finNuevo = inicioNuevo + Number(duracionMinutos);

    for (const cita of citasDelDia) {
      if (excluirCitaId && cita.id === excluirCitaId) continue;
      // Las citas canceladas no bloquean el horario
      if (cita.estado === 'cancelada') continue;

      const duracionExistente = Number(cita.duracionMinutos) || 30;
      const inicioExistente = parseMinutos(cita.hora);
      const finExistente = inicioExistente + duracionExistente;

      // Condición de solapamiento: inicioNuevo < finExistente && inicioExistente < finNuevo
      if (inicioNuevo < finExistente && inicioExistente < finNuevo) {
        return {
          solapada: true,
          conflictoCon: cita
        };
      }
    }

    return { solapada: false };
  }
}
