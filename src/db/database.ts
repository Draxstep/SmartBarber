export const DB_NAME = 'SmartBarberDB';
export const DB_VERSION = 1;

export interface Cita {
  id: string;
  clienteNombre: string;
  barberoId: string;
  fecha: string;        // Formato ISO: YYYY-MM-DD
  hora: string;         // Formato HH:mm
  servicio: string;
  estado: 'pendiente' | 'confirmada' | 'en_atencion' | 'completada' | 'cancelada';
  // Campos sensibles protegidos con AES-GCM (Ley 1581 de 2012 / RF-COR-04)
  observacionesSensibles: string; // Texto cifrado en formato Base64
  cryptoIv: string;               // Vector de Inicialización (Base64)
  cryptoSalt: string;             // Sal criptográfica usada en PBKDF2 (Base64)
}

export function openSmartBarberDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request: IDBOpenDBRequest = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);

    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // 1. Store de Citas
      if (!db.objectStoreNames.contains('citas')) {
        const citasStore = db.createObjectStore('citas', { keyPath: 'id' });
        citasStore.createIndex('barberoId', 'barberoId', { unique: false });
        citasStore.createIndex('fecha', 'fecha', { unique: false });
        citasStore.createIndex('barbero_fecha', ['barberoId', 'fecha'], { unique: false });
        citasStore.createIndex('estado', 'estado', { unique: false });
      }

      // 2. Store de Inventario
      if (!db.objectStoreNames.contains('inventario')) {
        const invStore = db.createObjectStore('inventario', { keyPath: 'id' });
        invStore.createIndex('codigoBarras', 'codigoBarras', { unique: true });
        invStore.createIndex('stock', 'stock', { unique: false });
      }

      // 3. Store de Sincronización Offline
      if (!db.objectStoreNames.contains('sync_queue')) {
        const syncStore = db.createObjectStore('sync_queue', { keyPath: 'id', autoIncrement: true });
        syncStore.createIndex('timestamp', 'timestamp', { unique: false });
      }
    };
  });
}