// src/db/serviciosRepository.js
import { openSmartBarberDB } from './database.js';

export class ServiciosRepository {
  // CREATE
  async create(servicio) {
    const db = await openSmartBarberDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('servicios', 'readwrite');
      const store = tx.objectStore('servicios');
      const request = store.add(servicio);

      request.onsuccess = () => resolve(servicio.id);
      request.onerror = () => reject(request.error);
    });
  }

  // READ ALL
  async getAll() {
    const db = await openSmartBarberDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('servicios', 'readonly');
      const store = tx.objectStore('servicios');
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  // READ ONE
  async getById(id) {
    const db = await openSmartBarberDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('servicios', 'readonly');
      const store = tx.objectStore('servicios');
      const request = store.get(id);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  // UPDATE
  async update(servicio) {
    const db = await openSmartBarberDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('servicios', 'readwrite');
      const store = tx.objectStore('servicios');
      const request = store.put(servicio);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // DELETE
  async delete(id) {
    const db = await openSmartBarberDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('servicios', 'readwrite');
      const store = tx.objectStore('servicios');
      const request = store.delete(id);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }
}
