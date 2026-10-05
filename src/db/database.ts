export const DB_NAME = 'SmartBarberDB';
export const DB_VERSION = 2; // Subimos versión para agregar el nuevo store

// 1. Entidad del Agendamiento (RF-AGE-04 / RF-AGE-08)
export interface Cita {
  id: string;
  clienteId: string;
  clienteNombre: string;
  barberoId: string;
  fecha: string;        // YYYY-MM-DD
  hora: string;         // HH:mm
  servicioId: string;
  estado: 'pendiente' | 'confirmada' | 'en_atencion' | 'completada' | 'cancelada';
}

// 2. Entidad del Registro del Servicio (RF-COR-01 / RF-COR-04)
export interface RegistroCorte {
  id: string;
  citaId?: string;           // Vinculado a la cita (opcional si es cliente sin cita previa RF-COR-03)
  clienteId: string;
  barberoId: string;
  fecha: string;
  precioCobrado: number;
  metodoPago: 'efectivo' | 'transferencia' | 'tarjeta';
  
  // Datos técnicos del barbero cifrados con WebCrypto (Ley 1581 / RF-COR-04)
  detallesTecnicosCifrados: string; // "Cuchilla 1.5, cliente con dermatitis en la nuca..."
  cryptoIv: string;
  cryptoSalt: string;
}

export function openSmartBarberDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // Store de Citas (Agendamiento)
      if (!db.objectStoreNames.contains('citas')) {
        const citasStore = db.createObjectStore('citas', { keyPath: 'id' });
        citasStore.createIndex('fecha', 'fecha', { unique: false });
        citasStore.createIndex('barbero_fecha', ['barberoId', 'fecha'], { unique: false });
        citasStore.createIndex('estado', 'estado', { unique: false });
      }

      // Store de Registro de Cortes (Historial técnico del barbero)
      if (!db.objectStoreNames.contains('cortes_realizados')) {
        const cortesStore = db.createObjectStore('cortes_realizados', { keyPath: 'id' });
        cortesStore.createIndex('clienteId', 'clienteId', { unique: false });
        cortesStore.createIndex('barberoId', 'barberoId', { unique: false });
        cortesStore.createIndex('fecha', 'fecha', { unique: false });
      }

      // Store de Sincronización Offline con PostgreSQL
      if (!db.objectStoreNames.contains('sync_queue')) {
        db.createObjectStore('sync_queue', { keyPath: 'id', autoIncrement: true });
      }
    };
  });
}