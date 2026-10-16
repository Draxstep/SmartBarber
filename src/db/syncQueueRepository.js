// src/db/syncQueueRepository.js
import { openSmartBarberDB } from './database.js';

export class SyncQueueRepository {
  // Encolar una mutación realizada offline (RF-PWA-04)
  async enqueue(tipoOperacion, entidad, payload) {
    const db = await openSmartBarberDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('sync_queue', 'readwrite');
      const store = tx.objectStore('sync_queue');
      const item = {
        tipoOperacion, // 'CREATE' | 'UPDATE' | 'DELETE'
        entidad,       // 'citas' | 'cortes' | 'kardex' | 'productos'
        payload,
        status: 'pending',
        timestamp: Date.now(),
        fechaISO: new Date().toISOString()
      };
      const request = store.add(item);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  // Obtener todas las operaciones pendientes de sincronización
  async getPending() {
    const db = await openSmartBarberDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('sync_queue', 'readonly');
      const store = tx.objectStore('sync_queue');
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  // Eliminar un elemento ya sincronizado
  async remove(id) {
    const db = await openSmartBarberDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('sync_queue', 'readwrite');
      const store = tx.objectStore('sync_queue');
      const request = store.delete(id);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // Sincronizar cola al recuperar conexión (RF-PWA-05)
  async sincronizarColaConServidor() {
    if (!navigator.onLine) return { sincronizados: 0, pendientes: 0 };

    const pendientes = await this.getPending();
    if (pendientes.length === 0) return { sincronizados: 0, pendientes: 0 };

    console.log(`📡 Sincronizando ${pendientes.length} operaciones offline con el servidor...`);
    let procesados = 0;

    for (const item of pendientes) {
      try {
        // En una app conectada a API real, aquí se llamaría a fetch('/api/sync', ...)
        // Simulamos resolución exitosa:
        await new Promise(r => setTimeout(r, 100));
        await this.remove(item.id);
        procesados++;
      } catch (err) {
        console.error(`Error sincronizando item ${item.id}:`, err);
        break;
      }
    }

    console.log(`✅ Sincronización completada: ${procesados} registros actualizados.`);
    return { sincronizados: procesados, pendientes: pendientes.length - procesados };
  }
}
