// src/pwa/sync.js
// Sincronización en segundo plano (Background Sync + Outbox Pattern + Plan B) según SMARTBARBER_TECH_SPEC.md

import { pedir, abrirBaseDeDatos } from "./db.js";
import { httpClient, HttpError } from "../services/http-client.js";

export const ETIQUETA_SYNC = "sync-smartbarber";

export function haySyncEnSegundoPlano() {
  return "serviceWorker" in navigator && "SyncManager" in window;
}

/**
 * Anota un cambio pendiente con UUID idempotente (crypto.randomUUID()).
 */
export async function encolarCambio(tipo, payload) {
  const db = await abrirBaseDeDatos();
  const cambio = {
    idCambio: crypto.randomUUID(),
    tipo,
    payload,
    estadoSync: "pendiente", // "pendiente" | "conflicto"
    errorConflicto: null,
    creadoEn: Date.now(),
  };

  return new Promise((resolve, reject) => {
    const tx = db.transaction("outbox", "readwrite");
    tx.objectStore("outbox").add(cambio);
    tx.oncomplete = () => {
      // Disparar sincronización automáticamente si hay red o solicitar Background Sync
      pedirSincronizacion().catch(() => {});
      // Emitir evento para actualizar los pills de la UI
      window.dispatchEvent(new CustomEvent("smartbarber:outbox-updated"));
      resolve(cambio.idCambio);
    };
    tx.onerror = () => reject(tx.error);
  });
}

/**
 * Pide Background Sync; si no existe SyncManager o lanza NotAllowedError, cae al Plan B.
 */
export async function pedirSincronizacion() {
  const db = await abrirBaseDeDatos();

  if (haySyncEnSegundoPlano()) {
    try {
      const reg = await navigator.serviceWorker.ready;
      if (reg && reg.sync) {
        await reg.sync.register(ETIQUETA_SYNC);
        return "segundo-plano";
      }
    } catch {
      // NotAllowedError (permiso bloqueado en sitio) -> caer al Plan B
    }
  }

  // Plan B: Vaciar directamente desde la página cuando hay conexión activa
  await vaciarDesdeLaPagina(db);
  return "desde-la-pagina";
}

/**
 * Drenaje seguro por página (Plan B para Safari, Firefox o permisos denegados).
 */
export async function vaciarDesdeLaPagina(dbInstancia = null) {
  if (!navigator.onLine) return 0;

  const db = dbInstancia || (await abrirBaseDeDatos());
  const txRead = db.transaction("outbox", "readonly");
  const todos = await pedir(txRead.objectStore("outbox").getAll());
  const pendientes = todos
    .filter((c) => c.estadoSync === "pendiente")
    .sort((a, b) => a.creadoEn - b.creadoEn);

  let enviados = 0;

  for (const cambio of pendientes) {
    try {
      await httpClient.request("/sync/outbox", {
        method: "POST",
        credentials: "include",
        body: JSON.stringify(cambio),
      });

      // Borrado inmediato del ítem confirmado
      const txDel = db.transaction("outbox", "readwrite");
      await pedir(txDel.objectStore("outbox").delete(cambio.idCambio));
      enviados++;
    } catch (err) {
      if (err instanceof HttpError && (err.status === 409 || err.status === 422)) {
        // Conflicto de negocio definitivo: NO reintentar infinitamente; marcar para resolución manual
        const detalle = err.details || { message: err.message || "Conflicto de negocio" };
        await marcarConflicto(db, cambio.idCambio, detalle);
        continue;
      }
      console.warn("⚠️ Fallo en sincronización de ítem:", cambio.idCambio, err.message);
      break;
    }
  }

  if (enviados > 0) {
    window.dispatchEvent(new CustomEvent("smartbarber:outbox-updated", { detail: { enviados } }));
  }

  return enviados;
}

/**
 * Marca un cambio con conflicto para revisión manual en el drawer del Backoffice.
 */
export async function marcarConflicto(db, idCambio, detalle) {
  const tx = db.transaction("outbox", "readwrite");
  const store = tx.objectStore("outbox");
  const reg = await pedir(store.get(idCambio));
  if (reg) {
    reg.estadoSync = "conflicto";
    reg.errorConflicto = detalle;
    await pedir(store.put(reg));
    window.dispatchEvent(new CustomEvent("smartbarber:outbox-updated"));
  }
}

/**
 * Descarta un cambio con conflicto de la bandeja de salida.
 */
export async function descartarCambio(idCambio) {
  const db = await abrirBaseDeDatos();
  const tx = db.transaction("outbox", "readwrite");
  await pedir(tx.objectStore("outbox").delete(idCambio));
  window.dispatchEvent(new CustomEvent("smartbarber:outbox-updated"));
}

/**
 * Obtiene el conteo de cambios pendientes y con conflicto
 */
export async function obtenerEstadoOutbox() {
  const db = await abrirBaseDeDatos().catch(() => null);
  if (!db || !db.objectStoreNames.contains("outbox")) return { pendientes: 0, conflictos: 0, items: [] };

  const tx = db.transaction("outbox", "readonly");
  const todos = await pedir(tx.objectStore("outbox").getAll());
  const pendientes = todos.filter((c) => c.estadoSync === "pendiente");
  const conflictos = todos.filter((c) => c.estadoSync === "conflicto");

  return {
    pendientes: pendientes.length,
    conflictos: conflictos.length,
    total: todos.length,
    items: todos
  };
}
