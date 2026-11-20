// public/js/pwa/sync.js
// Sincronización en segundo plano (Background Sync + Outbox Pattern + Plan B) según SMARTBARBER_TECH_SPEC.md

import { pedir, abrirBaseDeDatos } from "./db.js";

export const ETIQUETA_SYNC = "sync-smartbarber";

export function haySyncEnSegundoPlano() {
  return "serviceWorker" in navigator && "SyncManager" in window;
}

export async function encolarCambio(tipo, payload) {
  const db = await abrirBaseDeDatos();
  const cambio = {
    idCambio: crypto.randomUUID(),
    tipo,
    payload,
    estadoSync: "pendiente",
    errorConflicto: null,
    creadoEn: Date.now(),
  };

  return new Promise((resolve, reject) => {
    const tx = db.transaction("outbox", "readwrite");
    tx.objectStore("outbox").add(cambio);
    tx.oncomplete = () => {
      pedirSincronizacion().catch(() => {});
      window.dispatchEvent(new CustomEvent("smartbarber:outbox-updated"));
      resolve(cambio.idCambio);
    };
    tx.onerror = () => reject(tx.error);
  });
}

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
      // Fallback Plan B
    }
  }
  await vaciarDesdeLaPagina(db);
  return "desde-la-pagina";
}

export async function vaciarDesdeLaPagina(dbInstancia = null) {
  if (!navigator.onLine) return 0;
  const db = dbInstancia || (await abrirBaseDeDatos());
  const txRead = db.transaction("outbox", "readonly");
  const todos = await pedir(txRead.objectStore("outbox").getAll());
  const pendientes = todos
    .filter((c) => c.estadoSync === "pendiente")
    .sort((a, b) => a.creadoEn - b.creadoEn);

  let enviados = 0;
  const token = localStorage.getItem("smartbarber_token");
  const headers = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  };

  for (const cambio of pendientes) {
    try {
      const resp = await fetch("/api/v1/sync/outbox", {
        method: "POST",
        headers,
        credentials: "include",
        body: JSON.stringify(cambio),
      });

      if (resp.status === 409 || resp.status === 422) {
        const detalle = await resp.json().catch(() => ({ message: "Conflicto de negocio" }));
        await marcarConflicto(db, cambio.idCambio, detalle);
        continue;
      }

      if (!resp.ok) throw new Error("Error temporal del servidor: " + resp.status);

      const txDel = db.transaction("outbox", "readwrite");
      await pedir(txDel.objectStore("outbox").delete(cambio.idCambio));
      enviados++;
    } catch (err) {
      console.warn("Fallo sync ítem:", err.message);
      break;
    }
  }
  return enviados;
}

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
