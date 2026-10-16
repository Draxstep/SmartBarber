// src/db/database.js

export const DB_NAME = 'SmartBarberDB';
export const DB_VERSION = 3; // Versión 3: Soporte completo para Inventario, Kardex y Catálogo de Servicios

/**
 * Abre la conexión a la base de datos local IndexedDB
 * @returns {Promise<IDBDatabase>}
 */
export function openSmartBarberDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;

      // 1. Store de Citas (Agendamiento - RF-AGE-04 / RF-AGE-08)
      if (!db.objectStoreNames.contains('citas')) {
        const citasStore = db.createObjectStore('citas', { keyPath: 'id' });
        citasStore.createIndex('fecha', 'fecha', { unique: false });
        citasStore.createIndex('barberoId', 'barberoId', { unique: false });
        citasStore.createIndex('barbero_fecha', ['barberoId', 'fecha'], { unique: false });
        citasStore.createIndex('estado', 'estado', { unique: false });
      }

      // 2. Store de Registro de Cortes (Ficha Técnica y Cifrado - RF-COR-01 / RF-COR-04)
      if (!db.objectStoreNames.contains('cortes_realizados')) {
        const cortesStore = db.createObjectStore('cortes_realizados', { keyPath: 'id' });
        cortesStore.createIndex('clienteId', 'clienteId', { unique: false });
        cortesStore.createIndex('barberoId', 'barberoId', { unique: false });
        cortesStore.createIndex('fecha', 'fecha', { unique: false });
      }

      // 3. Store de Catálogo de Servicios (RF-AGE-01)
      if (!db.objectStoreNames.contains('servicios')) {
        const serviciosStore = db.createObjectStore('servicios', { keyPath: 'id' });
        serviciosStore.createIndex('nombre', 'nombre', { unique: false });
        serviciosStore.createIndex('categoria', 'categoria', { unique: false });
      }

      // 4. Store de Inventario de Productos e Insumos (RF-INV-01)
      if (!db.objectStoreNames.contains('productos')) {
        const prodStore = db.createObjectStore('productos', { keyPath: 'id' });
        prodStore.createIndex('tipo', 'tipo', { unique: false }); // 'insumo' | 'venta'
        prodStore.createIndex('codigoBarras', 'codigoBarras', { unique: false });
        prodStore.createIndex('nombre', 'nombre', { unique: false });
        prodStore.createIndex('categoria', 'categoria', { unique: false });
        prodStore.createIndex('stockActual', 'stockActual', { unique: false });
      }

      // 5. Store de Historial de Movimientos Kardex (RF-INV-04)
      if (!db.objectStoreNames.contains('kardex')) {
        const kardexStore = db.createObjectStore('kardex', { keyPath: 'id' });
        kardexStore.createIndex('productoId', 'productoId', { unique: false });
        kardexStore.createIndex('fecha', 'fecha', { unique: false });
        kardexStore.createIndex('tipo', 'tipo', { unique: false }); // 'entrada' | 'salida_venta' | 'salida_consumo' | 'salida_merma' | 'ajuste'
      }

      // 6. Store de Sincronización Offline (Outbox Pattern - RF-PWA-04 / RF-PWA-05)
      if (!db.objectStoreNames.contains('sync_queue')) {
        const syncStore = db.createObjectStore('sync_queue', { keyPath: 'id', autoIncrement: true });
        syncStore.createIndex('timestamp', 'timestamp', { unique: false });
        syncStore.createIndex('status', 'status', { unique: false });
      }
    };
  });
}
