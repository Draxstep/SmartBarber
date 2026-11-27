# SMARTBARBER_TECH_SPEC.md — Especificación Técnica Vinculante (PWA Offline-First)

**Proyecto:** SmartBarber (MVP v1.0) — Sistema de Gestión Operativa y Agendamiento para Barbería  
**Moneda base:** Peso Colombiano (COP entero sin decimales, `NUMERIC(12,0)`)  
**Zona horaria operativa:** `America/Bogota` (UTC-5) con persistencia estricta en UTC (`TIMESTAMPTZ`)  
**Destinatario:** Antigravity (Agente de desarrollo asistido por IA) — Plano determinista de construcción del repositorio.

---

## 1. Stack Tecnológico y Reglas Inquebrantables (Talleres + SmartBarber)

### 1.1 Stack Oficial del Repositorio
El proyecto se construye sin *frameworks* SPA ni *bundlers* pesados en el frontend, respetando estrictamente la arquitectura HTML/CSS/ES Modules nativos enseñada en los talleres de PWA y acoplada al núcleo relacional PostgreSQL de SmartBarber:

* **Frontend (Landing Page + Backoffice):** HTML5 semántico, CSS3 con Custom Properties (tokens exactos de `DESIGN.md`) y JavaScript Vanilla modular (`type="module"`), sin React, Angular, Vue ni Tailwind.
* **Capa PWA y Caché:** Workbox CLI (`workbox-cli`) en modo **`InjectManifest`** con bibliotecas copiadas localmente en `public/lib/workbox-v7.4.1/` mediante `npx workbox-cli copyLibraries public/lib` (solo los 6 módulos necesarios para mantener un peso liviano y garantizar arranque $100\%$ offline sin CDN).
* **Almacenamiento Local y Criptografía:** `IndexedDB` nativo (envuelto en promesas para `async/await`, sin dependencias externas) y `Web Crypto API` (`crypto.randomUUID()` para claves idempotentes y `crypto.subtle` para hashing SHA-256 / cifrado selectivo AES-GCM + PBKDF2 cuando aplique).
* **Notificaciones y Segundo Plano:** `Notifications API` (`registration.showNotification()`), `Push API` con claves VAPID (`RFC 8292`) y `Background Synchronization API` (`SyncManager`) con Plan B obligatorio para Safari/Firefox o permiso denegado.
* **Backend API y Trabajadores:** Node.js (LTS) con servidor HTTP REST desacoplado (`express` o `http` nativo + `pg` para PostgreSQL), `argon2` o `bcrypt` para contraseñas (`RNF-09`), `web-push` para firma ES256 y cifrado `aes128gcm` de mensajes Push, y `nodemailer` (o cliente HTTP transaccional) para el *worker* de `notificaciones_correo`.
* **Base de Datos Relacional:** PostgreSQL 15+ con extensión obligatoria `btree_gist`, PKs `UUID` (`gen_random_uuid()`), `NUMERIC(12,0)` para COP, `TIMESTAMPTZ` en UTC y las 16 tablas exactas en español `snake_case` plural.

### 1.2 Reglas de Sintaxis, Librerías Locales y Antipatrones Prohibidos
* **Cero CDN para el Service Worker:** Nunca cargar `workbox-sw.js` desde CDN; usar siempre `importScripts("/lib/workbox-v7.4.1/workbox-sw.js")` y `workbox.setConfig({ modulePathPrefix: "/lib/workbox-v7.4.1/", debug: false })`.
* **Feature Detection obligatorio:** Nunca asumir soporte de APIs del navegador. Verificar siempre `'serviceWorker' in navigator`, `'indexedDB' in window`, `'SyncManager' in window`, `'PushManager' in window` y `'Notification' in window`.
* **Prohibido `localStorage` para datos operativos:** `localStorage` es síncrono y solo almacena texto plano; todos los datos dinámicos (agenda, catálogo, inventario, `outbox`) residen exclusivamente en `IndexedDB`.
* **Prohibido `new Notification()`:** Usar exclusivamente `registration.showNotification()` (en Android Chrome `new Notification()` lanza `TypeError` y no opera en segundo plano).
* **Exclusiones estrictas de alcance (MVP v1.0):** No implementar cuentas/login para clientes finales (`ACT-03`), pasarelas de pago en línea, facturación electrónica DIAN, integración WhatsApp API/SMS, gestión de compras a proveedores/lotes ni interfaz multi-sede.

---

## 2. Arquitectura y Estructura de Directorios del Repositorio

SmartBarber opera con dos superficies de presentación aisladas (`/index.html` para el Portal Público y `/backoffice.html` para el Backoffice Operativo) servidas desde el mismo origen HTTPS para compartir el mismo alcance (`scope: "/"`) de Service Worker, `IndexedDB` y API REST.

```text
smartbarber/
├── .gitignore                        # OBLIGATORIO: incluye .env y server/claves-vapid.json
├── package.json                      # Scripts: build:sw, copy:workbox, start, migrate
├── workbox-config.js                 # Configuración InjectManifest (swSrc -> swDest)
├── db/
│   ├── migrations/
│   │   ├── 001_smartbarber_schema.sql      # DDL oficial exacto (16 tablas + ENUMs + GiST + triggers)
│   │   └── 002_pwa_push_suscripciones.sql  # Tablas auxiliares técnicas (push_suscripciones + sync_idempotencia)
│   └── seeds/
│       └── 001_seed_sede_inicial.sql       # Sede inicial, usuario administrador y catálogo base
├── server/
│   ├── index.js                      # Servidor HTTP/Express, CORS, Helmet, Rate Limiter, estáticos
│   ├── config/
│   │   ├── db.js                     # Pool PostgreSQL (pg) y helper de transacciones ACID
│   │   └── vapid.js                  # Carga de claves-vapid.json (nunca en Git) y web-push
│   ├── middlewares/
│   │   ├── authSession.js            # Validación sesiones_usuarios, expiración 8h (RNF-10)
│   │   ├── rbac.js                   # Exigencia de rol (G vs P) -> HTTP 403 Forbidden
│   │   ├── rateLimitPublic.js        # 10 req / 15 min por IP -> HTTP 429 (RNF-11)
│   │   └── antiBot.js                # Verificación honeypot / CAPTCHA invisible (RNF-11)
│   ├── routes/
│   │   ├── public.routes.js          # /api/public/* (CU-020, CU-021, CU-025)
│   │   ├── auth.routes.js            # /api/v1/auth/* (CU-001, CU-002)
│   │   ├── sede.routes.js            # /api/v1/sede (CU-003)
│   │   ├── cortes.routes.js          # /api/v1/cortes/* (CU-004 a CU-008)
│   │   ├── barberos.routes.js        # /api/v1/barberos/* (CU-009 a CU-013)
│   │   ├── servicios.routes.js       # /api/v1/servicios/* (CU-014, CU-015)
│   │   ├── inventario.routes.js      # /api/v1/inventario/* (CU-016 a CU-019)
│   │   ├── citas.routes.js           # /api/v1/citas/* (CU-022 a CU-025)
│   │   ├── sync.routes.js            # /api/v1/sync/outbox (Endpoint idempotente para Outbox)
│   │   └── push.routes.js            # /api/v1/push/* (clave-publica, suscribir, desuscribir)
│   ├── services/
│   │   ├── disponibilidad.service.js # Motor CU-025 (RN-01, RN-02, RN-03, RN-04)
│   │   ├── push.service.js           # Envío VAPID + limpieza automática 404/410
│   │   └── correo.worker.js          # Procesador Transactional Outbox (notificaciones_correo, 3 reintentos)
│   └── claves-vapid.json             # IGNORADO EN GIT (generado con web-push generate-vapid-keys)
└── public/                           # Raíz estática (globDirectory de Workbox)
    ├── index.html                    # Superficie A: Portal Público (Landing + Wizard 5 pasos)
    ├── backoffice.html               # Superficie B: Backoffice Operativo (Login + App Shell)
    ├── offline.html                  # Fallback editorial offline cuando no hay caché de navegación
    ├── manifest.json                 # Web App Manifest (instalabilidad, iconos any/maskable)
    ├── sw-propio.js                  # CÓDIGO FUENTE del Service Worker (NO precachear)
    ├── sw.js                         # ARCHIVO GENERADO por workbox-cli injectManifest
    ├── lib/
    │   └── workbox-v7.4.1/           # 6 módulos locales copiados con workbox-cli copyLibraries
    │       ├── workbox-sw.js
    │       ├── workbox-core.prod.js
    │       ├── workbox-precaching.prod.js
    │       ├── workbox-routing.prod.js
    │       ├── workbox-strategies.prod.js
    │       └── workbox-expiration.prod.js
    ├── icons/
    │   ├── icon-192.png              # purpose: "any"
    │   └── icon-512-maskable.png     # purpose: "maskable"
    ├── css/
    │   ├── tokens.css                # Tokens exactos de DESIGN.md (colores, tipografía, espaciado)
    │   ├── base.css                  # Reset, tipografía, WCAG focus rings, badges semánticos
    │   ├── landing.css               # Estilos Mobile-First Superficie A + Wizard 5 pasos
    │   └── backoffice.css            # Sidebar #1C1C1C 240px + Cuadrícula 30 min (48px/56px)
    └── js/
        ├── pwa/
        │   ├── sw-register.js        # Registro SW, flujo de actualización RF-PWA-08 e indicador RF-PWA-07
        │   ├── install-prompt.js     # Captura beforeinstallprompt + guía manual Safari/iOS
        │   ├── db.js                 # IndexedDB (VERSION_DB, migraciones por tramos oldVersion, CRUD)
        │   ├── sync.js               # encolarCambio(), pedirSincronizacion(), Plan B online/página
        │   └── notificaciones.js     # urlBase64ABytes(), suscribirAPush(), mostrarAvisoLocal()
        ├── shared/
        │   ├── formatters.js         # Formato COP ($ 25.000 COP), fechas America/Bogota, duración bloques
        │   └── api-client.js         # Wrapper fetch con manejo de 401/403/409/429 y detección offline
        ├── landing/
        │   ├── landing-app.js        # Carga catálogo/barberos/sede (CU-020)
        │   └── booking-wizard.js     # Asistente 5 pasos (< 90s), RN-02, RN-03, Ley 1581 (CU-021)
        └── backoffice/
            ├── backoffice-app.js     # Router interno, sesión, RBAC UI, contador alertas inventario
            ├── agenda-view.js        # Cuadrícula 30 min, estados cita, bloqueos (CU-022..024, CU-012)
            ├── caja-view.js          # Registro walk-in <= 4 clics, cierre cita, anulación (CU-004..008)
            ├── barberos-view.js      # CRUD barberos, horarios, comisiones CSV (CU-009..013)
            ├── servicios-view.js     # CRUD catálogo en bloques 30 min (CU-014, CU-015)
            └── inventario-view.js    # Productos, Entradas/Salidas, alertas, Kardex (CU-016..019)
```

---

## 3. Contrato de API REST y Reglas de Seguridad/Concurrencia

### 3.1 Endpoints Públicos (`/api/public/*` — Sin Autenticación)
Protegidos contra abuso con *rate limiting* (`10 req / 15 min` por IP $\rightarrow$ `HTTP 429 Too Many Requests` en reservas, `RNF-11`), sanitización contra XSS/SQLi (`RNF-12`) y exclusión total de PII de clientes/usuarios.

| Método | Ruta | Caso de Uso | Reglas y Contratos Clave |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/public/landing` | `CU-020` | Retorna `sedes` (solo campos públicos), `servicios` (`estado='activo' AND visible_publico=TRUE` ordenados por `orden_visual`) y `barberos` (`estado='activo'`). |
| `GET` | `/api/public/disponibilidad` | `CU-025` | Query: `?fecha=YYYY-MM-DD&bloques_totales=N&barbero_id=UUID\|cualquiera`. Aplica `RN-02` y `RN-03` (`+30 min` a `+dias_max_anticipacion`). SLA: $< 500\text{ ms}$ ($p_{95}$, `RNF-02`). |
| `POST` | `/api/public/citas` | `CU-021` | Exige `acepto_politica_datos: true` (Ley 1581), campo *honeypot* vacío / token anti-bot y `rateLimitPublic`. Valida `RN-14` (máx. 2 citas activas/día y 3 futuras por correo/teléfono). Ejecuta transacción ACID con `RN-04` (si `cualquiera`), genera `SB-[A-HJ-NP-Z2-9]{6}`, inserta `citas`, `citas_servicios` (snapshots `RN-12`), `historial_estados_citas` y `notificaciones_correo` (`pendiente`). Dispara Push a Backoffice. |

### 3.2 Endpoints Privados (`/api/v1/*` — Sesión + RBAC Estricto)
Requieren cabecera `Authorization: Bearer <token>` o cookie `HttpOnly; Secure; SameSite=Strict`. El middleware `authSession` verifica `sesiones_usuarios` (`revocada_en IS NULL`, `expira_en > NOW()`, inactividad $\le 8\text{ h}$ actualizando `ultima_actividad_en`). Cualquier violación de rol o intento de `barbero` (`ACT-02`) de leer/mutar registros de otro barbero retorna **`HTTP 403 Forbidden`** (`RNF-10`).

| Método | Ruta | Rol (`G`/`P`) | Caso de Uso / Comportamiento |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/auth/login` | Público | Valida Argon2id/bcrypt (`RNF-09`). Tras 5 fallos bloquea 15 min (`bloqueado_hasta`, `HTTP 423`). Crea registro en `sesiones_usuarios`. (`CU-001`) |
| `POST` | `/api/v1/auth/logout` | `G` / `P` | Marca `revocada_en = NOW()` en `sesiones_usuarios`. (`CU-001`) |
| `PATCH` | `/api/v1/auth/password` | `G` / `P` | Cambio de contraseña propia ($\ge 8$ chars alfanuméricos). (`CU-002`) |
| `GET`/`PUT` | `/api/v1/sede` | `G` (PUT), `G`/`P` (GET) | Lectura y edición de identidad comercial y parámetros de reserva (`dias_max_anticipacion` entre 7 y 60). (`CU-003`) |
| `POST` | `/api/v1/cortes/walk-in` | `G` / `P` | Crea `registros_cortes` (`origen='walk_in'`, `cita_id=NULL`) + `registros_cortes_servicios` (snapshots `RN-12`). Ajuste de `precio_cobrado_cop` solo `G` y exige `notas` $\ge 5$ chars (`RN-15`). (`CU-004`) |
| `POST` | `/api/v1/citas/:id/completar` | `G` / `P` (propia) | Transacción ACID 1:1 (`RN-08`): actualiza `citas.estado='completada'`, inserta `historial_estados_citas` y crea `registros_cortes` (`origen='cita'`) + snapshots. (`CU-005`) |
| `GET` | `/api/v1/cortes` | `G` / `P` (propios) | Historial filtrado por fecha, barbero, método de pago y estado. (`CU-006`) |
| `GET` | `/api/v1/cortes/resumen` | `G` / `P` (propios) | Agregación por día, método de pago y barbero excluyendo `anulado`. (`CU-007`) |
| `POST` | `/api/v1/cortes/:id/anular` | `G` | Exige `motivo_anulacion` $\ge 10$ chars (`RN-13`). Marca `estado='anulado'`, registra `anulado_por_usuario_id` y revierte cita asociada si aplica (`RN-07`). (`CU-008`) |
| `GET`/`POST`/`PUT` | `/api/v1/barberos`, `/api/v1/barberos/:id` | `G` (CRUD), `P` (propio GET) | Valida foto JPG/PNG/WebP $\le 2\text{ MB}$, correo único, comisión en $[0,100]$. (`CU-009`) |
| `PATCH` | `/api/v1/barberos/:id/desactivar` | `G` | Retorna lista de citas futuras vigentes si existen; al confirmar, marca `inactivo` y revoca `sesiones_usuarios` del barbero. (`CU-010`) |
| `GET`/`PUT` | `/api/v1/barberos/:id/horarios` | `G` (PUT), `G`/`P` (GET) | Plantilla 7 días, máx. 2 franjas `:00`/`:30` sin solapamiento (`excl_horarios_barberos_solapamiento`). (`CU-011`) |
| `GET`/`POST`/`DELETE` | `/api/v1/bloqueos` | `G` / `P` (propio) | Crea/desactiva `bloqueos_horarios`. Advierte conflictos con citas activas (`excl_bloqueos_horarios_solapamiento`). (`CU-012`) |
| `GET` | `/api/v1/barberos/comisiones` | `G` / `P` (propio) | Liquidación referencial ($C = \text{round}(P \times p / 100)$) con soporte `?formato=csv`. (`CU-013`) |
| `GET`/`POST`/`PUT`/`PATCH` | `/api/v1/servicios`, `/api/v1/servicios/:id/estado` | `G` (mutar), `G`/`P` (GET) | CRUD de servicios (`duracion_bloques` de 1 a 6) y borrado lógico (`RN-12`, `RN-13`). (`CU-014`, `CU-015`) |
| `GET`/`POST`/`PUT` | `/api/v1/inventario/productos` | `G` (CRUD), `P` (GET) | **Nunca acepta `stock_actual` en `PUT`**. En `POST`, si `stock_inicial > 0`, crea movimiento `inventario_inicial`. (`CU-016`) |
| `POST` | `/api/v1/inventario/entradas` | `G` | Transacción ACID: incrementa `stock_actual` y crea `movimientos_inventario` (`compra_reposicion` \| `ajuste_positivo`). (`CU-017`) |
| `POST` | `/api/v1/inventario/salidas` | `G` / `P` | Transacción ACID con `SELECT stock_actual FROM productos_inventario WHERE producto_id=$1 FOR UPDATE`. Si $S - Q < 0 \rightarrow$ `HTTP 409`. Si `venta_publico`, exige `metodo_pago`. Dispara Push si queda en `Stock bajo` o `Agotado` (`RN-10`, `RN-11`). (`CU-018`) |
| `GET` | `/api/v1/inventario/kardex` | `G` / `P` | Consulta solo lectura de `movimientos_inventario`. (`CU-019`) |
| `GET`/`POST` | `/api/v1/citas` | `G` (POST/GET global), `P` (GET propias) | Agenda diaria/semanal (`CU-022`) y registro manual `origen='backoffice'` (`CU-024`). |
| `PATCH` | `/api/v1/citas/:id/estado` | `G` / `P` (propia) | Valida máquina de estados (`RN-07`). `no_asistio` exige $\ge 15\text{ min}$ tras `inicio_en` (`RN-06`). Inserta en `historial_estados_citas`. (`CU-023`) |
| `POST` | `/api/v1/sync/outbox` | `G` / `P` | Receptor idempotente de cambios offline (`idCambio` UUID). Procesa operaciones del Backoffice encoladas en IndexedDB. |
| `GET`/`POST`/`DELETE` | `/api/v1/push/clave-publica`, `/api/v1/push/suscribir` | `G` / `P` | Entrega clave pública VAPID y registra/elimina suscripción del dispositivo del Backoffice. |

### 3.3 Manejo Estandarizado de Errores de Concurrencia y Negocio
* **Error PostgreSQL `23P01` (`exclusion_violation`):** Capturado al insertar en `citas` (`excl_citas_barbero_solapamiento`) o `bloqueos_horarios`. El servidor realiza `ROLLBACK` y responde **`HTTP 409 Conflict`** con `{ "code": "SLOT_CONFLICT", "message": "El horario seleccionado acaba de ser reservado. Elige otro bloque disponible." }` (`RN-01`).
* **Stock insuficiente (`RN-10`):** Capturado tras `FOR UPDATE` o violación `CHECK (stock_actual >= 0)`. Responde **`HTTP 409 Conflict`** con `{ "code": "INSUFFICIENT_STOCK", "stock_disponible": N, "message": "Stock insuficiente. Disponible: N unidad(es)." }`.
* **Trabajador asíncrono de correos (`server/services/correo.worker.js`):** Consulta periódicamente (cada 10 s) `notificaciones_correo` con `WHERE estado = 'pendiente' AND proximo_reintento_en <= NOW() FOR UPDATE SKIP LOCKED`. Intenta despacho vía `ACT-04`; si tiene éxito marca `estado = 'enviada', enviada_en = NOW()`. Si falla, incrementa `intentos`: si `intentos < 3`, reprograma `proximo_reintento_en = NOW() + (intentos * INTERVAL '2 minutes')`; si `intentos = 3`, marca `estado = 'fallida'` guardando `ultimo_error` (`RF-AGE-06`).

---

## 4. Diseño de Datos Locales (`IndexedDB`) y Migraciones Versionadas

Siguiendo exactamente el patrón de los talleres de `IndexedDB` y `Background Sync`, `public/js/pwa/db.js` envuelve las operaciones basadas en eventos de `IndexedDB` en promesas nativas (`async/await`), mantiene `VERSION_DB` y ejecuta migraciones **estrictamente por tramos** usando `event.oldVersion` para preservar datos de versiones previas sin pérdida.

### 4.1 Esquema `smartbarber-db` y Mapeo 1:1 con PostgreSQL

| `objectStore` (IndexedDB) | `keyPath` | Índices (`createIndex`) | Tabla(s) PostgreSQL Origen | Propósito Offline |
| :--- | :--- | :--- | :--- | :--- |
| `sede_config` | `sede_id` | — | `sedes` | Identidad pública, horarios texto y parámetros de reserva offline. |
| `servicios` | `servicio_id` | `porEstado` (`estado`), `porOrden` (`orden_visual`) | `servicios` | Catálogo para Landing Page y selectores de caja *walk-in* sin red. |
| `barberos` | `barbero_id` | `porEstado` (`estado`) | `barberos` | Perfiles activos, comisiones y columnas de la agenda. |
| `horarios` | `horario_id` | `porBarberoDia` (`["barbero_id", "dia_semana"]`) | `horarios_barberos` | Plantilla laboral para renderizar turnos en agenda local. |
| `agenda_dia` | `cita_id` | `porFecha` (`fecha`), `porBarberoFecha` (`["barbero_id", "fecha"]`), `porCodigo` (`codigo_reserva`, `unique: true`) | `citas` + `citas_servicios` (embebido) + `clientes` (resumen) | Visualización de cuadrícula de 30 min y cierre de citas sin red. |
| `inventario` | `producto_id` | `porEstado` (`estado`), `porSku` (`sku`, `unique: false`) | `productos_inventario` | Consulta de stock, cálculo de alertas (`Stock bajo`/`Agotado`) y registro offline de salidas. |
| `outbox` | `idCambio` | `porEstadoSync` (`estadoSync`), `porCreadoEn` (`creadoEn`) | *(Cola hacia `/api/v1/sync/outbox`)* | Bandeja de salida de mutaciones offline del Backoffice con UUID idempotente. |

### 4.2 Código Plantilla Obligatorio de `public/js/pwa/db.js`
```javascript
// public/js/pwa/db.js
const NOMBRE_DB = "smartbarber-db";
export const VERSION_DB = 2;

export function abrirBaseDeDatos() {
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
```
*Nota operativa:* Agregar propiedades no indexadas a un registro (por ejemplo `sincronizado: false` o `foto`) no requiere incrementar `VERSION_DB`; solo se incrementa `VERSION_DB` cuando se crean o modifican `objectStores` o índices.

---

## 5. Service Worker y Workbox (`InjectManifest`)

SmartBarber exige lógica personalizada dentro del Service Worker (`sync`, `push`, `notificationclick` y control de actualizaciones), por lo que **se prohíbe usar `generateSW`**; debe utilizarse exclusivamente **`InjectManifest`**.

### 5.1 Configuración de `workbox-config.js`
```javascript
// workbox-config.js
module.exports = {
  globDirectory: "public",
  globPatterns: [
    "index.html",
    "backoffice.html",
    "offline.html",
    "manifest.json",
    "css/*.css",
    "js/**/*.js",
    "icons/*.png",
  ],
  // CRÍTICO: excluir sw-propio.js y sw.js para que el SW no se precachee a sí mismo
  globIgnores: [
    "lib/**/*",
    "sw.js",
    "sw-propio.js",
  ],
  swSrc: "public/sw-propio.js",
  swDest: "public/sw.js",
};
```
**Regla de oro de compilación:** Cada vez que se modifique `public/sw-propio.js` o cualquier archivo estático listado en `globPatterns`, ejecutar obligatoriamente `npx workbox-cli injectManifest workbox-config.js` para regenerar `public/sw.js` con hashes actualizados.

### 5.2 Plantilla Completa de `public/sw-propio.js`
Deben cumplirse tres reglas estrictas: (1) cargar Workbox desde `/lib/workbox-v7.4.1/`, (2) desestructurar **todos** los módulos de Workbox en el nivel superior (nunca dentro de eventos), y (3) incluir el marcador `self.__WB_MANIFEST` **exactamente una vez en todo el archivo** (ni siquiera repetir ese texto en comentarios).

```javascript
// public/sw-propio.js
importScripts("/lib/workbox-v7.4.1/workbox-sw.js");
workbox.setConfig({ modulePathPrefix: "/lib/workbox-v7.4.1/", debug: false });

// Lectura obligatoria de módulos en nivel superior (importScripts solo válido al evaluar/instalar)
const { precacheAndRoute, cleanupOutdatedCaches } = workbox.precaching;
const { registerRoute, setCatchHandler } = workbox.routing;
const { CacheFirst, NetworkFirst, NetworkOnly, StaleWhileRevalidate } = workbox.strategies;
const { ExpirationPlugin } = workbox.expiration;

cleanupOutdatedCaches();
precacheAndRoute(self.__WB_MANIFEST);

// 1. Imágenes e íconos estáticos -> CacheFirst (LCP < 2.5s en 4G, RNF-01)
registerRoute(
  ({ url }) => url.pathname.startsWith("/icons/") || url.pathname.startsWith("/uploads/barberos/"),
  new CacheFirst({
    cacheName: "smartbarber-imagenes",
    plugins: [new ExpirationPlugin({ maxEntries: 40, maxAgeSeconds: 60 * 60 * 24 * 30 })],
  })
);

// 2. Fuentes de Google (Playfair Display, Inter, JetBrains Mono) -> StaleWhileRevalidate
registerRoute(
  ({ url }) => url.origin === "https://fonts.googleapis.com" || url.origin === "https://fonts.gstatic.com",
  new StaleWhileRevalidate({
    cacheName: "smartbarber-fuentes",
    plugins: [new ExpirationPlugin({ maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 365 })],
  })
);

// 3. Disponibilidad en vivo y autenticación -> NetworkOnly (jamás servir slots obsoletos ni tokens)
registerRoute(
  ({ url }) =>
    url.pathname.startsWith("/api/public/disponibilidad") ||
    url.pathname.startsWith("/api/v1/auth/"),
  new NetworkOnly()
);

// 4. Datos públicos Landing y lecturas GET del Backoffice -> NetworkFirst con fallback a caché
registerRoute(
  ({ url, request }) =>
    request.method === "GET" &&
    (url.pathname.startsWith("/api/public/landing") || url.pathname.startsWith("/api/v1/")),
  new NetworkFirst({
    cacheName: "smartbarber-api",
    networkTimeoutSeconds: 4,
    plugins: [new ExpirationPlugin({ maxEntries: 60, maxAgeSeconds: 60 * 60 * 24 })],
  })
);

// Fallback editorial para navegación offline no precacheada
setCatchHandler(async ({ request }) => {
  if (request.destination === "document") {
    return caches.match("/offline.html");
  }
  return Response.error();
});

// Control de actualización controlada (RF-PWA-08)
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

// Los manejadores "sync", "push" y "notificationclick" se anexan en las Secciones 6 y 7.
```

### 5.3 Flujo de Actualización (`RF-PWA-08`) e Indicador Offline (`RF-PWA-07`)
* **Actualización controlada (`public/js/pwa/sw-register.js`):** Al registrar `navigator.serviceWorker.register("/sw.js")`, escuchar `reg.addEventListener("updatefound", ...)` y verificar cuando `newWorker.state === "installed" && navigator.serviceWorker.controller`. Mostrar un *banner* no intrusivo (`#FAF7F2`, borde `1px solid #1F3A5F`) con botón *"Actualizar SmartBarber"* que envía `waitingWorker.postMessage({ type: "SKIP_WAITING" })` y recarga en `controllerchange`.
* **Indicador de conectividad (`RF-PWA-07`):** Escuchar eventos `window.addEventListener("online", ...)` y `window.addEventListener("offline", ...)` junto con `navigator.onLine`. Mostrar un *pill* accesible (icono + texto) en la barra superior del Backoffice y en el Wizard público:
  * **En línea:** oculto o estado discreto `"Sincronizado"`.
  * **Sin conexión (Backoffice):** `status-warning-bg` (`#FDF1DC`) / `status-warning-text` (`#8A5300`) con texto `"Modo sin conexión · N cambio(s) pendiente(s)"`.
  * **Sin conexión (Landing Page):** bloquea el paso de confirmación de reserva (`CU-021`) indicando `"Se requiere conexión a internet para confirmar disponibilidad en tiempo real"` (evita promesas falsas sobre `RN-01`).

---

## 6. Sincronización en Segundo Plano (`Outbox Pattern` + `Background Sync` + Fallback)

El Backoffice permite continuidad operativa ante cortes de internet en el local para operaciones de caja e inventario, aplicando el patrón **Outbox + UUID + Background Sync + Plan B**.

### 6.1 Operaciones Soportadas Offline vs. Estrictamente Online
* **Encolables en `outbox` (Backoffice):**
  1. `CREAR_CORTE_WALKIN` (`CU-004`): registra en `outbox` y actualiza vista local de ingresos del día.
  2. `COMPLETAR_CITA` (`CU-005`): marca cita local como `completada (pendiente sync)` y encola cierre 1:1.
  3. `CAMBIAR_ESTADO_CITA` (`CU-023`): encola transición (`confirmada`, `cancelada`, `no_asistio`).
  4. `MOVIMIENTO_INVENTARIO` (`CU-017`, `CU-018`): actualiza optimísticamente `stock_actual` local (validando $S_{\text{local}} - Q \ge 0$) y encola entrada/salida.
  5. `CREAR_BLOQUEO` (`CU-012`): encola bloqueo puntual sobre agenda propia.
* **Estrictamente Online (bloqueadas sin red):** Reserva pública (`CU-021`), consulta de disponibilidad (`CU-025`), inicio de sesión (`CU-001`), anulación auditada (`CU-008`) y desactivación de barbero (`CU-010`).

### 6.2 Módulo de Página `public/js/pwa/sync.js` (con Plan B)
```javascript
// public/js/pwa/sync.js
import { pedir } from "./db.js";

export const ETIQUETA_SYNC = "sync-smartbarber";

export function haySyncEnSegundoPlano() {
  return "serviceWorker" in navigator && "SyncManager" in window;
}

/** Anota un cambio pendiente con UUID idempotente. */
export function encolarCambio(db, tipo, payload) {
  const cambio = {
    idCambio: crypto.randomUUID(),
    tipo,
    payload,
    estadoSync: "pendiente", // pendiente | conflicto
    errorConflicto: null,
    creadoEn: Date.now(),
  };
  return new Promise((resolve, reject) => {
    const tx = db.transaction("outbox", "readwrite");
    tx.objectStore("outbox").add(cambio);
    tx.oncomplete = () => resolve(cambio.idCambio);
    tx.onerror = () => reject(tx.error);
  });
}

/** Pide Background Sync; si no existe SyncManager o lanza NotAllowedError, cae al Plan B. */
export async function pedirSincronizacion(db) {
  if (haySyncEnSegundoPlano()) {
    try {
      const reg = await navigator.serviceWorker.ready;
      await reg.sync.register(ETIQUETA_SYNC);
      return "segundo-plano";
    } catch {
      // NotAllowedError (permiso bloqueado en sitio) -> caer al Plan B
    }
  }
  await vaciarDesdeLaPagina(db);
  return "desde-la-pagina";
}

export async function vaciarDesdeLaPagina(db) {
  if (!navigator.onLine) return 0;
  const txRead = db.transaction("outbox", "readonly");
  const pendientes = (await pedir(txRead.objectStore("outbox").getAll()))
    .filter((c) => c.estadoSync === "pendiente")
    .sort((a, b) => a.creadoEn - b.creadoEn);

  let enviados = 0;
  for (const cambio of pendientes) {
    const resp = await fetch("/api/v1/sync/outbox", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(cambio),
    });

    if (resp.status === 409 || resp.status === 422) {
      // Conflicto de negocio definitivo: NO reintentar infinitamente; marcar para resolución manual
      const detalle = await resp.json().catch(() => ({ message: "Conflicto de negocio" }));
      await marcarConflicto(db, cambio.idCambio, detalle);
      continue;
    }
    if (!resp.ok) throw new Error("Error temporal del servidor: " + resp.status);

    const txDel = db.transaction("outbox", "readwrite");
    await pedir(txDel.objectStore("outbox").delete(cambio.idCambio));
    enviados++;
  }
  return enviados;
}

async function marcarConflicto(db, idCambio, detalle) {
  const tx = db.transaction("outbox", "readwrite");
  const store = tx.objectStore("outbox");
  const reg = await pedir(store.get(idCambio));
  if (reg) {
    reg.estadoSync = "conflicto";
    reg.errorConflicto = detalle;
    await pedir(store.put(reg));
  }
}
```
Adicionalmente, registrar `window.addEventListener("online", () => vaciarDesdeLaPagina(db))` en `backoffice-app.js` para garantizar el vaciado automático en Safari/Firefox al recuperar red.

### 6.3 Manejador `sync` en `public/sw-propio.js`
```javascript
self.addEventListener("sync", (event) => {
  if (event.tag === "sync-smartbarber") {
    event.waitUntil(vaciarBandejaDesdeSW().then(avisarDeSincronizacion));
  }
});
```
* **Regla de borrado inmediato por ítem:** Dentro de `vaciarBandejaDesdeSW()`, borrar cada entrada de `outbox` inmediatamente después de confirmar `resp.ok` (nunca al final del bucle), para no reenviar lo ya confirmado si un ítem posterior falla.
* **Lanzar para reintentar:** Ante fallo de red o `HTTP 5xx`, lanzar `Error` para que Chromium reprograme el evento `sync` con *backoff* exponencial.
* **Notificación silenciosa condicional:** `avisarDeSincronizacion(enviados)` consulta `clients.matchAll({ type: "window", includeUncontrolled: true })`. Si hay ventana visible, envía `postMessage` para refrescar la UI; solo muestra notificación del sistema (`registration.showNotification`) si no hay ninguna ventana visible.

### 6.4 Idempotencia en Servidor y Resolución de Conflictos al Reconectar
* **Idempotencia (`idCambio`):** El endpoint `POST /api/v1/sync/outbox` mantiene un registro de `idCambio` procesados en PostgreSQL (`sync_idempotencia`). Si llega un `idCambio` ya aplicado por un reintento de red, responde **`HTTP 200 OK`** con `{ "ok": true, "duplicado": true }` sin duplicar cortes, citas ni movimientos de Kardex.
* **Resolución de conflictos (`HTTP 409`):**
  * **Stock agotado (`INSUFFICIENT_STOCK` / `RN-10`):** Si otro barbero vendió la última unidad mientras el dispositivo estuvo offline, el servidor rechaza con `409`. El ítem pasa a `estadoSync: "conflicto"` en `outbox`, el Backoffice refresca `inventario` desde servidor y muestra un *drawer* de *"Pendientes con conflicto"* (`status-error-bg`) permitiendo ajustar la cantidad o descartar el cambio.
  * **Cita modificada o solapamiento (`SLOT_CONFLICT` / `23P01`):** Si una cita fue cancelada o completada por otro usuario mientras se operaba offline, el servidor responde `409`. El cliente marca conflicto, recarga `agenda_dia` desde servidor y presenta el estado real al barbero sin sobrescribir silenciosamente la BD.

---

## 7. Sistema de Notificaciones Locales y Push (VAPID)

### 7.1 Suscripción en Contexto y Gestión de Permisos
* **Nunca pedir permiso al cargar la página.** El botón `"Activar alertas de agenda e inventario"` en el encabezado/configuración del Backoffice solicita `Notification.requestPermission()` exclusivamente dentro del evento `click` del usuario.
* Si el permiso es `denied`, informar con tono neutro que la app sigue operando normalmente y explicar cómo reactivarlo en el navegador.
* **Clave privada VAPID:** Generada con `npx web-push generate-vapid-keys`, almacenada en `server/claves-vapid.json` (incluida en `.gitignore`). Nunca exponerla al frontend ni subirla a Git.

### 7.2 Casos de Disparo de Push en SmartBarber (Backoffice)
1. **Nueva reserva pública (`CU-021`):** Al confirmar una cita en `POST /api/public/citas`, el servidor envía Push al `administrador` y al `barbero` asignado:
   * `titulo`: `"Nueva cita · SB-XXXXXX"`
   * `cuerpo`: `"Juan Pérez · Corte Fade (09:30 AM)"`
   * `tag`: `"cita-SB-XXXXXX"`
   * `url`: `"/backoffice.html#agenda?fecha=YYYY-MM-DD"`
2. **Alerta de inventario (`RN-11` / `CU-018`):** Cuando una salida deja un producto activo en `Stock bajo` ($0 < S \le S_{\min}$) o `Agotado` ($S = 0$), envía Push a los dispositivos del `administrador`:
   * `titulo`: `"Alerta de inventario · Agotado"` (o `"Stock bajo"`)
   * `cuerpo`: `"Cera Mate 100g quedó con 2 unidades (mínimo: 2)."`
   * `tag`: `"inv-alerta-<producto_id>"` (reemplaza alerta previa del mismo producto sin apilar)
   * `url`: `"/backoffice.html#inventario?filtro=alertas"`

### 7.3 Manejadores `push` y `notificationclick` en `public/sw-propio.js`
```javascript
self.addEventListener("push", (event) => {
  let datos = {
    titulo: "SmartBarber",
    cuerpo: "Tienes una novedad operativa.",
    tag: "smartbarber-aviso",
    url: "/backoffice.html#agenda",
  };
  try {
    if (event.data) datos = { ...datos, ...event.data.json() };
  } catch {
    if (event.data) datos.cuerpo = event.data.text(); // Fallback texto plano
  }

  // userVisibleOnly: true obliga a mostrar SIEMPRE una notificación dentro de waitUntil
  event.waitUntil(
    self.registration.showNotification(datos.titulo, {
      body: datos.cuerpo,
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
      tag: datos.tag,
      data: { url: datos.url },
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const destino = new URL(event.notification.data?.url ?? "/backoffice.html", self.location.origin).href;
  event.waitUntil(
    (async () => {
      const ventanas = await clients.matchAll({ type: "window", includeUncontrolled: true });
      const abierta = ventanas.find((v) => new URL(v.url).origin === self.location.origin);
      if (abierta) {
        if ("navigate" in abierta) await abierta.navigate(destino);
        return abierta.focus();
      }
      return clients.openWindow(destino);
    })()
  );
});
```

### 7.4 Limpieza Automática de Suscripciones Muertas (`404` / `410`)
En `server/services/push.service.js`, al iterar cada envío con `webpush.sendNotification(suscripcion, JSON.stringify(payload))`: si el servicio de push del navegador responde con `err.statusCode === 404 || err.statusCode === 410`, eliminar inmediatamente esa suscripción de PostgreSQL para no reintentar envíos a endpoints revocados o caducados.

---

## 8. Plano de Implementación por Módulo Funcional (`M0` a `M5`)

### 8.1 Tokens CSS Base (`public/css/tokens.css` — Fidelidad `DESIGN.md`)
```css
:root {
  --brand-primary: #1F3A5F;
  --brand-primary-hover: #162B47;
  --brand-secondary: #1C1C1C;
  --brand-accent: #8B1E1E;
  --brand-accent-hover: #6E1616;

  --bg-canvas: #F2EBDD;
  --bg-surface: #FAF7F2;
  --bg-surface-subtle: #E8DFCE;
  --bg-input: #FFFFFF;
  --bg-dark-elevated: #2A2A2A;

  --text-primary: #1C1C1C;
  --text-secondary: #4F4A42;
  --text-muted: #6B645A;
  --text-on-dark: #F2EBDD;
  --text-on-dark-muted: #BDB4A5;
  --text-on-brand: #FFFFFF;
  --accent-on-dark-blue: #7BA3D4;
  --accent-on-dark-red: #E07A7A;

  --border-subtle: #D5CBB8;
  --border-strong: #8C8272;
  --border-focus: #1F3A5F;

  --status-success-text: #235D3A; --status-success-bg: #E3EFE7;
  --status-warning-text: #8A5300; --status-warning-bg: #FDF1DC;
  --status-error-text: #B3261E;   --status-error-bg: #FCE8E6;
  --status-info-text: #1F3A5F;    --status-info-bg: #E4ECF5;
  --status-neutral-text: #4F4A42; --status-neutral-bg: #E8DFCE;

  --font-display: 'Playfair Display', Georgia, serif;
  --font-ui: 'Inter', system-ui, -apple-system, sans-serif;
  --font-mono: 'JetBrains Mono', monospace;
}
```

### 8.2 Guía de Construcción por Módulo (`CU-001` a `CU-025`)

* **Módulo 0 — Seguridad, Acceso y Configuración Base (`CU-001` a `CU-003`):**
  * `CU-001`: Pantalla de login en `backoffice.html` (card `#FAF7F2` sobre `#F2EBDD`). Mostrar mensaje claro ante bloqueo de 15 min (`HTTP 423`). Al autenticar, inicializar `IndexedDB`, hidratar stores locales y mostrar botón contextual de notificaciones.
  * `CU-002`: Gestión de credenciales (`administrador` habilita cuentas de barberos; `barbero` solo cambia su propia contraseña).
  * `CU-003`: Formulario de sede para `administrador` (`nombre_comercial`, `eslogan`, `direccion_fisica`, `horario_general_texto`, `dias_max_anticipacion` de 7 a 60, `estado_inicial_cita`, `politica_datos_url`).

* **Módulo 1 — Caja y Registro de Cortes (`CU-004` a `CU-008`):**
  * `CU-004` (*Walk-in*, $\le 4$ clics / $< 25\text{ s}$, `RNF-07`): Botón de acceso directo `"Registrar Corte (Walk-in)"` en la barra superior. Modal con barbero preseleccionado (si es `barbero`), selección rápida de tarjetas de servicio, **5 chips táctiles de pago colombiano** (`Efectivo`, `Transferencia bancaria`, `Tarjeta débito/crédito`, `Nequi`, `Daviplata`) y botón `"Registrar Corte"`. Tras guardar, ofrecer acción directa `"Registrar Venta de Producto"` (`<<extend>> CU-018`).
  * `CU-005` (Cierre de cita $\rightarrow$ corte 1:1): Desde el bloque de cita en la agenda, clic en `"Completar y Cobrar"`; precarga cliente, barbero y servicios instantáneos; elegir método de pago y confirmar. Solo `administrador` puede editar `precio_cobrado_cop` (activa obligatoriedad de `notas` $\ge 5$ chars, `RN-15`).
  * `CU-006` y `CU-007`: Tabla de historial diario y tarjetas KPI (`28px Inter 700 tabular-nums`) con desglose por método de pago y barbero.
  * `CU-008`: Botón destructivo (`btn-danger`) solo visible para `administrador`; exige `motivo_anulacion` $\ge 10$ chars.

* **Módulo 2 — Gestión Básica de Barberos (`CU-009` a `CU-013`):**
  * `CU-009` y `CU-010`: CRUD de perfiles con validación previa de archivo (`JPG/PNG/WebP` $\le 2\text{ MB}$). Al desactivar (`CU-010`), mostrar modal con la lista de citas futuras afectadas antes de confirmar.
  * `CU-011`: Matriz de 7 días (Lunes a Domingo) con *toggle* `"Día de descanso"` y selectores estrictos de múltiplos `:00` / `:30` (hasta 2 franjas/día).
  * `CU-012`: Modal de bloqueo puntual (día completo o rango `:00`/`:30`) con alerta si se cruza con una cita activa.
  * `CU-013`: Tabla de liquidación referencial por comisión en rango de fechas + botón `"Exportar CSV"`.

* **Módulo 3 — Catálogo de Servicios (`CU-014` y `CU-015`):**
  * `CU-014` y `CU-015`: Selector dual explícito de duración (`1 bloque (30 min)` hasta `6 bloques (180 min)`), precio entero COP (`$ 25.000 COP`), *toggle* `visible_publico` y borrado lógico (`activo`/`inactivo`). Los barberos acceden en modo solo lectura.

* **Módulo 4 — Inventario Básico (`CU-016` a `CU-019`):**
  * `CU-016`: Formulario de producto con `stock_inicial` **solo al crear**; al editar, `stock_actual` es estrictamente de solo lectura.
  * `CU-017` y `CU-018`: Modales dedicados `"Registrar Entrada"` (solo `administrador`) y `"Registrar Salida"` (`administrador` y `barbero`). En salida `venta_publico`, mostrar los 5 chips de método de pago y calcular `valor_total_cop` en vivo.
  * `CU-019` y alertas (`RN-11`): Badges semánticos (icono + texto) `Disponible`, `Stock bajo` y `Agotado`, contador *pill* `#E07A7A` sobre `#1C1C1C` en el sidebar y tabla Kardex inmutable.

* **Módulo 5 — Portal Público y Agenda Operativa (`CU-020` a `CU-025`):**
  * `CU-020` (Landing Page): Header sticky `#1C1C1C` (`64px`, borde inferior `2px solid #8B1E1E`), Hero con CTA `btn-on-dark` / `btn-accent` (`#8B1E1E`), catálogo de servicios en tarjetas `#FAF7F2`, barberos activos con avatares circulares, mapa y horarios.
  * `CU-021` y `CU-025` (Wizard 5 pasos, `max-width: 680px`, $< 90\text{ s}$): Barra de progreso superior (`#235D3A` completado, `#1F3A5F` actual, `#E8DFCE` pendiente) y barra resumen fija inferior en móvil (`#1C1C1C` con texto `#F2EBDD` mostrando duración acumulada y total COP). Pasos: (1) Servicios, (2) Barbero con `"Cualquier barbero disponible"` primero, (3) Fecha y chips de 30 min (`JetBrains Mono`), (4) Datos mínimos + checkbox Ley 1581 + *honeypot* oculto, (5) Comprobante con código `SB-XXXXXX` (`tabular-nums`) y botón copiar/descargar.
  * `CU-022`, `CU-023` y `CU-024` (Agenda Backoffice): Cuadrícula horaria con filas de **`48px` en escritorio y `56px` en dispositivos táctiles por cada bloque de 30 min** (una cita de 2 bloques ocupa `96px`/`112px`). Bloques con `border-left: 4px solid [status-text]`, `bg: [status-bg]` y badge (icono + texto). Acción `"Marcar No asistió"` habilitada solo cuando `ahora >= inicio_en + 15 min` (`RN-06`).

---

## 9. Guardrails para Antigravity (Checklist de Hacer / No Hacer)

| Área | ✅ HACER (Obligatorio) | ❌ NO HACER (Prohibido) |
| :--- | :--- | :--- |
| **UI & Design System** | Formatear moneda siempre como `$ 25.000 COP` (entero, separador de miles `.`, `tabular-nums`). Usar `#F2EBDD`, `#FFFFFF`, `#7BA3D4` o `#E07A7A` sobre `#1C1C1C`. Emparejar siempre color + icono + texto en todos los estados. Mantener áreas táctiles $\ge 44 \times 44\text{ px}$ en móvil. | Nunca poner `#1F3A5F` ni `#8B1E1E` directamente sobre `#1C1C1C` (falla WCAG AA). Prohibido neón, *glassmorphism*, gradientes morados, sombras pesadas o botones rectangulares con `border-radius: 9999px`. Nunca usar `Playfair Display` en tablas o formularios. |
| **PWA & Workbox** | Usar `InjectManifest` con librerías locales en `/lib/workbox-v7.4.1/`. Desestructurar módulos de Workbox en el nivel superior de `sw-propio.js`. Escribir `self.__WB_MANIFEST` una sola vez. Ejecutar `npx workbox-cli injectManifest workbox-config.js` tras cada cambio. | Nunca cargar Workbox desde CDN. Nunca usar `generateSW`. Nunca repetir `self.__WB_MANIFEST` en comentarios. Nunca incluir `sw-propio.js` ni `sw.js` en `globPatterns`. Nunca usar `new Notification()` ni pedir permisos Push al cargar la página. |
| **Offline & Sync** | Guardar datos dinámicos en `IndexedDB` con migraciones por tramos (`event.oldVersion`). Usar `crypto.randomUUID()` en `outbox.idCambio`. Implementar Plan B (`vaciarDesdeLaPagina` + evento `online`) para Safari/Firefox y `NotAllowedError`. | Nunca usar `localStorage` para agenda, cortes o inventario. Nunca permitir confirmar citas públicas (`CU-021`) en modo offline. Nunca borrar toda la bandeja `outbox` al final del bucle (borrar ítem por ítem confirmado). |
| **Base de Datos & Concurrencia** | Respetar los 16 nombres de tablas/columnas exactos en PostgreSQL. Usar `EXCLUDE USING GIST` (`23P01`) para citas/horarios y `SELECT ... FOR UPDATE` para stock (`RN-10`). Persistir en UTC (`TIMESTAMPTZ`) y mostrar en `America/Bogota`. | Nunca permitir editar `stock_actual` en el formulario de edición de producto. Nunca hacer `DELETE` físico de barberos, servicios, productos, citas o cortes (`RN-13`). Nunca modificar precios históricos (`RN-12`). |
| **Seguridad & Alcance** | Aplicar RBAC en servidor (`HTTP 403`), bloqueo 5 intentos / 15 min, expiración 8 h y `rate limiting` público (`HTTP 429`). Mantener `server/claves-vapid.json` en `.gitignore`. | Nunca exigir login al cliente público. Nunca exponer PII de clientes en `/api/public/*`. Nunca agregar pasarela de pagos, DIAN ni WhatsApp API. |

---

## 10. Plan de Verificación y Pruebas (DevTools, Lighthouse y Concurrencia)

Antes de dar por completado el repositorio, ejecutar y evidenciar los siguientes casos de prueba:

1. **Instalabilidad y Manifest (DevTools $\rightarrow$ Application $\rightarrow$ Manifest):** Verificar cero errores en `manifest.json` (`name`, `short_name`, `start_url`, `display: "standalone"`, `theme_color: "#1C1C1C"`, `background_color: "#F2EBDD"`, íconos `192x192` `any` y `512x512` `maskable`) y disparo de `beforeinstallprompt` en Chromium (más aviso manual en Safari/iOS).
2. **Precaché y Arranque Offline (DevTools $\rightarrow$ Application $\rightarrow$ Cache Storage / Service Workers):**
   * Confirmar que `public/sw.js` está en estado `activated` y que `workbox-precache` lista todos los archivos de `globPatterns` (excluyendo `sw-propio.js` y `sw.js`).
   * Activar `Network` $\rightarrow$ `Offline`, recargar `/index.html` y `/backoffice.html`: ambas shells deben cargar al instante desde `(ServiceWorker)` sin errores de red por CDN.
3. **Migración IndexedDB y Outbox + Background Sync:**
   * Simular base en `v1` con registros previos, subir a `v2` y confirmar conservación de datos + creación de `outbox`.
   * En modo `Offline` en Backoffice, registrar un corte *walk-in* (`CU-004`) y una salida de inventario (`CU-018`): verificar que aparecen en `outbox` con `idCambio` de 36 caracteres y que el indicador muestra `"2 cambio(s) pendiente(s)"`.
   * Volver a `Online` y disparar `sync-smartbarber` desde DevTools $\rightarrow$ `Application` $\rightarrow$ `Background Sync`: confirmar llegada a PostgreSQL y vaciado de `outbox`.
   * Reenviar el mismo `idCambio` vía `curl`/`fetch`: confirmar respuesta `{"ok": true, "duplicado": true}` sin duplicar filas en `registros_cortes`.
   * Probar Plan B en Firefox o con permiso `background-sync` bloqueado (`NotAllowedError`): confirmar sincronización automática al dispararse el evento `online`.
4. **Push API y Notificaciones (`DevTools` $\rightarrow$ `Application` $\rightarrow$ `Service Workers` $\rightarrow$ `Push`):**
   * Verificar que el permiso inicia en `default` y solo se solicita al pulsar el botón en contexto.
   * Inyectar payload JSON y texto plano en el botón *Push* de DevTools: verificar que `registration.showNotification` siempre muestra aviso, que `tag` reemplaza sin apilar y que `notificationclick` cierra la notificación y enfoca/abre la URL destino.
   * Validar en prueba de servidor que una suscripción con respuesta `410` es eliminada automáticamente de la BD.
5. **Concurrencia y Reglas de Negocio Críticas (`RN-01`, `RN-10`, `RNF-02`, `RNF-04`):**
   * **Carrera de citas (`RN-01`):** Lanzar 10 solicitudes `POST /api/public/citas` simultáneas sobre el mismo barbero, fecha y bloque horario. Resultado obligatorio: exactamente **1** `HTTP 201` (con código `SB-XXXXXX`) y **9** `HTTP 409 Conflict` (`SLOT_CONFLICT` por `23P01`), con cero solapamientos en `citas`.
   * **Carrera de inventario (`RN-10`):** Con `stock_actual = 1`, lanzar 5 salidas simultáneas de 1 unidad. Resultado obligatorio: **1** `HTTP 201` (`stock_actual = 0`, alerta `Agotado` activa) y **4** `HTTP 409` (`INSUFFICIENT_STOCK`).
   * **Latencia (`RNF-02`):** Verificar que `GET /api/public/disponibilidad` responde en $< 500\text{ ms}$ ($p_{95}$) bajo 50 consultas concurrentes.
   * **Rate Limiting (`RNF-11`):** Enviar 11 reservas en $< 15\text{ min}$ desde la misma IP y confirmar `HTTP 429` en la #11.
6. **Auditoría Lighthouse y Accesibilidad WCAG 2.1 AA (`RNF-01`, `RNF-08`):**
   * Ejecutar Lighthouse en perfil **Móvil (4G simulado)** sobre `/index.html` y perfil **Escritorio** sobre `/backoffice.html`.
   * Criterios de aprobación obligatorios: **Performance $\ge 90$** (LCP $< 2.5\text{ s}$ en Landing), **Accessibility $\ge 90$** (contraste $\ge 4.5:1$ normal y $\ge 3:1$ UI, cero estados dependientes solo del color), **Best Practices $\ge 90$** y **SEO $\ge 90$**.