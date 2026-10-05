import { openSmartBarberDB } from './database';
import type { RegistroCorte } from './database';

export class CortesRepository {
  // CREATE: Guardar ficha técnica de servicio realizado
  async create(registro: RegistroCorte): Promise<string> {
    const db = await openSmartBarberDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('cortes_realizados', 'readwrite');
      const store = tx.objectStore('cortes_realizados');
      const request = store.add(registro);

      request.onsuccess = () => resolve(registro.id);
      request.onerror = () => reject(request.error);
    });
  }

  // READ: Obtener registro por ID
  async getById(id: string): Promise<RegistroCorte | undefined> {
    const db = await openSmartBarberDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('cortes_realizados', 'readonly');
      const store = tx.objectStore('cortes_realizados');
      const request = store.get(id);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  // CURSOR: Recorrer el historial de cortes de un cliente específico (RF-COR-07)
  async getHistorialClienteConCursor(
    clienteId: string,
    onRecordFound?: (registro: RegistroCorte) => void
  ): Promise<RegistroCorte[]> {
    const db = await openSmartBarberDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('cortes_realizados', 'readonly');
      const store = tx.objectStore('cortes_realizados');
      const index = store.index('clienteId');

      const range = IDBKeyRange.only(clienteId);
      const request = index.openCursor(range);
      const resultados: RegistroCorte[] = [];

      request.onsuccess = (event: Event) => {
        const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
        if (cursor) {
          const registro = cursor.value as RegistroCorte;
          resultados.push(registro);

          if (onRecordFound) {
            onRecordFound(registro);
          }

          cursor.continue();
        } else {
          resolve(resultados);
        }
      };

      request.onerror = () => reject(request.error);
    });
  }
}