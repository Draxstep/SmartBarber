// public/js/pwa/db.js
// Almacenamiento local IndexedDB nativo según SMARTBARBER_TECH_SPEC.md (Sección 4)

const NOMBRE_DB = "smartbarber-db";
export const VERSION_DB = 2;

export function abrirBaseDeDatos() {
  if (!("indexedDB" in window)) {
    return Promise.reject(new Error("IndexedDB no está soportado en este entorno."));
  }

  return new Promise((resolve, reject) => {
    const peticion = indexedDB.open(NOMBRE_DB, VERSION_DB);

    peticion.onupgradeneeded = (event) => {
      const db = event.target.result;
      const version = event.oldVersion;

      // Migración por TRAMOS: nunca recrear stores existentes
      if (version < 1) {
        db.createObjectStore("sede_config", { keyPath: "sede_id" });

        const storeServicios = db.createObjectStore("servicios", { keyPath: "servicio_id" });
        storeServicios.createIndex("porEstado", "estado", { unique: false });
        storeServicios.createIndex("porOrden", "orden_visual", { unique: false });

        const storeBarberos = db.createObjectStore("barberos", { keyPath: "barbero_id" });
        storeBarberos.createIndex("porEstado", "estado", { unique: false });

        const storeHorarios = db.createObjectStore("horarios", { keyPath: "horario_id" });
        storeHorarios.createIndex("porBarberoDia", ["barbero_id", "dia_semana"], { unique: false });

        const storeAgenda = db.createObjectStore("agenda_dia", { keyPath: "cita_id" });
        storeAgenda.createIndex("porFecha", "fecha", { unique: false });
        storeAgenda.createIndex("porBarberoFecha", ["barbero_id", "fecha"], { unique: false });
        storeAgenda.createIndex("porCodigo", "codigo_reserva", { unique: true });

        const storeInv = db.createObjectStore("inventario", { keyPath: "producto_id" });
        storeInv.createIndex("porEstado", "estado", { unique: false });
        storeInv.createIndex("porSku", "sku", { unique: false });
      }

      if (version < 2) {
        // Clave UUID generada en cliente (crypto.randomUUID()) para idempotencia en servidor
        const storeOutbox = db.createObjectStore("outbox", { keyPath: "idCambio" });
        storeOutbox.createIndex("porEstadoSync", "estadoSync", { unique: false });
        storeOutbox.createIndex("porCreadoEn", "creadoEn", { unique: false });
      }
    };

    peticion.onsuccess = (event) => resolve(event.target.result);
    peticion.onerror = (event) => reject(event.target.error);
  });
}

export function pedir(req) {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}
