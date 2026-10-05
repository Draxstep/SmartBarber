import { openSmartBarberDB } from './database';
import type { Cita } from './database';

export class CitasRepository {
  // CREATE
  async create(cita: Cita): Promise<string> {
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
  async getById(id: string): Promise<Cita | undefined> {
    const db = await openSmartBarberDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('citas', 'readonly');
      const store = tx.objectStore('citas');
      const request = store.get(id);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  // UPDATE
  async update(cita: Cita): Promise<void> {
    const db = await openSmartBarberDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('citas', 'readwrite');
      const store = tx.objectStore('citas');
      const request = store.put(cita);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // DELETE
  async delete(id: string): Promise<void> {
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
  async getCitasPorRangoFechaConCursor(
    fechaInicio: string,
    fechaFin: string,
    onRecordFound?: (cita: Cita) => void
  ): Promise<Cita[]> {
    const db = await openSmartBarberDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('citas', 'readonly');
      const store = tx.objectStore('citas');
      const index = store.index('fecha');

      // Clave de rango cerrado [fechaInicio, fechaFin]
      const range = IDBKeyRange.bound(fechaInicio, fechaFin);
      const request = index.openCursor(range);
      const resultados: Cita[] = [];

      request.onsuccess = (event: Event) => {
        const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
        if (cursor) {
          const citaActual = cursor.value as Cita;
          resultados.push(citaActual);

          if (onRecordFound) {
            onRecordFound(citaActual);
          }

          cursor.continue(); // Avanzar al siguiente registro
        } else {
          // Fin de la iteración
          resolve(resultados);
        }
      };

      request.onerror = () => reject(request.error);
    });
  }
}