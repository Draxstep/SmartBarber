# Diseño de Base de Datos Relacional (PostgreSQL v15+) — SmartBarber

**Proyecto:** SmartBarber — Sistema de Gestión Operativa y Agendamiento para Barbería  
**Motor objetivo:** PostgreSQL 15+  
**Documento fuente:** Especificación de Requerimientos de Software (ERS) v1.0 — SmartBarber  
**Convención de esquema:** Nombres en **español**, `snake_case` en minúsculas, tablas en **plural**  
**Moneda base:** Peso Colombiano (COP) — `NUMERIC(12,0)`  
**Zona horaria operativa:** `America/Bogota` (UTC-5), persistencia en UTC (`TIMESTAMPTZ`)

---

## 1. Matriz de Trazabilidad (ERS $\rightarrow$ Modelo de Datos)

La siguiente matriz vincula cada módulo, requerimiento funcional (RF), regla de negocio (RN) y requerimiento no funcional (RNF) con impacto en persistencia frente a las tablas, columnas clave y mecanismos nativos de PostgreSQL que lo soportan.

| Módulo / Categoría | ID ERS | Requerimiento / Regla de Negocio | Tablas que lo Soportan | Mecanismo Clave en PostgreSQL |
| :--- | :--- | :--- | :--- | :--- |
| **Configuración y Multi-sede** | Sec. 1.2, 2.3 | Arquitectura preparada para multi-sede y parámetros globales de reserva | `sedes` | Llave foránea `sede_id` en todas las entidades operativas; `CHECK` en ventana de días ($7$ a $60$). |
| **Seguridad y RBAC** | Sec. 2.2, RNF-09, RNF-10 | Autenticación con hash lento, roles (`Administrador`/`Barbero`), bloqueo tras 5 intentos, sesiones con expiración de 8 h y revocación inmediata | `usuarios`, `sesiones_usuarios` | `ENUM rol_usuario_enum`, `intentos_fallidos`, `bloqueado_hasta`, tabla de sesiones con `revocada_en` y `ultima_actividad_en`. |
| **Módulo 1: Registro de Cortes** | RF-COR-01, RN-09 | Registro de atención sin cita (*Walk-in*) con uno o varios servicios y 5 métodos de pago | `registros_cortes`, `registros_cortes_servicios` | `ENUM origen_corte_enum` (`walk_in`), `ENUM metodo_pago_enum`, `CHECK` `origen = 'walk_in' => cita_id IS NULL`. |
| **Módulo 1: Registro de Cortes** | RF-COR-02, RN-08 | Conversión atómica 1:1 de cita a registro de corte | `citas`, `registros_cortes`, `registros_cortes_servicios` | Índice único parcial `uq_registros_cortes_cita_activa` sobre `cita_id WHERE (cita_id IS NOT NULL AND estado = 'activo')`. |
| **Módulo 1: Registro de Cortes** | RF-COR-03, RF-COR-04 | Historial diario y resumen de ingresos por día, método de pago y barbero | `registros_cortes`, `barberos` | Índice parcial compuesto con `INCLUDE` (`idx_registros_cortes_reporte_diario`) para *Index-Only Scans*. |
| **Módulo 1: Registro de Cortes** | RF-COR-05, RN-13 | Anulación auditada de registro de corte sin borrado físico y motivo obligatorio ($\ge 10$ caracteres) | `registros_cortes`, `usuarios` | `ENUM estado_corte_enum`, `CHECK` estricto de `motivo_anulacion`, `anulado_por_usuario_id` y `anulado_en`. |
| **Módulo 1: Registro de Cortes** | RN-12, RN-15 | Inmutabilidad financiera (instantáneas) y justificación obligatoria al ajustar precio | `registros_cortes`, `registros_cortes_servicios` | Columnas `*_snapshot` y `CHECK` que exige `notas` si `precio_cobrado_cop <> precio_calculado_cop`. |
| **Módulo 2: Barberos** | RF-BAR-01, RF-BAR-02 | CRUD de perfiles, comisión referencial ($0$–$100\%$) y desactivación lógica con revocación de sesión | `barberos`, `usuarios`, `sesiones_usuarios` | `NUMERIC(5,2)` con `CHECK`, `ENUM estado_registro_enum`, `ON DELETE RESTRICT` en historial. |
| **Módulo 2: Barberos** | RF-BAR-03 | Horarios laborales recurrentes (hasta 2 franjas por día, múltiplos exactos de 30 min) y días de descanso | `horarios_barberos` | `CHECK` de minutos `:00`/`:30`, `UNIQUE (barbero_id, dia_semana, numero_franja)` y `EXCLUDE USING GIST` sobre `rango_minutos`. |
| **Módulo 2: Barberos** | RF-BAR-04 | Bloqueos puntuales de agenda (día completo o rango horario) | `bloqueos_horarios` | `TSTZRANGE` generado + `EXCLUDE USING GIST` para evitar bloqueos superpuestos activos. |
| **Módulo 2: Barberos** | RF-BAR-05 | Liquidación referencial por comisión histórica | `registros_cortes`, `barberos` | Almacenamiento de `porcentaje_comision_snapshot` y `comision_calculada_cop` por corte. |
| **Módulo 3: Servicios** | RF-SER-01, RF-SER-02, RF-SER-03 | Catálogo con duración en bloques de 30 min ($1$ a $6$), visibilidad pública y desactivación lógica | `servicios` | `CHECK (duracion_bloques BETWEEN 1 AND 6)`, índice único parcial en nombre activo por sede. |
| **Módulo 3: Servicios** | RF-SER-04, RN-12 | Preservación histórica de precios y duraciones en citas y cortes | `citas_servicios`, `registros_cortes_servicios` | Columnas `nombre_servicio_snapshot`, `precio_cop_snapshot`, `duracion_bloques_snapshot`. |
| **Módulo 4: Inventario** | RF-INV-01 | Gestión CRUD de productos, SKU único opcional y umbral mínimo | `productos_inventario` | Índice único parcial sobre `(sede_id, LOWER(TRIM(sku))) WHERE sku IS NOT NULL`. |
| **Módulo 4: Inventario** | RF-INV-02, RF-INV-03, RN-10 | Entradas/salidas atómicas de stock, prohibición absoluta de stock negativo y vínculo opcional con corte | `productos_inventario`, `movimientos_inventario` | `CHECK (stock_actual >= 0)`, `CHECK` aritmético de saldo anterior vs. resultante y obligatoriedad de `metodo_pago` en ventas. |
| **Módulo 4: Inventario** | RF-INV-04, RN-11 | Alertas visuales en tiempo real de stock bajo ($0 < S_{\text{actual}} \le S_{\text{mínimo}}$) y agotado ($S_{\text{actual}} = 0$) | `productos_inventario` | Índice parcial `WHERE (estado = 'activo' AND stock_actual <= stock_minimo)` para conteo inmediato en tablero. |
| **Módulo 4: Inventario** | RF-INV-05 | Kardex básico estrictamente inmutable | `movimientos_inventario` | Ausencia de `actualizado_en` + trigger `BEFORE UPDATE OR DELETE` que impide mutación física del Kardex. |
| **Módulo 5: Agendamiento** | RF-AGE-01 a RF-AGE-05 | Landing Page pública, selección de servicios/barbero, cálculo de disponibilidad y datos de cliente (Ley 1581) | `sedes`, `servicios`, `barberos`, `horarios_barberos`, `bloqueos_horarios`, `clientes`, `citas` | Índices parciales de lectura rápida (`estado = 'activo'`), registro de `acepto_politica_datos_en`. |
| **Módulo 5: Agendamiento** | RF-AGE-06, RN-01, RN-02, RN-03, RN-04, CU-01 FA-03 | Confirmación atómica sin solapamientos, código único `SB-XXXXXX`, asignación automática y envío de correo con hasta 3 reintentos | `citas`, `citas_servicios`, `notificaciones_correo` | `EXCLUDE USING GIST (barbero_id WITH =, rango_tiempo WITH &&) WHERE (estado IN ('pendiente', 'confirmada'))`, regex `CHECK` para código y tabla *Outbox* de correos. |
| **Módulo 5: Agendamiento** | RF-AGE-07, RF-AGE-08, RF-AGE-09, RN-05, RN-06, RN-07 | Ciclo de vida y auditoría de estados de cita, liberación inmediata de bloques y registro manual en Backoffice | `citas`, `historial_estados_citas` | Predicado parcial en `EXCLUDE` libera bloques al pasar a `cancelada`/`no_asistio`; bitácora inmutable de transiciones. |
| **Seguridad Anti-Abuso** | RN-14 | Máximo 2 citas activas el mismo día y 3 citas futuras activas por cliente | `citas`, `clientes` | Índice parcial `idx_citas_cliente_activas` + índice en `clientes (sede_id, telefono_whatsapp)`. |

---

## 2. Decisiones de Arquitectura de Datos

### 2.1 Convenciones de Nomenclatura y Consistencia Idiomática
- **Idioma único:** Todo el esquema (tablas, columnas, tipos `ENUM`, restricciones, índices, funciones y triggers) se redacta estrictamente en **español** usando `snake_case` en minúsculas. Los términos de dominio definidos explícitamente en el glosario del ERS (`walk_in`, `landing`, `backoffice`, `sku`) se conservan por fidelidad documental.
- **Pluralización:** Todas las tablas utilizan nombres en **plural** (`sedes`, `barberos`, `citas`, etc.) para denotar conjuntos de tuplas.
- **Auditoría estándar:** Las columnas de auditoría temporal equivalentes al estándar `created_at` y `updated_at` se nombran `creado_en` y `actualizado_en` para preservar el 100% de consistencia idiomática en español.
- **Nomenclatura explícita de objetos:**
  - Llaves primarias: `pk_<tabla>`
  - Llaves foráneas: `fk_<tabla>_<referenciada>` (y sufijo de rol cuando existen múltiples FKs hacia la misma tabla, por ejemplo `fk_registros_cortes_usuarios_anulacion`)
  - Restricciones de unicidad: `uq_<tabla>_<columna_o_regla>`
  - Reglas de validación: `chk_<tabla>_<regla>`
  - Restricciones de exclusión GiST: `excl_<tabla>_<regla>`
  - Índices: `idx_<tabla>_<proposito_o_columnas>`

### 2.2 Estrategia de Llaves Primarias (PK)
Se adopta **`UUID`** generado de forma nativa mediante **`gen_random_uuid()`** (disponible en el núcleo de PostgreSQL desde la versión 13 sin requerir extensiones externas como `uuid-ossp`) en todas las tablas del sistema.

**Justificación técnica:**
1. **Seguridad en el Portal Público (Landing Page):** Evita la exposición de identificadores secuenciales predecibles (`1, 2, 3...`) en endpoints públicos (servicios, barberos, citas), mitigando ataques de enumeración de recursos (IDOR) y filtración de volumen de ventas/reservas a competidores.
2. **Escalabilidad multi-sede futura:** Permite consolidar, replicar o migrar sedes independientes sin colisiones de secuencias globales.
3. **Generación desacoplada:** Facilita la creación de llaves desde la capa de aplicación o base de datos en transacciones distribuidas y patrones *Outbox* (`notificaciones_correo`).

### 2.3 Tipos de Datos Monetarios, Temporales y de Texto
- **Valores monetarios (`NUMERIC(12,0)`):** En estricto cumplimiento de la regla de negocio del ERS (COP sin centavos) y la prohibición de tipos de punto flotante (`FLOAT`, `REAL`, `DOUBLE PRECISION`), se utiliza `NUMERIC(12,0)`. Esto garantiza aritmética decimal exacta, soporta montos hasta $\$999.999.999.999\text{ COP}$ y evita discrepancias de redondeo en cierres de caja. Los porcentajes de comisión utilizan `NUMERIC(5,2)`.
- **Manejo de zonas horarias (RNF-15):**
  - Todo instante de tiempo, cita, bloqueo o auditoría se almacena en **`TIMESTAMPTZ`** (persistido internamente en UTC por PostgreSQL y renderizado en `America/Bogota` según `sedes.zona_horaria`).
  - Las fechas calendario operativas (como `citas.fecha` y `bloqueos_horarios.fecha`) se almacenan en **`DATE`** para indexación eficiente de la agenda diaria y validación de límites diarios (RN-14) sin depender de conversiones de zona horaria en cláusulas `WHERE`.
  - Las plantillas horarias recurrentes (`horarios_barberos`) usan **`TIME`** (`WITHOUT TIME ZONE`), pues representan horarios locales de pared (ej. `09:00` a `13:00`).
- **Textos:** Se utiliza `VARCHAR(n)` cuando el ERS impone un límite explícito de negocio (ej. `biografia_breve VARCHAR(200)`, `notas VARCHAR(300)`, `nombre VARCHAR(80)`) y `TEXT` para campos de longitud variable sin límite funcional rígido (URLs, hashes criptográficos, mensajes de error).
- **Tipos `ENUM` vs. `CHECK` vs. Tablas Catálogo:**
  - Se utilizan tipos **`ENUM`** nativos de PostgreSQL para dominios cerrados y estables gobernados por la lógica del negocio (`rol_usuario_enum`, `estado_cita_enum`, `metodo_pago_enum`, `tipo_movimiento_inventario_enum`, `subtipo_movimiento_inventario_enum`, `estado_registro_enum`, `origen_cita_enum`, `origen_corte_enum`, `estado_corte_enum`, `estado_notificacion_enum`). Aportan validación estricta, almacenamiento compacto (4 bytes) y autodocumentación del esquema.
  - Para `productos_inventario.categoria` se utiliza **`VARCHAR(60)`** con `CHECK` de longitud mínima en lugar de `ENUM`, ya que el ERS define las categorías como ejemplos abiertos que el negocio puede ampliar dinámicamente sin ejecutar migraciones DDL.

### 2.4 Normalización y Desnormalización Controlada (Inmutabilidad Histórica)
El modelo cumple estrictamente con la **Tercera Forma Normal (3FN)**: cada atributo no clave depende únicamente de la llave primaria completa y no existen dependencias transitivas. Se aplican exactamente **tres (3) desnormalizaciones controladas**, todas exigidas por reglas de negocio del ERS y justificadas a continuación:

1. **Instantáneas (*Snapshots*) de servicios y comisiones (RN-12, RF-SER-04):** Las tablas `citas_servicios` y `registros_cortes_servicios` duplican `nombre_servicio_snapshot`, `precio_cop_snapshot` (y `duracion_bloques_snapshot` en citas). Asimismo, `registros_cortes` almacena `porcentaje_comision_snapshot`, `comision_calculada_cop` y `precio_calculado_cop`. **Justificación:** garantiza que modificar el precio, nombre o duración de un servicio en el catálogo o cambiar la comisión de un barbero jamás altere citas previamente confirmadas ni reportes financieros históricos.
2. **Existencia materializada en `productos_inventario.stock_actual` (RF-INV-01 a RF-INV-04):** Aunque el saldo podría calcularse sumando `movimientos_inventario`, mantener `stock_actual` sincronizado atómicamente dentro de la misma transacción ACID (con bloqueo `SELECT ... FOR UPDATE` sobre la fila del producto) permite aplicar `CHECK (stock_actual >= 0)` a nivel de motor (RN-10) y alimentar el índice parcial de alertas de stock bajo en tiempo constante ($O(1)$).
3. **Proyección de fecha/hora local junto a `TIMESTAMPTZ` en `citas` y `bloqueos_horarios`:** `citas` almacena `fecha`, `hora_inicio`, `hora_fin` junto con `inicio_en`, `fin_en` y la columna generada `rango_tiempo` (`TSTZRANGE`). **Justificación:** `rango_tiempo` habilita la restricción GiST exacta en UTC para control de concurrencia (RN-01), mientras `fecha` permite agrupar y filtrar agendas locales en `America/Bogota` sin funciones no indexables sobre `TIMESTAMPTZ` (evitando desfaces alrededor de las 19:00–00:00 UTC-5).

### 2.5 Política de Borrado Lógico vs. Físico
En estricto cumplimiento de **RN-13** y **RF-COR-05**:
- **Borrado lógico obligatorio (sin eliminación física):**
  - `sedes`, `usuarios`, `barberos`, `servicios`, `productos_inventario`: columna `estado` (`activo` | `inactivo`). Desactivar retira la entidad de nuevas operaciones y de la Landing Page conservando intacta la integridad referencial histórica.
  - `registros_cortes`: columna `estado` (`activo` | `anulado`) con motivo obligatorio, usuario responsable y marca de tiempo.
  - `citas`: columna `estado` (`cancelada` | `no_asistio`), sin eliminación física.
  - `bloqueos_horarios`: columna `activo` (`BOOLEAN`) para conservar trazabilidad de bloqueos levantados o cancelados.
- **Registros estrictamente inmutables (Append-Only):**
  - `movimientos_inventario` (Kardex — RF-INV-05) y `historial_estados_citas` (RF-AGE-07): protegidos mediante trigger contra `UPDATE` y `DELETE`.
- **Depuración física controlada:**
  - Únicamente `sesiones_usuarios` expiradas/revocadas antiguas o `horarios_barberos` al reemplazar la plantilla semanal de un barbero pueden depurarse físicamente sin afectar trazabilidad contable.

### 2.6 Control de Concurrencia para Reservas Simultáneas e Inventario
1. **Prevención de doble reserva (RN-01, RNF-04):** Se implementa una restricción nativa **`EXCLUDE USING GIST`** en `citas` sobre `(barbero_id WITH =, rango_tiempo WITH &&) WHERE (estado IN ('pendiente', 'confirmada'))` apoyada en la extensión `btree_gist` y rangos semiabiertos `[inicio_en, fin_en)`.
   - Los rangos semiabiertos `[)` garantizan que citas contiguas (ej. `09:00–09:30` y `09:30–10:00`) **no** colisionen.
   - Si dos clientes intentan reservar el mismo bloque en paralelo, PostgreSQL arbitra el conflicto a nivel de índice GiST dentro de la transacción ACID: exactamente una transacción hace `COMMIT` y la segunda recibe el error `23P01` (`exclusion_violation`), que la API traduce en el flujo alternativo FA-01 de CU-01.
   - Cuando una cita pasa a `cancelada` o `no_asistio`, sale automáticamente del predicado `WHERE` de la restricción, liberando el cupo de forma inmediata (RN-05, RN-06).
   - Para la opción *"Cualquier barbero disponible"* (RN-04), la transacción ordena los barberos elegibles según su conteo de bloques ocupados ese día (menor carga primero, desempate alfabético) e intenta la inserción; ante `23P01`, reintenta con el siguiente barbero elegible antes de devolver conflicto.
2. **Protección de stock concurrente (RN-10):** Toda salida de inventario debe adquirir un bloqueo pesimista a nivel de fila (`SELECT stock_actual FROM productos_inventario WHERE producto_id = $1 FOR UPDATE`) antes de validar $S_{\text{actual}} - Q_{\text{salida}} \ge 0$, actualizar `stock_actual` e insertar el movimiento inmutable en `movimientos_inventario`. El `CHECK (stock_actual >= 0)` actúa como última línea de defensa infranqueable.

### 2.7 Supuestos Técnicos Asumidos
Para cerrar vacíos operativos detectados en el ERS y asegurar un diseño 100% implementable en producción, se asumen las siguientes decisiones técnicas:
1. **Gestión persistente de sesiones (`sesiones_usuarios`):** El ERS exige expiración por inactividad tras 8 horas (RNF-10) y revocación inmediata de sesiones al desactivar un barbero (RF-BAR-02), sin modelar una tabla de sesiones en la Sección 6. Se incorpora `sesiones_usuarios` con `token_hash` para soportar revocación instantánea y control de inactividad en servidor.
2. **Auditoría de transiciones de citas (`historial_estados_citas`):** RF-AGE-07 exige registrar la auditoría de cada cambio de estado de cita (RN-07). Se incorpora esta tabla inmutable para preservar el rastro completo de quién y cuándo movió cada cita.
3. **Patrón *Transactional Outbox* para correos (`notificaciones_correo`):** RF-AGE-06 y CU-01 FA-03 exigen envío asíncrono de confirmación por correo y hasta 3 reintentos automáticos en caso de fallo del proveedor. Se añade esta tabla para desacoplar la transacción de reserva del servicio SMTP/API externo y garantizar entrega confiable.
4. **Correo en `barberos` independiente del acceso opcional:** Dado que RF-BAR-01 marca el correo como obligatorio y único en la ficha del barbero mientras el modelo conceptual permite `usuario_id` opcional (barbero sin acceso habilitado aún al Backoffice), se incluye `correo` en `barberos` (único) y se sincroniza con `usuarios.correo` cuando el usuario es habilitado.
5. **Restricción de unicidad de servicio por cita/corte:** Se asume que un mismo `servicio_id` se selecciona una sola vez por cita (`uq_citas_servicios_cita_servicio`) o por registro de corte (`uq_registros_cortes_servicios_corte_servicio`), alineado con la lista de selección múltiple descrita en RF-AGE-02 y RF-COR-01.
6. **Validación de la máquina de estados (RN-07) y límite anti-abuso (RN-14):** La máquina de estados de citas y el tope de $2$ citas/día y $3$ citas futuras activas por cliente se aplican en la capa transaccional de negocio respaldados por índices parciales dedicados (`idx_citas_cliente_activas`) y la auditoría en `historial_estados_citas`.

---

## 3. Diagrama Entidad-Relación (DER)
D2 playground 

direction: right

# ============================================================================
# SMARTBARBER — DIAGRAMA ENTIDAD-RELACIÓN (POSTGRESQL 15+)
# Motor recomendado en D2 Playground: ELK
# ============================================================================

# ----------------------------------------------------------------------------
# 1. NÚCLEO, MULTI-SEDE Y SEGURIDAD (RBAC)
# ----------------------------------------------------------------------------
core: "Núcleo y Seguridad" {
  style.fill: "#F8FAFC"
  style.stroke: "#94A3B8"

  sedes: {
    shape: sql_table
    style.fill: "#1E3A5F"
    sede_id: uuid {constraint: primary_key}
    nombre_comercial: "varchar(120)"
    eslogan: "varchar(200)"
    logo_url: text
    direccion_fisica: "varchar(250)"
    enlace_mapa_url: text
    telefono_contacto: "varchar(20)"
    correo_contacto: "varchar(150)"
    horario_general_texto: text
    zona_horaria: "varchar(50)"
    dias_max_anticipacion: smallint
    minutos_min_anticipacion: smallint
    estado_inicial_cita: estado_cita_enum
    politica_datos_url: text
    estado: estado_registro_enum
    creado_en: timestamptz
    actualizado_en: timestamptz
  }

  usuarios: {
    shape: sql_table
    style.fill: "#1E3A5F"
    usuario_id: uuid {constraint: primary_key}
    sede_id: uuid {constraint: foreign_key}
    correo: "varchar(150)" {constraint: unique}
    contrasena_hash: text
    rol: rol_usuario_enum
    estado: estado_registro_enum
    intentos_fallidos: smallint
    bloqueado_hasta: timestamptz
    ultimo_acceso_en: timestamptz
    creado_en: timestamptz
    actualizado_en: timestamptz
  }

  sesiones_usuarios: {
    shape: sql_table
    style.fill: "#1E3A5F"
    sesion_id: uuid {constraint: primary_key}
    usuario_id: uuid {constraint: foreign_key}
    token_hash: text {constraint: unique}
    direccion_ip: inet
    agente_usuario: text
    ultima_actividad_en: timestamptz
    expira_en: timestamptz
    revocada_en: timestamptz
    creado_en: timestamptz
  }
}

# ----------------------------------------------------------------------------
# 2. PERSONAL, CATÁLOGO Y CLIENTES
# ----------------------------------------------------------------------------
operacion: "Barberos, Servicios y Clientes" {
  style.fill: "#F0FDFA"
  style.stroke: "#5EEAD4"

  barberos: {
    shape: sql_table
    style.fill: "#0F766E"
    barbero_id: uuid {constraint: primary_key}
    sede_id: uuid {constraint: foreign_key}
    usuario_id: uuid {constraint: [foreign_key; unique]}
    nombre_completo: "varchar(120)"
    nombre_publico: "varchar(80)"
    telefono: "varchar(20)"
    correo: "varchar(150)" {constraint: unique}
    foto_url: text
    biografia_breve: "varchar(200)"
    porcentaje_comision: "numeric(5,2)"
    estado: estado_registro_enum
    creado_en: timestamptz
    actualizado_en: timestamptz
  }

  horarios_barberos: {
    shape: sql_table
    style.fill: "#0F766E"
    horario_id: uuid {constraint: primary_key}
    barbero_id: uuid {constraint: [foreign_key; unique]}
    dia_semana: smallint {constraint: unique}
    numero_franja: smallint {constraint: unique}
    es_descanso: boolean
    hora_inicio: time
    hora_fin: time
    rango_minutos: int4range
    creado_en: timestamptz
    actualizado_en: timestamptz
  }

  bloqueos_horarios: {
    shape: sql_table
    style.fill: "#0F766E"
    bloqueo_id: uuid {constraint: primary_key}
    sede_id: uuid {constraint: foreign_key}
    barbero_id: uuid {constraint: foreign_key}
    fecha: date
    dia_completo: boolean
    hora_inicio: time
    hora_fin: time
    inicio_en: timestamptz
    fin_en: timestamptz
    rango_tiempo: tstzrange
    motivo: "varchar(200)"
    activo: boolean
    creado_por_usuario_id: uuid {constraint: foreign_key}
    creado_en: timestamptz
    actualizado_en: timestamptz
  }

  servicios: {
    shape: sql_table
    style.fill: "#0F766E"
    servicio_id: uuid {constraint: primary_key}
    sede_id: uuid {constraint: foreign_key}
    nombre: "varchar(80)" {constraint: unique}
    descripcion_breve: "varchar(250)"
    precio_cop: "numeric(12,0)"
    duracion_bloques: smallint
    visible_publico: boolean
    estado: estado_registro_enum
    orden_visual: smallint
    creado_en: timestamptz
    actualizado_en: timestamptz
  }

  clientes: {
    shape: sql_table
    style.fill: "#0F766E"
    cliente_id: uuid {constraint: primary_key}
    sede_id: uuid {constraint: [foreign_key; unique]}
    nombre_completo: "varchar(100)"
    telefono_whatsapp: "varchar(20)"
    correo: "varchar(150)" {constraint: unique}
    acepto_politica_datos_en: timestamptz
    creado_en: timestamptz
    actualizado_en: timestamptz
  }
}

# ----------------------------------------------------------------------------
# 3. AGENDAMIENTO, AUDITORÍA Y NOTIFICACIONES
# ----------------------------------------------------------------------------
agendamiento: "Agendamiento y Notificaciones" {
  style.fill: "#EFF6FF"
  style.stroke: "#93C5FD"

  citas: {
    shape: sql_table
    style.fill: "#1D4ED8"
    cita_id: uuid {constraint: primary_key}
    sede_id: uuid {constraint: foreign_key}
    codigo_reserva: "varchar(12)" {constraint: unique}
    cliente_id: uuid {constraint: foreign_key}
    barbero_id: uuid {constraint: foreign_key}
    barbero_asignado_automaticamente: boolean
    fecha: date
    hora_inicio: time
    hora_fin: time
    inicio_en: timestamptz
    fin_en: timestamptz
    rango_tiempo: tstzrange
    bloques_totales: smallint
    precio_estimado_cop: "numeric(12,0)"
    estado: estado_cita_enum
    notas_cliente: "varchar(200)"
    motivo_cancelacion: "varchar(250)"
    origen: origen_cita_enum
    creado_por_usuario_id: uuid {constraint: foreign_key}
    creado_en: timestamptz
    actualizado_en: timestamptz
  }

  citas_servicios: {
    shape: sql_table
    style.fill: "#1D4ED8"
    cita_servicio_id: uuid {constraint: primary_key}
    cita_id: uuid {constraint: [foreign_key; unique]}
    servicio_id: uuid {constraint: [foreign_key; unique]}
    nombre_servicio_snapshot: "varchar(80)"
    precio_cop_snapshot: "numeric(12,0)"
    duracion_bloques_snapshot: smallint
    creado_en: timestamptz
  }

  historial_estados_citas: {
    shape: sql_table
    style.fill: "#1D4ED8"
    historial_id: uuid {constraint: primary_key}
    cita_id: uuid {constraint: foreign_key}
    estado_anterior: estado_cita_enum
    estado_nuevo: estado_cita_enum
    observacion: "varchar(250)"
    cambiado_por_usuario_id: uuid {constraint: foreign_key}
    cambiado_en: timestamptz
  }

  notificaciones_correo: {
    shape: sql_table
    style.fill: "#1D4ED8"
    notificacion_id: uuid {constraint: primary_key}
    sede_id: uuid {constraint: foreign_key}
    cita_id: uuid {constraint: foreign_key}
    correo_destino: "varchar(150)"
    asunto: "varchar(200)"
    estado: estado_notificacion_enum
    intentos: smallint
    ultimo_error: text
    proximo_reintento_en: timestamptz
    enviada_en: timestamptz
    creado_en: timestamptz
    actualizado_en: timestamptz
  }
}

# ----------------------------------------------------------------------------
# 4. REGISTRO DE CORTES (CAJA)
# ----------------------------------------------------------------------------
caja: "Caja y Registro de Cortes" {
  style.fill: "#FFFBEB"
  style.stroke: "#FCD34D"

  registros_cortes: {
    shape: sql_table
    style.fill: "#B45309"
    registro_corte_id: uuid {constraint: primary_key}
    sede_id: uuid {constraint: foreign_key}
    cita_id: uuid {constraint: foreign_key}
    barbero_id: uuid {constraint: foreign_key}
    cliente_id: uuid {constraint: foreign_key}
    nombre_cliente_referencial: "varchar(100)"
    origen: origen_corte_enum
    fecha_hora_atencion: timestamptz
    precio_calculado_cop: "numeric(12,0)"
    precio_cobrado_cop: "numeric(12,0)"
    metodo_pago: metodo_pago_enum
    porcentaje_comision_snapshot: "numeric(5,2)"
    comision_calculada_cop: "numeric(12,0)"
    notas: "varchar(300)"
    estado: estado_corte_enum
    motivo_anulacion: "varchar(250)"
    anulado_por_usuario_id: uuid {constraint: foreign_key}
    anulado_en: timestamptz
    registrado_por_usuario_id: uuid {constraint: foreign_key}
    creado_en: timestamptz
    actualizado_en: timestamptz
  }

  registros_cortes_servicios: {
    shape: sql_table
    style.fill: "#B45309"
    registro_corte_servicio_id: uuid {constraint: primary_key}
    registro_corte_id: uuid {constraint: [foreign_key; unique]}
    servicio_id: uuid {constraint: [foreign_key; unique]}
    nombre_servicio_snapshot: "varchar(80)"
    precio_cop_snapshot: "numeric(12,0)"
    creado_en: timestamptz
  }
}

# ----------------------------------------------------------------------------
# 5. INVENTARIO Y KARDEX
# ----------------------------------------------------------------------------
inventario: "Inventario y Kardex" {
  style.fill: "#F0FDF4"
  style.stroke: "#86EFAC"

  productos_inventario: {
    shape: sql_table
    style.fill: "#15803D"
    producto_id: uuid {constraint: primary_key}
    sede_id: uuid {constraint: foreign_key}
    sku: "varchar(50)" {constraint: unique}
    nombre: "varchar(100)"
    categoria: "varchar(60)"
    precio_venta_cop: "numeric(12,0)"
    costo_unitario_cop: "numeric(12,0)"
    stock_actual: integer
    stock_minimo: integer
    estado: estado_registro_enum
    creado_en: timestamptz
    actualizado_en: timestamptz
  }

  movimientos_inventario: {
    shape: sql_table
    style.fill: "#15803D"
    movimiento_id: uuid {constraint: primary_key}
    sede_id: uuid {constraint: foreign_key}
    producto_id: uuid {constraint: foreign_key}
    tipo: tipo_movimiento_inventario_enum
    subtipo: subtipo_movimiento_inventario_enum
    cantidad: integer
    stock_anterior: integer
    stock_resultante: integer
    costo_unitario_cop: "numeric(12,0)"
    precio_unitario_cop: "numeric(12,0)"
    valor_total_cop: "numeric(12,0)"
    metodo_pago: metodo_pago_enum
    registro_corte_id: uuid {constraint: foreign_key}
    observacion: "varchar(200)"
    usuario_id: uuid {constraint: foreign_key}
    creado_en: timestamptz
  }
}

# ============================================================================
# RELACIONES E INTEGRIDAD REFERENCIAL (33 LLAVES FORÁNEAS)
# ============================================================================

# --- Dependencias de SEDES ---
core.usuarios.sede_id -> core.sedes.sede_id: "pertenece" {
  source-arrowhead.shape: cf-many
  target-arrowhead.shape: cf-one-required
}
operacion.barberos.sede_id -> core.sedes.sede_id: "emplea" {
  source-arrowhead.shape: cf-many
  target-arrowhead.shape: cf-one-required
}
operacion.bloqueos_horarios.sede_id -> core.sedes.sede_id: "contiene" {
  source-arrowhead.shape: cf-many
  target-arrowhead.shape: cf-one-required
}
operacion.servicios.sede_id -> core.sedes.sede_id: "ofrece" {
  source-arrowhead.shape: cf-many
  target-arrowhead.shape: cf-one-required
}
operacion.clientes.sede_id -> core.sedes.sede_id: "registra" {
  source-arrowhead.shape: cf-many
  target-arrowhead.shape: cf-one-required
}
agendamiento.citas.sede_id -> core.sedes.sede_id: "gestiona" {
  source-arrowhead.shape: cf-many
  target-arrowhead.shape: cf-one-required
}
agendamiento.notificaciones_correo.sede_id -> core.sedes.sede_id: "despacha" {
  source-arrowhead.shape: cf-many
  target-arrowhead.shape: cf-one-required
}
caja.registros_cortes.sede_id -> core.sedes.sede_id: "consolida" {
  source-arrowhead.shape: cf-many
  target-arrowhead.shape: cf-one-required
}
inventario.productos_inventario.sede_id -> core.sedes.sede_id: "almacena" {
  source-arrowhead.shape: cf-many
  target-arrowhead.shape: cf-one-required
}
inventario.movimientos_inventario.sede_id -> core.sedes.sede_id: "controla" {
  source-arrowhead.shape: cf-many
  target-arrowhead.shape: cf-one-required
}

# --- Dependencias de USUARIOS ---
core.sesiones_usuarios.usuario_id -> core.usuarios.usuario_id: "mantiene (CASCADE)" {
  source-arrowhead.shape: cf-many
  target-arrowhead.shape: cf-one-required
}
operacion.barberos.usuario_id -> core.usuarios.usuario_id: "acceso opcional (0..1:1)" {
  source-arrowhead.shape: cf-one
  target-arrowhead.shape: cf-one
}
operacion.bloqueos_horarios.creado_por_usuario_id -> core.usuarios.usuario_id: "crea" {
  source-arrowhead.shape: cf-many
  target-arrowhead.shape: cf-one-required
}
agendamiento.citas.creado_por_usuario_id -> core.usuarios.usuario_id: "registra manual" {
  source-arrowhead.shape: cf-many
  target-arrowhead.shape: cf-one
}
agendamiento.historial_estados_citas.cambiado_por_usuario_id -> core.usuarios.usuario_id: "ejecuta cambio" {
  source-arrowhead.shape: cf-many
  target-arrowhead.shape: cf-one
}
caja.registros_cortes.registrado_por_usuario_id -> core.usuarios.usuario_id: "registra" {
  source-arrowhead.shape: cf-many
  target-arrowhead.shape: cf-one-required
}
caja.registros_cortes.anulado_por_usuario_id -> core.usuarios.usuario_id: "anula" {
  source-arrowhead.shape: cf-many
  target-arrowhead.shape: cf-one
}
inventario.movimientos_inventario.usuario_id -> core.usuarios.usuario_id: "responsable" {
  source-arrowhead.shape: cf-many
  target-arrowhead.shape: cf-one-required
}

# --- Dependencias de BARBEROS ---
operacion.horarios_barberos.barbero_id -> operacion.barberos.barbero_id: "plantilla (CASCADE)" {
  source-arrowhead.shape: cf-many
  target-arrowhead.shape: cf-one-required
}
operacion.bloqueos_horarios.barbero_id -> operacion.barberos.barbero_id: "bloquea" {
  source-arrowhead.shape: cf-many
  target-arrowhead.shape: cf-one-required
}
agendamiento.citas.barbero_id -> operacion.barberos.barbero_id: "atiende" {
  source-arrowhead.shape: cf-many
  target-arrowhead.shape: cf-one-required
}
caja.registros_cortes.barbero_id -> operacion.barberos.barbero_id: "ejecuta" {
  source-arrowhead.shape: cf-many
  target-arrowhead.shape: cf-one-required
}

# --- Dependencias de CLIENTES ---
agendamiento.citas.cliente_id -> operacion.clientes.cliente_id: "reserva" {
  source-arrowhead.shape: cf-many
  target-arrowhead.shape: cf-one-required
}
caja.registros_cortes.cliente_id -> operacion.clientes.cliente_id: "recibe atención" {
  source-arrowhead.shape: cf-many
  target-arrowhead.shape: cf-one
}

# --- Dependencias de CITAS y SERVICIOS ---
agendamiento.citas_servicios.cita_id -> agendamiento.citas.cita_id: "incluye" {
  source-arrowhead.shape: cf-many-required
  target-arrowhead.shape: cf-one-required
}
agendamiento.citas_servicios.servicio_id -> operacion.servicios.servicio_id: "snapshot" {
  source-arrowhead.shape: cf-many
  target-arrowhead.shape: cf-one-required
}
agendamiento.historial_estados_citas.cita_id -> agendamiento.citas.cita_id: "audita" {
  source-arrowhead.shape: cf-many
  target-arrowhead.shape: cf-one-required
}
agendamiento.notificaciones_correo.cita_id -> agendamiento.citas.cita_id: "notifica" {
  source-arrowhead.shape: cf-many
  target-arrowhead.shape: cf-one-required
}
caja.registros_cortes.cita_id -> agendamiento.citas.cita_id: "1:1 activo (RN-08)" {
  source-arrowhead.shape: cf-many
  target-arrowhead.shape: cf-one
}

# --- Dependencias de CAJA e INVENTARIO ---
caja.registros_cortes_servicios.registro_corte_id -> caja.registros_cortes.registro_corte_id: "detalla" {
  source-arrowhead.shape: cf-many-required
  target-arrowhead.shape: cf-one-required
}
caja.registros_cortes_servicios.servicio_id -> operacion.servicios.servicio_id: "aplicado" {
  source-arrowhead.shape: cf-many
  target-arrowhead.shape: cf-one-required
}
inventario.movimientos_inventario.producto_id -> inventario.productos_inventario.producto_id: "kardex" {
  source-arrowhead.shape: cf-many
  target-arrowhead.shape: cf-one-required
}
inventario.movimientos_inventario.registro_corte_id -> caja.registros_cortes.registro_corte_id: "venta/consumo opcional" {
  source-arrowhead.shape: cf-many
  target-arrowhead.shape: cf-one
}


---

## 4. Diccionario de Datos Detallado

### 4.1 Tabla: `sedes`
- **Propósito:** Almacenar la identidad pública, datos de contacto y parámetros operativos globales de la barbería (una única sede activa en MVP v1.0, preparada para escalar a multi-sede).
- **Dependencias principales:** Tabla raíz (no depende de ninguna otra tabla).

| Columna | Tipo PostgreSQL | Llave (PK/FK/UK) | Nulo | Valor por Defecto | Restricciones (CHECK/Reglas) | Descripción |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `sede_id` | `UUID` | PK | NO | `gen_random_uuid()` | — | Identificador único de la sede. |
| `nombre_comercial` | `VARCHAR(120)` | — | NO | — | `char_length(TRIM(nombre_comercial)) >= 2` | Nombre comercial visible en Landing Page y correos. |
| `eslogan` | `VARCHAR(200)` | — | SÍ | `NULL` | — | Frase promocional mostrada en el encabezado público. |
| `logo_url` | `TEXT` | — | SÍ | `NULL` | — | URL del logotipo de la barbería. |
| `direccion_fisica` | `VARCHAR(250)` | — | NO | — | `char_length(TRIM(direccion_fisica)) >= 5` | Dirección física del establecimiento. |
| `enlace_mapa_url` | `TEXT` | — | SÍ | `NULL` | — | Enlace externo a mapa geográfico (ej. Google Maps). |
| `telefono_contacto` | `VARCHAR(20)` | — | NO | — | `char_length(TRIM(telefono_contacto)) >= 7` | Teléfono/WhatsApp comercial de atención. |
| `correo_contacto` | `VARCHAR(150)` | — | NO | — | `correo_contacto = LOWER(TRIM(correo_contacto))` | Correo electrónico público de contacto de la sede. |
| `horario_general_texto` | `TEXT` | — | NO | — | `char_length(TRIM(horario_general_texto)) >= 5` | Texto informativo de horarios generales para la Landing Page. |
| `zona_horaria` | `VARCHAR(50)` | — | NO | `'America/Bogota'` | — | Identificador IANA de zona horaria operativa (RNF-15). |
| `dias_max_anticipacion` | `SMALLINT` | — | NO | `30` | `BETWEEN 7 AND 60` | Horizonte máximo de reserva anticipada en días calendario (RN-03). |
| `minutos_min_anticipacion` | `SMALLINT` | — | NO | `30` | `>= 0 AND <= 1440` | Margen mínimo en minutos antes del inicio de cita (RN-03). |
| `estado_inicial_cita` | `estado_cita_enum` | — | NO | `'pendiente'` | `IN ('pendiente', 'confirmada')` | Estado asignado al confirmar una reserva desde la Landing Page (RF-AGE-06). |
| `politica_datos_url` | `TEXT` | — | NO | — | `char_length(TRIM(politica_datos_url)) >= 10` | Enlace a la política de tratamiento de datos personales (Ley 1581 de 2012). |
| `estado` | `estado_registro_enum` | — | NO | `'activo'` | — | Estado lógico de la sede (`activo` / `inactivo`). |
| `creado_en` | `TIMESTAMPTZ` | — | NO | `NOW()` | — | Fecha y hora UTC de creación del registro. |
| `actualizado_en` | `TIMESTAMPTZ` | — | NO | `NOW()` | Actualizado por trigger | Fecha y hora UTC de última modificación. |

---

### 4.2 Tabla: `usuarios`
- **Propósito:** Gestionar credenciales autenticadas, roles RBAC y protección contra fuerza bruta para el acceso al Backoffice (Administrador y Barbero).
- **Dependencias principales:** Depende de `sedes`.

| Columna | Tipo PostgreSQL | Llave (PK/FK/UK) | Nulo | Valor por Defecto | Restricciones (CHECK/Reglas) | Descripción |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `usuario_id` | `UUID` | PK | NO | `gen_random_uuid()` | — | Identificador único de la cuenta de usuario. |
| `sede_id` | `UUID` | FK | NO | — | Referencia `sedes(sede_id)` | Sede a la que pertenece la cuenta. |
| `correo` | `VARCHAR(150)` | UK | NO | — | `correo = LOWER(TRIM(correo))` | Correo electrónico único de acceso al Backoffice. |
| `contrasena_hash` | `TEXT` | — | NO | — | `char_length(contrasena_hash) >= 50` | Hash criptográfico lento con sal (Argon2id o bcrypt $\ge 10$, RNF-09). |
| `rol` | `rol_usuario_enum` | — | NO | — | — | Rol RBAC asignado (`administrador` o `barbero`). |
| `estado` | `estado_registro_enum` | — | NO | `'activo'` | — | Estado lógico de la cuenta (`activo` / `inactivo`). |
| `intentos_fallidos` | `SMALLINT` | — | NO | `0` | `>= 0` | Contador consecutivo de accesos fallidos (bloqueo al llegar a 5, RNF-10). |
| `bloqueado_hasta` | `TIMESTAMPTZ` | — | SÍ | `NULL` | — | Marca temporal UTC hasta la cual la cuenta permanece bloqueada (15 min). |
| `ultimo_acceso_en` | `TIMESTAMPTZ` | — | SÍ | `NULL` | — | Última autenticación exitosa registrada. |
| `creado_en` | `TIMESTAMPTZ` | — | NO | `NOW()` | — | Marca temporal UTC de creación. |
| `actualizado_en` | `TIMESTAMPTZ` | — | NO | `NOW()` | Actualizado por trigger | Marca temporal UTC de última modificación. |

---

### 4.3 Tabla: `sesiones_usuarios`
- **Propósito:** Controlar sesiones activas del Backoffice para aplicar expiración por inactividad de 8 horas (RNF-10) y revocación inmediata al desactivar un barbero (RF-BAR-02).
- **Dependencias principales:** Depende de `usuarios`.

| Columna | Tipo PostgreSQL | Llave (PK/FK/UK) | Nulo | Valor por Defecto | Restricciones (CHECK/Reglas) | Descripción |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `sesion_id` | `UUID` | PK | NO | `gen_random_uuid()` | — | Identificador único de la sesión. |
| `usuario_id` | `UUID` | FK | NO | — | Referencia `usuarios(usuario_id)` | Usuario propietario de la sesión. |
| `token_hash` | `TEXT` | UK | NO | — | `char_length(token_hash) >= 32` | Hash SHA-256 del token de sesión/refresh almacenado de forma segura. |
| `direccion_ip` | `INET` | — | SÍ | `NULL` | — | Dirección IP de origen de la sesión. |
| `agente_usuario` | `TEXT` | — | SÍ | `NULL` | — | Cabecera *User-Agent* del navegador. |
| `ultima_actividad_en` | `TIMESTAMPTZ` | — | NO | `NOW()` | — | Marca temporal de la última solicitud autenticada (control de inactividad de 8 h). |
| `expira_en` | `TIMESTAMPTZ` | — | NO | — | `expira_en > creado_en` | Fecha y hora límite absoluta de validez de la sesión. |
| `revocada_en` | `TIMESTAMPTZ` | — | SÍ | `NULL` | — | Fecha y hora de revocación manual, cierre de sesión o desactivación de cuenta. |
| `creado_en` | `TIMESTAMPTZ` | — | NO | `NOW()` | — | Marca temporal UTC de inicio de sesión. |

---

### 4.4 Tabla: `barberos`
- **Propósito:** Almacenar el perfil operativo y público de cada barbero de la sede, su comisión referencial y su vínculo opcional 1:1 con una cuenta de `usuarios`.
- **Dependencias principales:** Depende de `sedes` y opcionalmente de `usuarios`.

| Columna | Tipo PostgreSQL | Llave (PK/FK/UK) | Nulo | Valor por Defecto | Restricciones (CHECK/Reglas) | Descripción |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `barbero_id` | `UUID` | PK | NO | `gen_random_uuid()` | — | Identificador único del barbero. |
| `sede_id` | `UUID` | FK | NO | — | Referencia `sedes(sede_id)` | Sede en la que opera el barbero. |
| `usuario_id` | `UUID` | FK, UK | SÍ | `NULL` | Referencia `usuarios(usuario_id)` | Cuenta de acceso al Backoffice vinculada (única cuando no es nula; permite que un Administrador también sea barbero). |
| `nombre_completo` | `VARCHAR(120)` | — | NO | — | `char_length(TRIM(nombre_completo)) >= 3` | Nombre completo del barbero. |
| `nombre_publico` | `VARCHAR(80)` | — | SÍ | `NULL` | — | Apodo o nombre comercial mostrado en la Landing Page. |
| `telefono` | `VARCHAR(20)` | — | NO | — | `char_length(TRIM(telefono)) >= 7` | Teléfono de contacto operativo. |
| `correo` | `VARCHAR(150)` | UK | NO | — | `correo = LOWER(TRIM(correo))` | Correo electrónico único del barbero (RF-BAR-01). |
| `foto_url` | `TEXT` | — | SÍ | `NULL` | — | URL de la fotografía de perfil (validada en capa de aplicación: JPG/PNG/WebP $\le 2\text{ MB}$). |
| `biografia_breve` | `VARCHAR(200)` | — | SÍ | `NULL` | — | Descripción corta exhibida en el Portal Público. |
| `porcentaje_comision` | `NUMERIC(5,2)` | — | SÍ | `NULL` | `porcentaje_comision IS NULL OR (porcentaje_comision >= 0 AND porcentaje_comision <= 100)` | Porcentaje referencial de comisión por servicio ($0.00$ a $100.00$). |
| `estado` | `estado_registro_enum` | — | NO | `'activo'` | — | Estado lógico del perfil (`activo` / `inactivo`). |
| `creado_en` | `TIMESTAMPTZ` | — | NO | `NOW()` | — | Marca temporal UTC de creación. |
| `actualizado_en` | `TIMESTAMPTZ` | — | NO | `NOW()` | Actualizado por trigger | Marca temporal UTC de última modificación. |

---

### 4.5 Tabla: `horarios_barberos`
- **Propósito:** Definir la plantilla semanal recurrente de disponibilidad laboral (hasta dos franjas continuas por día alineadas a bloques de 30 minutos) o días de descanso por barbero (RF-BAR-03).
- **Dependencias principales:** Depende de `barberos`.

| Columna | Tipo PostgreSQL | Llave (PK/FK/UK) | Nulo | Valor por Defecto | Restricciones (CHECK/Reglas) | Descripción |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `horario_id` | `UUID` | PK | NO | `gen_random_uuid()` | — | Identificador único de la franja horaria. |
| `barbero_id` | `UUID` | FK, UK | NO | — | Referencia `barberos(barbero_id)` | Barbero propietario de la plantilla semanal. |
| `dia_semana` | `SMALLINT` | UK | NO | — | `BETWEEN 1 AND 7` | Día ISO de la semana ($1 = \text{Lunes}$ hasta $7 = \text{Domingo}$). |
| `numero_franja` | `SMALLINT` | UK | NO | `1` | `IN (1, 2)` | Número de turno del día (máximo 2 franjas por día según RF-BAR-03). |
| `es_descanso` | `BOOLEAN` | — | NO | `FALSE` | Si `TRUE`: `hora_inicio/fin IS NULL` y `numero_franja = 1` | Indica si el día completo corresponde a descanso laboral. |
| `hora_inicio` | `TIME` | — | SÍ | `NULL` | Minutos en `{0, 30}`, segundos `= 0` | Hora local de inicio del turno laboral. |
| `hora_fin` | `TIME` | — | SÍ | `NULL` | `hora_fin > hora_inicio`, minutos en `{0, 30}`, segundos `= 0` | Hora local de finalización del turno laboral. |
| `rango_minutos` | `INT4RANGE` | — | SÍ | `GENERATED ALWAYS ... STORED` | `EXCLUDE USING GIST` con `(barbero_id, dia_semana)` donde `es_descanso = FALSE` | Rango semiabierto `[min_inicio, min_fin)` en minutos del día para impedir franjas superpuestas. |
| `creado_en` | `TIMESTAMPTZ` | — | NO | `NOW()` | — | Marca temporal UTC de creación. |
| `actualizado_en` | `TIMESTAMPTZ` | — | NO | `NOW()` | Actualizado por trigger | Marca temporal UTC de última modificación. |

---

### 4.6 Tabla: `bloqueos_horarios`
- **Propósito:** Registrar excepciones puntuales de no disponibilidad para una fecha específica (día completo o rango horario) que retiran bloques de la oferta pública (RF-BAR-04).
- **Dependencias principales:** Depende de `sedes`, `barberos` y `usuarios`.

| Columna | Tipo PostgreSQL | Llave (PK/FK/UK) | Nulo | Valor por Defecto | Restricciones (CHECK/Reglas) | Descripción |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `bloqueo_id` | `UUID` | PK | NO | `gen_random_uuid()` | — | Identificador único del bloqueo. |
| `sede_id` | `UUID` | FK | NO | — | Referencia `sedes(sede_id)` | Sede asociada al bloqueo. |
| `barbero_id` | `UUID` | FK | NO | — | Referencia `barberos(barbero_id)` | Barbero cuya agenda queda bloqueada. |
| `fecha` | `DATE` | — | NO | — | — | Fecha calendario operativa del bloqueo en zona horaria de la sede. |
| `dia_completo` | `BOOLEAN` | — | NO | `FALSE` | Si `TRUE`: `hora_inicio/fin IS NULL`; si `FALSE`: ambos obligatorios | Indica si se bloquea toda la jornada del barbero en esa fecha. |
| `hora_inicio` | `TIME` | — | SÍ | `NULL` | Minutos en `{0, 30}`, segundos `= 0` | Hora local de inicio cuando no es día completo. |
| `hora_fin` | `TIME` | — | SÍ | `NULL` | `hora_fin > hora_inicio`, minutos en `{0, 30}`, segundos `= 0` | Hora local de fin cuando no es día completo. |
| `inicio_en` | `TIMESTAMPTZ` | — | NO | — | — | Instante UTC exacto de inicio del bloqueo. |
| `fin_en` | `TIMESTAMPTZ` | — | NO | — | `fin_en > inicio_en` | Instante UTC exacto de finalización del bloqueo. |
| `rango_tiempo` | `TSTZRANGE` | — | NO | `GENERATED ALWAYS AS (tstzrange(inicio_en, fin_en, '[)')) STORED` | `EXCLUDE USING GIST (barbero_id WITH =, rango_tiempo WITH &&) WHERE (activo = TRUE)` | Rango temporal semiabierto para cálculo de disponibilidad y prevención de bloqueos duplicados. |
| `motivo` | `VARCHAR(200)` | — | NO | — | `char_length(TRIM(motivo)) >= 3` | Justificación operativa del bloqueo (ej. permiso médico, almuerzo extendido). |
| `activo` | `BOOLEAN` | — | NO | `TRUE` | — | Borrado lógico: `FALSE` si el bloqueo fue levantado/cancelado. |
| `creado_por_usuario_id` | `UUID` | FK | NO | — | Referencia `usuarios(usuario_id)` | Usuario (Administrador o el propio Barbero) que registró el bloqueo. |
| `creado_en` | `TIMESTAMPTZ` | — | NO | `NOW()` | — | Marca temporal UTC de creación. |
| `actualizado_en` | `TIMESTAMPTZ` | — | NO | `NOW()` | Actualizado por trigger | Marca temporal UTC de última modificación. |

---

### 4.7 Tabla: `servicios`
- **Propósito:** Administrar el catálogo de servicios ofrecidos por la barbería con su precio base en COP, duración en bloques discretos de 30 minutos y visibilidad en el Portal Público (RF-SER-01 a RF-SER-04).
- **Dependencias principales:** Depende de `sedes`.

| Columna | Tipo PostgreSQL | Llave (PK/FK/UK) | Nulo | Valor por Defecto | Restricciones (CHECK/Reglas) | Descripción |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `servicio_id` | `UUID` | PK | NO | `gen_random_uuid()` | — | Identificador único del servicio. |
| `sede_id` | `UUID` | FK | NO | — | Referencia `sedes(sede_id)` | Sede propietaria del servicio. |
| `nombre` | `VARCHAR(80)` | UK parcial | NO | — | `char_length(TRIM(nombre)) >= 2`; único por sede entre servicios `activo` | Nombre comercial del servicio. |
| `descripcion_breve` | `VARCHAR(250)` | — | SÍ | `NULL` | — | Descripción corta exhibida en la Landing Page. |
| `precio_cop` | `NUMERIC(12,0)` | — | NO | — | `precio_cop > 0` | Precio vigente al público en Pesos Colombianos enteros. |
| `duracion_bloques` | `SMALLINT` | — | NO | `1` | `BETWEEN 1 AND 6` | Cantidad entera de bloques de 30 minutos ($1 = 30\text{ min}$, hasta $6 = 180\text{ min}$). |
| `visible_publico` | `BOOLEAN` | — | NO | `TRUE` | — | Determina si el servicio se muestra en el Portal Público. |
| `estado` | `estado_registro_enum` | — | NO | `'activo'` | — | Estado lógico del servicio (`activo` / `inactivo`). |
| `orden_visual` | `SMALLINT` | — | NO | `0` | `>= 0` | Prioridad de ordenamiento para despliegue en Landing y Backoffice. |
| `creado_en` | `TIMESTAMPTZ` | — | NO | `NOW()` | — | Marca temporal UTC de creación. |
| `actualizado_en` | `TIMESTAMPTZ` | — | NO | `NOW()` | Actualizado por trigger | Marca temporal UTC de última modificación. |

---

### 4.8 Tabla: `clientes`
- **Propósito:** Mantener un directorio liviano de clientes finales (sin contraseña ni autenticación) capturados en el agendamiento público o en recepción (RF-AGE-05, RF-AGE-06).
- **Dependencias principales:** Depende de `sedes`.

| Columna | Tipo PostgreSQL | Llave (PK/FK/UK) | Nulo | Valor por Defecto | Restricciones (CHECK/Reglas) | Descripción |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `cliente_id` | `UUID` | PK | NO | `gen_random_uuid()` | — | Identificador único del cliente. |
| `sede_id` | `UUID` | FK, UK | NO | — | Referencia `sedes(sede_id)` | Sede en la que está registrado el cliente. |
| `nombre_completo` | `VARCHAR(100)` | — | NO | — | `char_length(TRIM(nombre_completo)) >= 3` | Nombre completo del cliente. |
| `telefono_whatsapp` | `VARCHAR(20)` | — | NO | — | `char_length(TRIM(telefono_whatsapp)) >= 10` | Número de teléfono/WhatsApp de contacto operativo. |
| `correo` | `VARCHAR(150)` | UK | NO | — | `correo = LOWER(TRIM(correo))`; único por `(sede_id, correo)` | Correo electrónico del cliente para confirmación de citas. |
| `acepto_politica_datos_en` | `TIMESTAMPTZ` | — | SÍ | `NULL` | — | Marca temporal UTC de aceptación de política de datos (Ley 1581 de 2012; obligatorio en flujo público). |
| `creado_en` | `TIMESTAMPTZ` | — | NO | `NOW()` | — | Marca temporal UTC de creación. |
| `actualizado_en` | `TIMESTAMPTZ` | — | NO | `NOW()` | Actualizado por trigger | Marca temporal UTC de última modificación. |

---

### 4.9 Tabla: `citas`
- **Propósito:** Persistir las reservas programadas desde la Landing Page o el Backoffice, garantizando cero solapamientos por barbero mediante exclusión GiST (RN-01 a RN-07).
- **Dependencias principales:** Depende de `sedes`, `clientes`, `barberos` y opcionalmente `usuarios`.

| Columna | Tipo PostgreSQL | Llave (PK/FK/UK) | Nulo | Valor por Defecto | Restricciones (CHECK/Reglas) | Descripción |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `cita_id` | `UUID` | PK | NO | `gen_random_uuid()` | — | Identificador único de la cita. |
| `sede_id` | `UUID` | FK | NO | — | Referencia `sedes(sede_id)` | Sede donde se prestará la cita. |
| `codigo_reserva` | `VARCHAR(12)` | UK | NO | — | `codigo_reserva ~ '^SB-[A-HJ-NP-Z2-9]{6}$'` | Código alfanumérico único legible sin caracteres ambiguos `O/0/I/1` (RF-AGE-06). |
| `cliente_id` | `UUID` | FK | NO | — | Referencia `clientes(cliente_id)` | Cliente titular de la reserva. |
| `barbero_id` | `UUID` | FK | NO | — | Referencia `barberos(barbero_id)` | Barbero asignado (directa o automáticamente según RN-04). |
| `barbero_asignado_automaticamente` | `BOOLEAN` | — | NO | `FALSE` | — | `TRUE` cuando el cliente eligió *"Cualquier barbero disponible"*. |
| `fecha` | `DATE` | — | NO | — | — | Fecha calendario operativa en zona horaria de la sede. |
| `hora_inicio` | `TIME` | — | NO | — | Minutos en `{0, 30}`, segundos `= 0` | Hora local de inicio de la cita. |
| `hora_fin` | `TIME` | — | NO | — | `hora_fin > hora_inicio`, minutos en `{0, 30}`, segundos `= 0` | Hora local de finalización estimada de la cita. |
| `inicio_en` | `TIMESTAMPTZ` | — | NO | — | — | Instante UTC exacto de inicio. |
| `fin_en` | `TIMESTAMPTZ` | — | NO | — | `fin_en = inicio_en + (bloques_totales * INTERVAL '30 minutes')` | Instante UTC exacto de finalización coherente con `bloques_totales` (RN-02). |
| `rango_tiempo` | `TSTZRANGE` | — | NO | `GENERATED ALWAYS AS (tstzrange(inicio_en, fin_en, '[)')) STORED` | `EXCLUDE USING GIST (barbero_id WITH =, rango_tiempo WITH &&) WHERE (estado IN ('pendiente', 'confirmada'))` | Rango temporal semiabierto que impide atómicamente el solapamiento de citas activas (RN-01). |
| `bloques_totales` | `SMALLINT` | — | NO | — | `>= 1` | Suma de bloques de 30 minutos de los servicios reservados ($B_{\text{total}}$). |
| `precio_estimado_cop` | `NUMERIC(12,0)` | — | NO | — | `precio_estimado_cop > 0` | Suma total estimada en COP al momento de reservar. |
| `estado` | `estado_cita_enum` | — | NO | `'pendiente'` | — | Estado del ciclo de vida (`pendiente`, `confirmada`, `completada`, `cancelada`, `no_asistio`). |
| `notas_cliente` | `VARCHAR(200)` | — | SÍ | `NULL` | — | Comentarios opcionales dejados para el barbero. |
| `motivo_cancelacion` | `VARCHAR(250)` | — | SÍ | `NULL` | `estado = 'cancelada' OR motivo_cancelacion IS NULL` | Motivo opcional registrado al cancelar la cita. |
| `origen` | `origen_cita_enum` | — | NO | `'landing'` | — | Canal de creación (`landing` o `backoffice`). |
| `creado_por_usuario_id` | `UUID` | FK | SÍ | `NULL` | `(origen = 'landing' AND creado_por_usuario_id IS NULL) OR (origen = 'backoffice' AND creado_por_usuario_id IS NOT NULL)` | Usuario del Backoffice cuando la cita se registra manualmente (RF-AGE-09). |
| `creado_en` | `TIMESTAMPTZ` | — | NO | `NOW()` | — | Marca temporal UTC de creación. |
| `actualizado_en` | `TIMESTAMPTZ` | — | NO | `NOW()` | Actualizado por trigger | Marca temporal UTC de última modificación. |

---

### 4.10 Tabla: `citas_servicios`
- **Propósito:** Entidad asociativa $N:M$ que registra cada servicio reservado en una cita preservando su instantánea de nombre, precio y duración en bloques (RF-SER-04, RN-12).
- **Dependencias principales:** Depende de `citas` y `servicios`.

| Columna | Tipo PostgreSQL | Llave (PK/FK/UK) | Nulo | Valor por Defecto | Restricciones (CHECK/Reglas) | Descripción |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `cita_servicio_id` | `UUID` | PK | NO | `gen_random_uuid()` | — | Identificador único del detalle de cita. |
| `cita_id` | `UUID` | FK, UK | NO | — | Referencia `citas(cita_id)` | Cita a la que pertenece el servicio. |
| `servicio_id` | `UUID` | FK, UK | NO | — | Referencia `servicios(servicio_id)`; único por `(cita_id, servicio_id)` | Servicio del catálogo seleccionado. |
| `nombre_servicio_snapshot` | `VARCHAR(80)` | — | NO | — | `char_length(TRIM(nombre_servicio_snapshot)) >= 2` | Copia inmutable del nombre del servicio al reservar. |
| `precio_cop_snapshot` | `NUMERIC(12,0)` | — | NO | — | `precio_cop_snapshot > 0` | Copia inmutable del precio en COP al reservar. |
| `duracion_bloques_snapshot` | `SMALLINT` | — | NO | — | `BETWEEN 1 AND 6` | Copia inmutable de la duración en bloques al reservar. |
| `creado_en` | `TIMESTAMPTZ` | — | NO | `NOW()` | — | Marca temporal UTC de creación. |

---

### 4.11 Tabla: `historial_estados_citas`
- **Propósito:** Mantener una bitácora inmutable de auditoría de todas las transiciones de estado de cada cita (RF-AGE-07, RN-07).
- **Dependencias principales:** Depende de `citas` y opcionalmente de `usuarios`.

| Columna | Tipo PostgreSQL | Llave (PK/FK/UK) | Nulo | Valor por Defecto | Restricciones (CHECK/Reglas) | Descripción |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `historial_id` | `UUID` | PK | NO | `gen_random_uuid()` | — | Identificador único del evento de auditoría. |
| `cita_id` | `UUID` | FK | NO | — | Referencia `citas(cita_id)` | Cita cuyo estado cambió. |
| `estado_anterior` | `estado_cita_enum` | — | SÍ | `NULL` | `estado_anterior IS NULL OR estado_anterior <> estado_nuevo` | Estado previo de la cita (`NULL` en la creación inicial). |
| `estado_nuevo` | `estado_cita_enum` | — | NO | — | — | Nuevo estado asignado a la cita. |
| `observacion` | `VARCHAR(250)` | — | SÍ | `NULL` | — | Motivo o contexto del cambio (ej. cancelación o reversión por anulación de corte). |
| `cambiado_por_usuario_id` | `UUID` | FK | SÍ | `NULL` | Referencia `usuarios(usuario_id)` | Usuario que ejecutó la transición (`NULL` si fue generada por el cliente en la Landing). |
| `cambiado_en` | `TIMESTAMPTZ` | — | NO | `NOW()` | Inmutable vía trigger | Marca temporal UTC del cambio de estado. |

---

### 4.12 Tabla: `notificaciones_correo`
- **Propósito:** Implementar el patrón *Transactional Outbox* para el encolamiento confiable y reintento automático (hasta 3 intentos) de los correos electrónicos de confirmación de citas (RF-AGE-06, CU-01 FA-03).
- **Dependencias principales:** Depende de `sedes` y `citas`.

| Columna | Tipo PostgreSQL | Llave (PK/FK/UK) | Nulo | Valor por Defecto | Restricciones (CHECK/Reglas) | Descripción |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `notificacion_id` | `UUID` | PK | NO | `gen_random_uuid()` | — | Identificador único de la notificación. |
| `sede_id` | `UUID` | FK | NO | — | Referencia `sedes(sede_id)` | Sede emisora del correo. |
| `cita_id` | `UUID` | FK | NO | — | Referencia `citas(cita_id)` | Cita asociada a la notificación. |
| `correo_destino` | `VARCHAR(150)` | — | NO | — | `correo_destino = LOWER(TRIM(correo_destino))` | Dirección de correo del cliente destinatario. |
| `asunto` | `VARCHAR(200)` | — | NO | — | `char_length(TRIM(asunto)) >= 3` | Asunto del correo electrónico. |
| `estado` | `estado_notificacion_enum` | — | NO | `'pendiente'` | — | Estado de entrega (`pendiente`, `enviada`, `fallida`). |
| `intentos` | `SMALLINT` | — | NO | `0` | `BETWEEN 0 AND 3` | Número de intentos realizados (tope máximo de 3 reintentos según CU-01 FA-03). |
| `ultimo_error` | `TEXT` | — | SÍ | `NULL` | — | Detalle técnico del último error del proveedor transaccional. |
| `proximo_reintento_en` | `TIMESTAMPTZ` | — | SÍ | `NOW()` | — | Fecha/hora UTC elegible para el siguiente intento de despacho. |
| `enviada_en` | `TIMESTAMPTZ` | — | SÍ | `NULL` | `(estado = 'enviada' AND enviada_en IS NOT NULL) OR (estado <> 'enviada' AND enviada_en IS NULL)` | Fecha/hora UTC de confirmación de entrega. |
| `creado_en` | `TIMESTAMPTZ` | — | NO | `NOW()` | — | Marca temporal UTC de creación. |
| `actualizado_en` | `TIMESTAMPTZ` | — | NO | `NOW()` | Actualizado por trigger | Marca temporal UTC de última modificación. |

---

### 4.13 Tabla: `registros_cortes`
- **Propósito:** Consolidar cada atención operativa y transacción de caja (proveniente de una cita o *walk-in*), preservando método de pago, comisión histórica y auditoría de anulación (RF-COR-01 a RF-COR-05, RN-08, RN-12, RN-15).
- **Dependencias principales:** Depende de `sedes`, `barberos`, `usuarios` y opcionalmente de `citas` y `clientes`.

| Columna | Tipo PostgreSQL | Llave (PK/FK/UK) | Nulo | Valor por Defecto | Restricciones (CHECK/Reglas) | Descripción |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `registro_corte_id` | `UUID` | PK | NO | `gen_random_uuid()` | — | Identificador único del registro de corte. |
| `sede_id` | `UUID` | FK | NO | — | Referencia `sedes(sede_id)` | Sede donde se registró la atención. |
| `cita_id` | `UUID` | FK, UK parcial | SÍ | `NULL` | Referencia `citas(cita_id)`; único cuando `cita_id IS NOT NULL AND estado = 'activo'` (RN-08) | Cita de origen cuando `origen = 'cita'`; `NULL` en *walk-in*. |
| `barbero_id` | `UUID` | FK | NO | — | Referencia `barberos(barbero_id)` | Barbero que ejecutó la atención. |
| `cliente_id` | `UUID` | FK | SÍ | `NULL` | Referencia `clientes(cliente_id)` | Cliente registrado (heredado de la cita u opcional en *walk-in*). |
| `nombre_cliente_referencial` | `VARCHAR(100)` | — | SÍ | `NULL` | — | Nombre referencial opcional para clientes *walk-in* sin ficha en `clientes`. |
| `origen` | `origen_corte_enum` | — | NO | — | `(origen = 'cita' AND cita_id IS NOT NULL) OR (origen = 'walk_in' AND cita_id IS NULL)` | Origen operativo de la atención (`cita` o `walk_in`). |
| `fecha_hora_atencion` | `TIMESTAMPTZ` | — | NO | `NOW()` | — | Fecha y hora UTC efectiva de la atención. |
| `precio_calculado_cop` | `NUMERIC(12,0)` | — | NO | — | `precio_calculado_cop > 0` | Suma automática de los precios vigentes de los servicios aplicados. |
| `precio_cobrado_cop` | `NUMERIC(12,0)` | — | NO | — | `precio_cobrado_cop >= 0` | Valor final cobrado en caja en COP (ajustable solo por Administrador, RN-15). |
| `metodo_pago` | `metodo_pago_enum` | — | NO | — | — | Método de pago recibido (`efectivo`, `transferencia_bancaria`, `tarjeta_debito_credito`, `nequi`, `daviplata`). |
| `porcentaje_comision_snapshot` | `NUMERIC(5,2)` | — | NO | `0.00` | `BETWEEN 0 AND 100` | Instantánea del porcentaje de comisión del barbero al momento del corte (RN-12). |
| `comision_calculada_cop` | `NUMERIC(12,0)` | — | NO | `0` | `comision_calculada_cop >= 0` | Valor entero en COP de comisión referencial calculado: $\text{redondear}(P \times p / 100)$ (RF-BAR-05). |
| `notas` | `VARCHAR(300)` | — | SÍ | `NULL` | Obligatoria ($\ge 5$ caracteres) si `precio_cobrado_cop <> precio_calculado_cop` (RN-15) | Observaciones de la atención o justificación de ajuste manual de precio. |
| `estado` | `estado_corte_enum` | — | NO | `'activo'` | — | Estado contable (`activo` o `anulado`). |
| `motivo_anulacion` | `VARCHAR(250)` | — | SÍ | `NULL` | Si `anulado`: obligatorio con `char_length(TRIM(...)) >= 10`; si `activo`: `NULL` (RF-COR-05) | Justificación auditada de la anulación. |
| `anulado_por_usuario_id` | `UUID` | FK | SÍ | `NULL` | Referencia `usuarios(usuario_id)`; obligatorio solo si `estado = 'anulado'` | Administrador que ejecutó la anulación. |
| `anulado_en` | `TIMESTAMPTZ` | — | SÍ | `NULL` | Obligatorio solo si `estado = 'anulado'` | Marca temporal UTC de la anulación. |
| `registrado_por_usuario_id` | `UUID` | FK | NO | — | Referencia `usuarios(usuario_id)` | Usuario (Barbero o Administrador) que registró el corte. |
| `creado_en` | `TIMESTAMPTZ` | — | NO | `NOW()` | — | Marca temporal UTC de creación. |
| `actualizado_en` | `TIMESTAMPTZ` | — | NO | `NOW()` | Actualizado por trigger | Marca temporal UTC de última modificación. |

---

### 4.14 Tabla: `registros_cortes_servicios`
- **Propósito:** Detallar los servicios efectivamente ejecutados en cada `registro_corte` preservando su instantánea de nombre y precio en COP (RF-COR-01, RF-COR-02, RN-12).
- **Dependencias principales:** Depende de `registros_cortes` y `servicios`.

| Columna | Tipo PostgreSQL | Llave (PK/FK/UK) | Nulo | Valor por Defecto | Restricciones (CHECK/Reglas) | Descripción |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `registro_corte_servicio_id` | `UUID` | PK | NO | `gen_random_uuid()` | — | Identificador único del renglón de servicio prestado. |
| `registro_corte_id` | `UUID` | FK, UK | NO | — | Referencia `registros_cortes(registro_corte_id)` | Registro de corte al que pertenece el detalle. |
| `servicio_id` | `UUID` | FK, UK | NO | — | Referencia `servicios(servicio_id)`; único por `(registro_corte_id, servicio_id)` | Servicio del catálogo ejecutado. |
| `nombre_servicio_snapshot` | `VARCHAR(80)` | — | NO | — | `char_length(TRIM(nombre_servicio_snapshot)) >= 2` | Copia inmutable del nombre del servicio al registrar el corte. |
| `precio_cop_snapshot` | `NUMERIC(12,0)` | — | NO | — | `precio_cop_snapshot > 0` | Copia inmutable del precio vigente en COP al registrar el corte. |
| `creado_en` | `TIMESTAMPTZ` | — | NO | `NOW()` | — | Marca temporal UTC de creación. |

---

### 4.15 Tabla: `productos_inventario`
- **Propósito:** Administrar la ficha maestra de productos para venta al público o consumo interno, sus existencias actuales y umbral mínimo para alertas automáticas (RF-INV-01, RF-INV-04, RN-10, RN-11).
- **Dependencias principales:** Depende de `sedes`.

| Columna | Tipo PostgreSQL | Llave (PK/FK/UK) | Nulo | Valor por Defecto | Restricciones (CHECK/Reglas) | Descripción |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `producto_id` | `UUID` | PK | NO | `gen_random_uuid()` | — | Identificador único del producto. |
| `sede_id` | `UUID` | FK | NO | — | Referencia `sedes(sede_id)` | Sede propietaria del inventario. |
| `sku` | `VARCHAR(50)` | UK parcial | SÍ | `NULL` | Único por `(sede_id, LOWER(TRIM(sku)))` cuando `sku IS NOT NULL` | Código interno o SKU opcional del producto. |
| `nombre` | `VARCHAR(100)` | — | NO | — | `char_length(TRIM(nombre)) >= 2` | Nombre comercial del producto. |
| `categoria` | `VARCHAR(60)` | — | NO | — | `char_length(TRIM(categoria)) >= 2` | Categoría comercial (ej. `Ceras y Pomadas`, `Cuidado de Barba`). |
| `precio_venta_cop` | `NUMERIC(12,0)` | — | NO | — | `precio_venta_cop > 0` | Precio unitario de venta al público en COP enteros. |
| `costo_unitario_cop` | `NUMERIC(12,0)` | — | SÍ | `NULL` | `costo_unitario_cop IS NULL OR costo_unitario_cop >= 0` | Costo unitario referencial en COP. |
| `stock_actual` | `INTEGER` | — | NO | `0` | `stock_actual >= 0` | Existencias disponibles actuales (actualizadas únicamente junto a `movimientos_inventario`, RN-10). |
| `stock_minimo` | `INTEGER` | — | NO | `0` | `stock_minimo >= 0` | Umbral mínimo para disparar la alerta `Stock bajo` (RN-11). |
| `estado` | `estado_registro_enum` | — | NO | `'activo'` | — | Estado lógico del producto (`activo` / `inactivo`). |
| `creado_en` | `TIMESTAMPTZ` | — | NO | `NOW()` | — | Marca temporal UTC de creación. |
| `actualizado_en` | `TIMESTAMPTZ` | — | NO | `NOW()` | Actualizado por trigger | Marca temporal UTC de última modificación. |

---

### 4.16 Tabla: `movimientos_inventario`
- **Propósito:** Llevar el Kardex cronológico estrictamente inmutable de todas las entradas y salidas de inventario, respaldando toda variación de `stock_actual` (RF-INV-02, RF-INV-03, RF-INV-05, RN-10).
- **Dependencias principales:** Depende de `sedes`, `productos_inventario`, `usuarios` y opcionalmente de `registros_cortes`.

| Columna | Tipo PostgreSQL | Llave (PK/FK/UK) | Nulo | Valor por Defecto | Restricciones (CHECK/Reglas) | Descripción |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `movimiento_id` | `UUID` | PK | NO | `gen_random_uuid()` | — | Identificador único del movimiento de Kardex. |
| `sede_id` | `UUID` | FK | NO | — | Referencia `sedes(sede_id)` | Sede donde ocurrió el movimiento. |
| `producto_id` | `UUID` | FK | NO | — | Referencia `productos_inventario(producto_id)` | Producto afectado. |
| `tipo` | `tipo_movimiento_inventario_enum` | — | NO | — | Coherente con `subtipo` | Sentido del movimiento (`entrada` o `salida`). |
| `subtipo` | `subtipo_movimiento_inventario_enum` | — | NO | — | Entradas: `inventario_inicial`, `compra_reposicion`, `ajuste_positivo`; Salidas: `venta_publico`, `consumo_interno`, `ajuste_negativo` | Clasificación operativa del movimiento. |
| `cantidad` | `INTEGER` | — | NO | — | `cantidad > 0` | Unidades ingresadas o retiradas (entero estrictamente positivo). |
| `stock_anterior` | `INTEGER` | — | NO | — | `stock_anterior >= 0` | Existencia del producto inmediatamente antes del movimiento. |
| `stock_resultante` | `INTEGER` | — | NO | — | `>= 0`; si `entrada`: `stock_anterior + cantidad`; si `salida`: `stock_anterior - cantidad` | Existencia resultante verificada matemáticamente en BD (RN-10). |
| `costo_unitario_cop` | `NUMERIC(12,0)` | — | SÍ | `NULL` | `costo_unitario_cop IS NULL OR costo_unitario_cop >= 0` | Costo unitario opcional informado en entradas de compra/reposición. |
| `precio_unitario_cop` | `NUMERIC(12,0)` | — | SÍ | `NULL` | Obligatorio (`> 0`) si `subtipo = 'venta_publico'` | Instantánea del precio unitario de venta en COP. |
| `valor_total_cop` | `NUMERIC(12,0)` | — | SÍ | `NULL` | `>= 0`; si `venta_publico`: `= precio_unitario_cop * cantidad` | Monto total de la venta o valoración del movimiento en COP. |
| `metodo_pago` | `metodo_pago_enum` | — | SÍ | `NULL` | Obligatorio si `subtipo = 'venta_publico'`; `NULL` en los demás subtipos | Medio de pago recibido por venta al público (RF-INV-03). |
| `registro_corte_id` | `UUID` | FK | SÍ | `NULL` | Referencia `registros_cortes(registro_corte_id)`; permitido solo si `tipo = 'salida'` | Enlace opcional al corte durante el cual se vendió o consumió el producto (CU-03). |
| `observacion` | `VARCHAR(200)` | — | SÍ | `NULL` | — | Nota aclaratoria del movimiento. |
| `usuario_id` | `UUID` | FK | NO | — | Referencia `usuarios(usuario_id)` | Usuario autenticado que ejecutó el movimiento. |
| `creado_en` | `TIMESTAMPTZ` | — | NO | `NOW()` | Inmutable vía trigger (`BEFORE UPDATE OR DELETE`) | Marca temporal UTC de registro del movimiento. |

---

## 5. Relaciones, Dependencias e Integridad Referencial

Todas las políticas `ON UPDATE` se configuran como **`RESTRICT`** porque las llaves primarias son `UUID` inmutables; modificar una llave primaria en producción constituye una anomalía que el motor debe bloquear.

| Tabla Origen | Columna FK | Tabla Destino | Cardinalidad | ON DELETE | ON UPDATE | Justificación Técnica |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `usuarios` | `sede_id` | `sedes` | $N : 1$ | `RESTRICT` | `RESTRICT` | Impide eliminar una sede mientras existan usuarios vinculados; aplica borrado lógico (RN-13). |
| `sesiones_usuarios` | `usuario_id` | `usuarios` | $N : 1$ | `CASCADE` | `RESTRICT` | Las sesiones son estado técnico efímero sin valor contable; si un usuario sin historial se depura, sus sesiones se limpian en cascada. |
| `barberos` | `sede_id` | `sedes` | $N : 1$ | `RESTRICT` | `RESTRICT` | Protege la jerarquía organizacional y evita registros huérfanos. |
| `barberos` | `usuario_id` | `usuarios` | $0..1 : 1$ | `RESTRICT` | `RESTRICT` | Impide eliminar una cuenta de usuario asociada a un barbero operativo; se desactiva vía `estado = 'inactivo'` (RF-BAR-02). |
| `horarios_barberos` | `barbero_id` | `barberos` | $N : 1$ | `CASCADE` | `RESTRICT` | La plantilla semanal no almacena historial contable y depende existencialmente del barbero (si el barbero tiene citas/cortes, las FK de esas tablas impedirán su borrado). |
| `bloqueos_horarios` | `sede_id` | `sedes` | $N : 1$ | `RESTRICT` | `RESTRICT` | Mantiene la integridad multi-sede de excepciones de agenda. |
| `bloqueos_horarios` | `barbero_id` | `barberos` | $N : 1$ | `RESTRICT` | `RESTRICT` | Preserva el rastro operativo de bloqueos históricos de agenda. |
| `bloqueos_horarios` | `creado_por_usuario_id` | `usuarios` | $N : 1$ | `RESTRICT` | `RESTRICT` | Conserva la trazabilidad del autor del bloqueo. |
| `servicios` | `sede_id` | `sedes` | $N : 1$ | `RESTRICT` | `RESTRICT` | Impide eliminar una sede con catálogo asociado. |
| `clientes` | `sede_id` | `sedes` | $N : 1$ | `RESTRICT` | `RESTRICT` | Protege el directorio de clientes por sede. |
| `citas` | `sede_id` | `sedes` | $N : 1$ | `RESTRICT` | `RESTRICT` | Garantiza trazabilidad histórica de citas por sede (RN-13). |
| `citas` | `cliente_id` | `clientes` | $N : 1$ | `RESTRICT` | `RESTRICT` | Evita dejar citas sin titular registrado. |
| `citas` | `barbero_id` | `barberos` | $N : 1$ | `RESTRICT` | `RESTRICT` | Impide borrar barberos con citas históricas o futuras; obliga desactivación lógica (RF-BAR-02). |
| `citas` | `creado_por_usuario_id` | `usuarios` | $N : 0..1$ | `RESTRICT` | `RESTRICT` | Preserva la auditoría de citas creadas manualmente desde el Backoffice (RF-AGE-09). |
| `citas_servicios` | `cita_id` | `citas` | $N : 1$ | `RESTRICT` | `RESTRICT` | Las citas nunca se eliminan físicamente (RN-13); impide pérdida accidental del detalle reservado. |
| `citas_servicios` | `servicio_id` | `servicios` | $N : 1$ | `RESTRICT` | `RESTRICT` | Impide eliminar físicamente servicios presentes en citas; obliga desactivación lógica (RF-SER-02). |
| `historial_estados_citas` | `cita_id` | `citas` | $N : 1$ | `RESTRICT` | `RESTRICT` | Protege la integridad de la bitácora de auditoría de citas (RF-AGE-07). |
| `historial_estados_citas` | `cambiado_por_usuario_id` | `usuarios` | $N : 0..1$ | `RESTRICT` | `RESTRICT` | Conserva la identidad del usuario responsable de cada transición de estado. |
| `notificaciones_correo` | `sede_id` | `sedes` | $N : 1$ | `RESTRICT` | `RESTRICT` | Garantiza trazabilidad de envíos por sede. |
| `notificaciones_correo` | `cita_id` | `citas` | $N : 1$ | `RESTRICT` | `RESTRICT` | Preserva el historial de confirmaciones enviadas al cliente. |
| `registros_cortes` | `sede_id` | `sedes` | $N : 1$ | `RESTRICT` | `RESTRICT` | Protege la contabilidad operativa por sede. |
| `registros_cortes` | `cita_id` | `citas` | $0..N : 0..1$ *(1:1 activo)* | `RESTRICT` | `RESTRICT` | Mantiene el vínculo trazable entre la cita completada y el registro de caja (RN-08). |
| `registros_cortes` | `barbero_id` | `barberos` | $N : 1$ | `RESTRICT` | `RESTRICT` | Protege el historial de ingresos y liquidación de comisiones del barbero (RF-BAR-02, RF-BAR-05). |
| `registros_cortes` | `cliente_id` | `clientes` | $N : 0..1$ | `RESTRICT` | `RESTRICT` | Preserva la relación con el cliente cuando existe ficha registrada. |
| `registros_cortes` | `registrado_por_usuario_id` | `usuarios` | $N : 1$ | `RESTRICT` | `RESTRICT` | Conserva la autoría de quién registró la transacción en caja. |
| `registros_cortes` | `anulado_por_usuario_id` | `usuarios` | $N : 0..1$ | `RESTRICT` | `RESTRICT` | Conserva la identidad del Administrador que anuló un registro (RF-COR-05). |
| `registros_cortes_servicios` | `registro_corte_id` | `registros_cortes` | $N : 1$ | `RESTRICT` | `RESTRICT` | Protege la inmutabilidad del desglose financiero de cada corte. |
| `registros_cortes_servicios` | `servicio_id` | `servicios` | $N : 1$ | `RESTRICT` | `RESTRICT` | Impide eliminar servicios ya facturados en caja (RF-SER-02, RN-13). |
| `productos_inventario` | `sede_id` | `sedes` | $N : 1$ | `RESTRICT` | `RESTRICT` | Impide eliminar una sede con productos registrados. |
| `movimientos_inventario` | `sede_id` | `sedes` | $N : 1$ | `RESTRICT` | `RESTRICT` | Mantiene la integridad multi-sede del Kardex. |
| `movimientos_inventario` | `producto_id` | `productos_inventario` | $N : 1$ | `RESTRICT` | `RESTRICT` | Impide borrar productos con historial de Kardex (RF-INV-01, RN-13). |
| `movimientos_inventario` | `registro_corte_id` | `registros_cortes` | $N : 0..1$ | `RESTRICT` | `RESTRICT` | Preserva el vínculo con la atención donde se vendió/consumió el producto (CU-03). |
| `movimientos_inventario` | `usuario_id` | `usuarios` | $N : 1$ | `RESTRICT` | `RESTRICT` | Garantiza trazabilidad del responsable de cada entrada o salida de stock. |

---

## 6. Estrategia de Índices y Optimización de Consultas

La estrategia de indexación se diseña para cumplir estrictamente los acuerdos de rendimiento del ERS: **LCP $< 2.5\text{ s}$** en Landing Page (RNF-01), **cálculo de disponibilidad $< 500\text{ ms}$ en $p_{95}$** con 50 usuarios concurrentes (RNF-02, RNF-04) y **transacciones de Backoffice $< 800\text{ ms}$ en $p_{95}$** (RNF-03).

| Índice | Tabla | Tipo / Estructura | Columnas / Predicado | Consulta Crítica del ERS que Optimiza |
| :--- | :--- | :--- | :--- | :--- |
| `excl_citas_barbero_solapamiento` | `citas` | **GiST parcial** *(respalda `EXCLUDE`)* | `(barbero_id, rango_tiempo) WHERE (estado IN ('pendiente', 'confirmada'))` | Verificación atómica de no solapamiento ante reservas concurrentes (RN-01, RNF-04) y cruce por rangos de tiempo. |
| `idx_citas_disponibilidad_fecha` | `citas` | **B-Tree compuesto parcial + `INCLUDE`** | `(sede_id, fecha, barbero_id) INCLUDE (hora_inicio, hora_fin, bloques_totales, estado) WHERE (estado IN ('pendiente', 'confirmada'))` | Motor de disponibilidad en Landing Page (RF-AGE-04, RNF-02) y conteo de carga por barbero para *"Cualquier barbero disponible"* (RN-04) mediante *Index-Only Scan*. |
| `idx_citas_agenda_sede_fecha` | `citas` | **B-Tree compuesto** | `(sede_id, fecha, hora_inicio, barbero_id)` | Visualización de la grilla diaria y semanal en el Backoffice (RF-AGE-08). |
| `idx_citas_cliente_activas` | `citas` | **B-Tree parcial** | `(cliente_id, fecha) WHERE (estado IN ('pendiente', 'confirmada'))` | Validación instantánea del límite anti-abuso: máx. 2 citas/día y máx. 3 citas futuras activas por cliente (RN-14). |
| `idx_servicios_landing_publico` | `servicios` | **B-Tree parcial** | `(sede_id, orden_visual, nombre) WHERE (estado = 'activo' AND visible_publico = TRUE)` | Carga ultra rápida del catálogo público en la Landing Page (RF-AGE-01, RNF-01). |
| `uq_servicios_sede_nombre_activo` | `servicios` | **B-Tree único parcial** | `(sede_id, LOWER(TRIM(nombre))) WHERE (estado = 'activo')` | Garantiza unicidad de nombre solo entre servicios activos (RF-SER-01) permitiendo reutilizar nombres de servicios desactivados. |
| `idx_barberos_activos_sede` | `barberos` | **B-Tree parcial** | `(sede_id, nombre_completo) WHERE (estado = 'activo')` | Carga de tarjetas públicas de barberos (RF-AGE-01, RF-AGE-03) y desempate alfabético de RN-04. |
| `excl_horarios_barberos_solapamiento` | `horarios_barberos` | **GiST parcial** *(respalda `EXCLUDE`)* | `(barbero_id, dia_semana, rango_minutos) WHERE (es_descanso = FALSE)` | Prevención en BD de turnos superpuestos el mismo día (RF-BAR-03). |
| `idx_horarios_barberos_consulta` | `horarios_barberos` | **B-Tree + `INCLUDE`** | `(barbero_id, dia_semana) INCLUDE (es_descanso, hora_inicio, hora_fin)` | Consulta en milisegundos de turnos laborales durante el cálculo de disponibilidad (RF-AGE-04). |
| `excl_bloqueos_horarios_solapamiento` | `bloqueos_horarios` | **GiST parcial** *(respalda `EXCLUDE`)* | `(barbero_id, rango_tiempo) WHERE (activo = TRUE)` | Prevención de bloqueos duplicados y validación de conflictos de agenda (RF-BAR-04). |
| `idx_bloqueos_horarios_fecha` | `bloqueos_horarios` | **B-Tree parcial** | `(barbero_id, fecha) WHERE (activo = TRUE)` | Filtrado de excepciones puntuales al consultar la disponibilidad de una fecha (RF-AGE-04). |
| `idx_clientes_sede_telefono` | `clientes` | **B-Tree compuesto** | `(sede_id, telefono_whatsapp)` | Búsqueda de clientes por teléfono/WhatsApp para reglas anti-abuso (RN-14) y agendamiento manual (RF-AGE-09). |
| `uq_registros_cortes_cita_activa` | `registros_cortes` | **B-Tree único parcial** | `(cita_id) WHERE (cita_id IS NOT NULL AND estado = 'activo')` | Garantiza relación 1:1 activa entre cita y registro de corte (RN-08) sin impedir re-cierre si un corte previo fue anulado (RF-COR-05). |
| `idx_registros_cortes_reporte_diario` | `registros_cortes` | **B-Tree compuesto parcial + `INCLUDE`** | `(sede_id, fecha_hora_atencion DESC, barbero_id) INCLUDE (precio_cobrado_cop, metodo_pago, comision_calculada_cop, origen) WHERE (estado = 'activo')` | Reporte de ingresos por día, método de pago y liquidación de comisiones por barbero (RF-COR-04, RF-BAR-05) en una sola lectura de índice. |
| `idx_registros_cortes_barbero_historial` | `registros_cortes` | **B-Tree compuesto** | `(barbero_id, fecha_hora_atencion DESC)` | Vista de historial propio para usuarios con rol `Barbero` (RF-COR-03). |
| `idx_productos_inventario_alerta_stock` | `productos_inventario` | **B-Tree parcial** | `(sede_id, stock_actual) WHERE (estado = 'activo' AND stock_actual <= stock_minimo)` | Conteo e identificación inmediata de productos en estado `Stock bajo` y `Agotado` en el tablero del Backoffice (RF-INV-04, RN-11). |
| `uq_productos_inventario_sede_sku` | `productos_inventario` | **B-Tree único parcial** | `(sede_id, LOWER(TRIM(sku))) WHERE (sku IS NOT NULL)` | Garantiza unicidad del SKU opcional por sede sin colisionar valores nulos (RF-INV-01). |
| `idx_movimientos_inventario_kardex` | `movimientos_inventario` | **B-Tree compuesto** | `(sede_id, producto_id, creado_en DESC)` | Consulta cronológica descendente del Kardex por producto (RF-INV-05). |
| `idx_movimientos_inventario_fecha_tipo` | `movimientos_inventario` | **B-Tree compuesto** | `(sede_id, creado_en DESC, tipo)` | Filtrado del historial de movimientos por rango de fechas y tipo (`Entrada`/`Salida`, RF-INV-05). |
| `idx_sesiones_usuarios_activas` | `sesiones_usuarios` | **B-Tree parcial** | `(usuario_id, expira_en) WHERE (revocada_en IS NULL)` | Validación rápida de sesiones vigentes y revocación masiva inmediata al desactivar un barbero (RF-BAR-02, RNF-10). |
| `idx_notificaciones_correo_cola` | `notificaciones_correo` | **B-Tree parcial** | `(proximo_reintento_en, creado_en) WHERE (estado = 'pendiente')` | Sondeo eficiente del trabajador asíncrono de correos pendientes y reintentos (CU-01 FA-03). |
| **Índices de apoyo a FKs** | Varias tablas | **B-Tree** | `citas_servicios(servicio_id)`, `registros_cortes_servicios(servicio_id)`, `historial_estados_citas(cita_id, cambiado_en DESC)`, `notificaciones_correo(cita_id)`, `movimientos_inventario(registro_corte_id) WHERE registro_corte_id IS NOT NULL` | Evitan escaneos secuenciales al validar restricciones `ON DELETE RESTRICT` y aceleran consultas de detalle. |

---

## 7. Script DDL Completo y Ejecutable (PostgreSQL)

El siguiente script está ordenado estrictamente por dependencias para ejecutarse de principio a fin en **PostgreSQL 15+** sin errores.

```sql
-- ============================================================================
-- SMARTBARBER — SCRIPT DDL DE BASE DE DATOS RELACIONAL (POSTGRESQL 15+)
-- ============================================================================
-- Estándares aplicados:
--   * Esquema en español, snake_case en minúsculas, tablas en plural.
--   * PKs en UUID nativo (gen_random_uuid()).
--   * Dinero exacto en COP enteros mediante NUMERIC(12,0).
--   * Fechas/horas de eventos en TIMESTAMPTZ (UTC).
--   * Prevención de solapamientos de citas y horarios mediante EXCLUDE USING GIST.
--   * Inmutabilidad de Kardex y auditoría de estados protegida por triggers.
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- 1. EXTENSIONES REQUERIDAS
-- ----------------------------------------------------------------------------
-- Necesaria para combinar operadores de igualdad (=) sobre UUID/SMALLINT
-- con operadores de solapamiento (&&) sobre rangos en restricciones EXCLUDE USING GIST.
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- ----------------------------------------------------------------------------
-- 2. TIPOS ENUMERADOS (ENUM)
-- ----------------------------------------------------------------------------
CREATE TYPE estado_registro_enum AS ENUM (
    'activo',
    'inactivo'
);

CREATE TYPE rol_usuario_enum AS ENUM (
    'administrador',
    'barbero'
);

CREATE TYPE estado_cita_enum AS ENUM (
    'pendiente',
    'confirmada',
    'completada',
    'cancelada',
    'no_asistio'
);

CREATE TYPE origen_cita_enum AS ENUM (
    'landing',
    'backoffice'
);

CREATE TYPE origen_corte_enum AS ENUM (
    'cita',
    'walk_in'
);

CREATE TYPE estado_corte_enum AS ENUM (
    'activo',
    'anulado'
);

CREATE TYPE metodo_pago_enum AS ENUM (
    'efectivo',
    'transferencia_bancaria',
    'tarjeta_debito_credito',
    'nequi',
    'daviplata'
);

CREATE TYPE tipo_movimiento_inventario_enum AS ENUM (
    'entrada',
    'salida'
);

CREATE TYPE subtipo_movimiento_inventario_enum AS ENUM (
    'inventario_inicial',
    'compra_reposicion',
    'ajuste_positivo',
    'venta_publico',
    'consumo_interno',
    'ajuste_negativo'
);

CREATE TYPE estado_notificacion_enum AS ENUM (
    'pendiente',
    'enviada',
    'fallida'
);

-- ----------------------------------------------------------------------------
-- 3. FUNCIONES DE TRIGGER REUTILIZABLES
-- ----------------------------------------------------------------------------
-- Actualiza automáticamente la columna actualizado_en (equivalente a updated_at)
CREATE OR REPLACE FUNCTION fn_actualizar_marca_tiempo()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.actualizado_en := NOW();
    RETURN NEW;
END;
$$;

-- Bloquea cualquier intento de UPDATE o DELETE en tablas estrictamente inmutables (Kardex / Auditoría)
CREATE OR REPLACE FUNCTION fn_bloquear_mutacion_inmutable()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    RAISE EXCEPTION 'Operación % no permitida sobre la tabla inmutable %.%',
        TG_OP, TG_TABLE_SCHEMA, TG_TABLE_NAME
        USING ERRCODE = 'restrict_violation';
END;
$$;

-- Impide mezclar un día marcado como descanso con franjas laborales en horarios_barberos
CREATE OR REPLACE FUNCTION fn_validar_coherencia_descanso_barbero()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF NEW.es_descanso = TRUE THEN
        IF EXISTS (
            SELECT 1
            FROM horarios_barberos hb
            WHERE hb.barbero_id = NEW.barbero_id
              AND hb.dia_semana = NEW.dia_semana
              AND hb.horario_id <> NEW.horario_id
              AND hb.es_descanso = FALSE
        ) THEN
            RAISE EXCEPTION 'No se puede marcar el día % como descanso si ya existen franjas laborales configuradas para el barbero %.',
                NEW.dia_semana, NEW.barbero_id
                USING ERRCODE = 'check_violation';
        END IF;
    ELSE
        IF EXISTS (
            SELECT 1
            FROM horarios_barberos hb
            WHERE hb.barbero_id = NEW.barbero_id
              AND hb.dia_semana = NEW.dia_semana
              AND hb.horario_id <> NEW.horario_id
              AND hb.es_descanso = TRUE
        ) THEN
            RAISE EXCEPTION 'No se pueden agregar franjas laborales en el día % porque está marcado como descanso para el barbero %.',
                NEW.dia_semana, NEW.barbero_id
                USING ERRCODE = 'check_violation';
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

-- ----------------------------------------------------------------------------
-- 4. CREACIÓN DE TABLAS (ORDENADAS POR DEPENDENCIAS)
-- ----------------------------------------------------------------------------

-- 4.1 SEDES
CREATE TABLE sedes (
    sede_id                  UUID                 NOT NULL DEFAULT gen_random_uuid(),
    nombre_comercial         VARCHAR(120)         NOT NULL,
    eslogan                  VARCHAR(200)         NULL,
    logo_url                 TEXT                 NULL,
    direccion_fisica         VARCHAR(250)         NOT NULL,
    enlace_mapa_url          TEXT                 NULL,
    telefono_contacto        VARCHAR(20)          NOT NULL,
    correo_contacto          VARCHAR(150)         NOT NULL,
    horario_general_texto    TEXT                 NOT NULL,
    zona_horaria             VARCHAR(50)          NOT NULL DEFAULT 'America/Bogota',
    dias_max_anticipacion    SMALLINT             NOT NULL DEFAULT 30,
    minutos_min_anticipacion SMALLINT             NOT NULL DEFAULT 30,
    estado_inicial_cita      estado_cita_enum     NOT NULL DEFAULT 'pendiente',
    politica_datos_url       TEXT                 NOT NULL,
    estado                   estado_registro_enum NOT NULL DEFAULT 'activo',
    creado_en                TIMESTAMPTZ          NOT NULL DEFAULT NOW(),
    actualizado_en           TIMESTAMPTZ          NOT NULL DEFAULT NOW(),

    CONSTRAINT pk_sedes PRIMARY KEY (sede_id),
    CONSTRAINT chk_sedes_nombre_comercial CHECK (char_length(TRIM(nombre_comercial)) >= 2),
    CONSTRAINT chk_sedes_direccion_fisica CHECK (char_length(TRIM(direccion_fisica)) >= 5),
    CONSTRAINT chk_sedes_telefono_contacto CHECK (char_length(TRIM(telefono_contacto)) >= 7),
    CONSTRAINT chk_sedes_correo_contacto CHECK (correo_contacto = LOWER(TRIM(correo_contacto))),
    CONSTRAINT chk_sedes_horario_general CHECK (char_length(TRIM(horario_general_texto)) >= 5),
    CONSTRAINT chk_sedes_dias_max_anticipacion CHECK (dias_max_anticipacion BETWEEN 7 AND 60),
    CONSTRAINT chk_sedes_minutos_min_anticipacion CHECK (minutos_min_anticipacion BETWEEN 0 AND 1440),
    CONSTRAINT chk_sedes_estado_inicial_cita CHECK (estado_inicial_cita IN ('pendiente', 'confirmada')),
    CONSTRAINT chk_sedes_politica_datos_url CHECK (char_length(TRIM(politica_datos_url)) >= 10)
);

-- 4.2 USUARIOS
CREATE TABLE usuarios (
    usuario_id        UUID                 NOT NULL DEFAULT gen_random_uuid(),
    sede_id           UUID                 NOT NULL,
    correo            VARCHAR(150)         NOT NULL,
    contrasena_hash   TEXT                 NOT NULL,
    rol               rol_usuario_enum     NOT NULL,
    estado            estado_registro_enum NOT NULL DEFAULT 'activo',
    intentos_fallidos SMALLINT             NOT NULL DEFAULT 0,
    bloqueado_hasta   TIMESTAMPTZ          NULL,
    ultimo_acceso_en  TIMESTAMPTZ          NULL,
    creado_en         TIMESTAMPTZ          NOT NULL DEFAULT NOW(),
    actualizado_en    TIMESTAMPTZ          NOT NULL DEFAULT NOW(),

    CONSTRAINT pk_usuarios PRIMARY KEY (usuario_id),
    CONSTRAINT fk_usuarios_sedes FOREIGN KEY (sede_id)
        REFERENCES sedes (sede_id) ON DELETE RESTRICT ON UPDATE RESTRICT,
    CONSTRAINT uq_usuarios_correo UNIQUE (correo),
    CONSTRAINT chk_usuarios_correo_normalizado CHECK (correo = LOWER(TRIM(correo))),
    CONSTRAINT chk_usuarios_contrasena_hash CHECK (char_length(contrasena_hash) >= 50),
    CONSTRAINT chk_usuarios_intentos_fallidos CHECK (intentos_fallidos >= 0)
);

-- 4.3 SESIONES_USUARIOS
CREATE TABLE sesiones_usuarios (
    sesion_id           UUID        NOT NULL DEFAULT gen_random_uuid(),
    usuario_id          UUID        NOT NULL,
    token_hash          TEXT        NOT NULL,
    direccion_ip        INET        NULL,
    agente_usuario      TEXT        NULL,
    ultima_actividad_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expira_en           TIMESTAMPTZ NOT NULL,
    revocada_en         TIMESTAMPTZ NULL,
    creado_en           TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT pk_sesiones_usuarios PRIMARY KEY (sesion_id),
    CONSTRAINT fk_sesiones_usuarios_usuarios FOREIGN KEY (usuario_id)
        REFERENCES usuarios (usuario_id) ON DELETE CASCADE ON UPDATE RESTRICT,
    CONSTRAINT uq_sesiones_usuarios_token_hash UNIQUE (token_hash),
    CONSTRAINT chk_sesiones_usuarios_token_hash CHECK (char_length(token_hash) >= 32),
    CONSTRAINT chk_sesiones_usuarios_expiracion CHECK (expira_en > creado_en)
);

-- 4.4 BARBEROS
CREATE TABLE barberos (
    barbero_id          UUID                 NOT NULL DEFAULT gen_random_uuid(),
    sede_id             UUID                 NOT NULL,
    usuario_id          UUID                 NULL,
    nombre_completo     VARCHAR(120)         NOT NULL,
    nombre_publico      VARCHAR(80)          NULL,
    telefono            VARCHAR(20)          NOT NULL,
    correo              VARCHAR(150)         NOT NULL,
    foto_url            TEXT                 NULL,
    biografia_breve     VARCHAR(200)         NULL,
    porcentaje_comision NUMERIC(5,2)         NULL,
    estado              estado_registro_enum NOT NULL DEFAULT 'activo',
    creado_en           TIMESTAMPTZ          NOT NULL DEFAULT NOW(),
    actualizado_en      TIMESTAMPTZ          NOT NULL DEFAULT NOW(),

    CONSTRAINT pk_barberos PRIMARY KEY (barbero_id),
    CONSTRAINT fk_barberos_sedes FOREIGN KEY (sede_id)
        REFERENCES sedes (sede_id) ON DELETE RESTRICT ON UPDATE RESTRICT,
    CONSTRAINT fk_barberos_usuarios FOREIGN KEY (usuario_id)
        REFERENCES usuarios (usuario_id) ON DELETE RESTRICT ON UPDATE RESTRICT,
    CONSTRAINT uq_barberos_usuario_id UNIQUE (usuario_id),
    CONSTRAINT uq_barberos_correo UNIQUE (correo),
    CONSTRAINT chk_barberos_nombre_completo CHECK (char_length(TRIM(nombre_completo)) >= 3),
    CONSTRAINT chk_barberos_telefono CHECK (char_length(TRIM(telefono)) >= 7),
    CONSTRAINT chk_barberos_correo_normalizado CHECK (correo = LOWER(TRIM(correo))),
    CONSTRAINT chk_barberos_porcentaje_comision CHECK (
        porcentaje_comision IS NULL
        OR (porcentaje_comision >= 0.00 AND porcentaje_comision <= 100.00)
    )
);

-- 4.5 HORARIOS_BARBEROS
CREATE TABLE horarios_barberos (
    horario_id     UUID        NOT NULL DEFAULT gen_random_uuid(),
    barbero_id     UUID        NOT NULL,
    dia_semana     SMALLINT    NOT NULL,
    numero_franja  SMALLINT    NOT NULL DEFAULT 1,
    es_descanso    BOOLEAN     NOT NULL DEFAULT FALSE,
    hora_inicio    TIME        NULL,
    hora_fin       TIME        NULL,
    rango_minutos  INT4RANGE   GENERATED ALWAYS AS (
        CASE
            WHEN es_descanso = FALSE AND hora_inicio IS NOT NULL AND hora_fin IS NOT NULL THEN
                int4range(
                    (EXTRACT(HOUR FROM hora_inicio)::INTEGER * 60 + EXTRACT(MINUTE FROM hora_inicio)::INTEGER),
                    (EXTRACT(HOUR FROM hora_fin)::INTEGER * 60 + EXTRACT(MINUTE FROM hora_fin)::INTEGER),
                    '[)'
                )
            ELSE NULL
        END
    ) STORED,
    creado_en      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    actualizado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT pk_horarios_barberos PRIMARY KEY (horario_id),
    CONSTRAINT fk_horarios_barberos_barberos FOREIGN KEY (barbero_id)
        REFERENCES barberos (barbero_id) ON DELETE CASCADE ON UPDATE RESTRICT,
    CONSTRAINT uq_horarios_barberos_dia_franja UNIQUE (barbero_id, dia_semana, numero_franja),
    CONSTRAINT chk_horarios_barberos_dia_semana CHECK (dia_semana BETWEEN 1 AND 7),
    CONSTRAINT chk_horarios_barberos_numero_franja CHECK (numero_franja IN (1, 2)),
    CONSTRAINT chk_horarios_barberos_descanso_o_franja CHECK (
        (es_descanso = TRUE AND hora_inicio IS NULL AND hora_fin IS NULL AND numero_franja = 1)
        OR
        (es_descanso = FALSE AND hora_inicio IS NOT NULL AND hora_fin IS NOT NULL AND hora_fin > hora_inicio)
    ),
    CONSTRAINT chk_horarios_barberos_bloques_30min CHECK (
        es_descanso = TRUE
        OR (
            EXTRACT(MINUTE FROM hora_inicio) IN (0, 30)
            AND EXTRACT(SECOND FROM hora_inicio) = 0
            AND EXTRACT(MINUTE FROM hora_fin) IN (0, 30)
            AND EXTRACT(SECOND FROM hora_fin) = 0
        )
    ),
    CONSTRAINT excl_horarios_barberos_solapamiento EXCLUDE USING GIST (
        barbero_id WITH =,
        dia_semana WITH =,
        rango_minutos WITH &&
    ) WHERE (es_descanso = FALSE)
);

-- 4.6 BLOQUEOS_HORARIOS
CREATE TABLE bloqueos_horarios (
    bloqueo_id            UUID        NOT NULL DEFAULT gen_random_uuid(),
    sede_id               UUID        NOT NULL,
    barbero_id            UUID        NOT NULL,
    fecha                 DATE        NOT NULL,
    dia_completo          BOOLEAN     NOT NULL DEFAULT FALSE,
    hora_inicio           TIME        NULL,
    hora_fin              TIME        NULL,
    inicio_en             TIMESTAMPTZ NOT NULL,
    fin_en                TIMESTAMPTZ NOT NULL,
    rango_tiempo          TSTZRANGE   GENERATED ALWAYS AS (
        tstzrange(inicio_en, fin_en, '[)')
    ) STORED,
    motivo                VARCHAR(200) NOT NULL,
    activo                BOOLEAN      NOT NULL DEFAULT TRUE,
    creado_por_usuario_id UUID         NOT NULL,
    creado_en             TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    actualizado_en        TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

    CONSTRAINT pk_bloqueos_horarios PRIMARY KEY (bloqueo_id),
    CONSTRAINT fk_bloqueos_horarios_sedes FOREIGN KEY (sede_id)
        REFERENCES sedes (sede_id) ON DELETE RESTRICT ON UPDATE RESTRICT,
    CONSTRAINT fk_bloqueos_horarios_barberos FOREIGN KEY (barbero_id)
        REFERENCES barberos (barbero_id) ON DELETE RESTRICT ON UPDATE RESTRICT,
    CONSTRAINT fk_bloqueos_horarios_usuarios FOREIGN KEY (creado_por_usuario_id)
        REFERENCES usuarios (usuario_id) ON DELETE RESTRICT ON UPDATE RESTRICT,
    CONSTRAINT chk_bloqueos_horarios_motivo CHECK (char_length(TRIM(motivo)) >= 3),
    CONSTRAINT chk_bloqueos_horarios_rango_utc CHECK (fin_en > inicio_en),
    CONSTRAINT chk_bloqueos_horarios_dia_o_franja CHECK (
        (dia_completo = TRUE AND hora_inicio IS NULL AND hora_fin IS NULL)
        OR
        (
            dia_completo = FALSE
            AND hora_inicio IS NOT NULL
            AND hora_fin IS NOT NULL
            AND hora_fin > hora_inicio
            AND EXTRACT(MINUTE FROM hora_inicio) IN (0, 30)
            AND EXTRACT(SECOND FROM hora_inicio) = 0
            AND EXTRACT(MINUTE FROM hora_fin) IN (0, 30)
            AND EXTRACT(SECOND FROM hora_fin) = 0
        )
    ),
    CONSTRAINT excl_bloqueos_horarios_solapamiento EXCLUDE USING GIST (
        barbero_id WITH =,
        rango_tiempo WITH &&
    ) WHERE (activo = TRUE)
);

-- 4.7 SERVICIOS
CREATE TABLE servicios (
    servicio_id       UUID                 NOT NULL DEFAULT gen_random_uuid(),
    sede_id           UUID                 NOT NULL,
    nombre            VARCHAR(80)          NOT NULL,
    descripcion_breve VARCHAR(250)         NULL,
    precio_cop        NUMERIC(12,0)        NOT NULL,
    duracion_bloques  SMALLINT             NOT NULL DEFAULT 1,
    visible_publico   BOOLEAN              NOT NULL DEFAULT TRUE,
    estado            estado_registro_enum NOT NULL DEFAULT 'activo',
    orden_visual      SMALLINT             NOT NULL DEFAULT 0,
    creado_en         TIMESTAMPTZ          NOT NULL DEFAULT NOW(),
    actualizado_en    TIMESTAMPTZ          NOT NULL DEFAULT NOW(),

    CONSTRAINT pk_servicios PRIMARY KEY (servicio_id),
    CONSTRAINT fk_servicios_sedes FOREIGN KEY (sede_id)
        REFERENCES sedes (sede_id) ON DELETE RESTRICT ON UPDATE RESTRICT,
    CONSTRAINT chk_servicios_nombre CHECK (char_length(TRIM(nombre)) >= 2),
    CONSTRAINT chk_servicios_precio_cop CHECK (precio_cop > 0),
    CONSTRAINT chk_servicios_duracion_bloques CHECK (duracion_bloques BETWEEN 1 AND 6),
    CONSTRAINT chk_servicios_orden_visual CHECK (orden_visual >= 0)
);

-- 4.8 CLIENTES
CREATE TABLE clientes (
    cliente_id               UUID         NOT NULL DEFAULT gen_random_uuid(),
    sede_id                  UUID         NOT NULL,
    nombre_completo          VARCHAR(100) NOT NULL,
    telefono_whatsapp        VARCHAR(20)  NOT NULL,
    correo                   VARCHAR(150) NOT NULL,
    acepto_politica_datos_en TIMESTAMPTZ  NULL,
    creado_en                TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    actualizado_en           TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

    CONSTRAINT pk_clientes PRIMARY KEY (cliente_id),
    CONSTRAINT fk_clientes_sedes FOREIGN KEY (sede_id)
        REFERENCES sedes (sede_id) ON DELETE RESTRICT ON UPDATE RESTRICT,
    CONSTRAINT uq_clientes_sede_correo UNIQUE (sede_id, correo),
    CONSTRAINT chk_clientes_nombre_completo CHECK (char_length(TRIM(nombre_completo)) >= 3),
    CONSTRAINT chk_clientes_telefono_whatsapp CHECK (char_length(TRIM(telefono_whatsapp)) >= 10),
    CONSTRAINT chk_clientes_correo_normalizado CHECK (correo = LOWER(TRIM(correo)))
);

-- 4.9 CITAS
CREATE TABLE citas (
    cita_id                          UUID             NOT NULL DEFAULT gen_random_uuid(),
    sede_id                          UUID             NOT NULL,
    codigo_reserva                   VARCHAR(12)      NOT NULL,
    cliente_id                       UUID             NOT NULL,
    barbero_id                       UUID             NOT NULL,
    barbero_asignado_automaticamente BOOLEAN          NOT NULL DEFAULT FALSE,
    fecha                            DATE             NOT NULL,
    hora_inicio                      TIME             NOT NULL,
    hora_fin                         TIME             NOT NULL,
    inicio_en                        TIMESTAMPTZ      NOT NULL,
    fin_en                           TIMESTAMPTZ      NOT NULL,
    rango_tiempo                     TSTZRANGE        GENERATED ALWAYS AS (
        tstzrange(inicio_en, fin_en, '[)')
    ) STORED,
    bloques_totales                  SMALLINT         NOT NULL,
    precio_estimado_cop              NUMERIC(12,0)    NOT NULL,
    estado                           estado_cita_enum NOT NULL DEFAULT 'pendiente',
    notas_cliente                    VARCHAR(200)     NULL,
    motivo_cancelacion               VARCHAR(250)     NULL,
    origen                           origen_cita_enum NOT NULL DEFAULT 'landing',
    creado_por_usuario_id            UUID             NULL,
    creado_en                        TIMESTAMPTZ      NOT NULL DEFAULT NOW(),
    actualizado_en                   TIMESTAMPTZ      NOT NULL DEFAULT NOW(),

    CONSTRAINT pk_citas PRIMARY KEY (cita_id),
    CONSTRAINT fk_citas_sedes FOREIGN KEY (sede_id)
        REFERENCES sedes (sede_id) ON DELETE RESTRICT ON UPDATE RESTRICT,
    CONSTRAINT fk_citas_clientes FOREIGN KEY (cliente_id)
        REFERENCES clientes (cliente_id) ON DELETE RESTRICT ON UPDATE RESTRICT,
    CONSTRAINT fk_citas_barberos FOREIGN KEY (barbero_id)
        REFERENCES barberos (barbero_id) ON DELETE RESTRICT ON UPDATE RESTRICT,
    CONSTRAINT fk_citas_usuarios FOREIGN KEY (creado_por_usuario_id)
        REFERENCES usuarios (usuario_id) ON DELETE RESTRICT ON UPDATE RESTRICT,
    CONSTRAINT uq_citas_codigo_reserva UNIQUE (codigo_reserva),
    CONSTRAINT chk_citas_codigo_reserva CHECK (codigo_reserva ~ '^SB-[A-HJ-NP-Z2-9]{6}$'),
    CONSTRAINT chk_citas_bloques_totales CHECK (bloques_totales >= 1),
    CONSTRAINT chk_citas_precio_estimado_cop CHECK (precio_estimado_cop > 0),
    CONSTRAINT chk_citas_horas_locales CHECK (
        hora_fin > hora_inicio
        AND EXTRACT(MINUTE FROM hora_inicio) IN (0, 30)
        AND EXTRACT(SECOND FROM hora_inicio) = 0
        AND EXTRACT(MINUTE FROM hora_fin) IN (0, 30)
        AND EXTRACT(SECOND FROM hora_fin) = 0
    ),
    CONSTRAINT chk_citas_duracion_utc_exacta CHECK (
        fin_en = inicio_en + (bloques_totales * INTERVAL '30 minutes')
    ),
    CONSTRAINT chk_citas_motivo_cancelacion CHECK (
        estado = 'cancelada' OR motivo_cancelacion IS NULL
    ),
    CONSTRAINT chk_citas_origen_usuario CHECK (
        (origen = 'landing' AND creado_por_usuario_id IS NULL)
        OR
        (origen = 'backoffice' AND creado_por_usuario_id IS NOT NULL)
    ),
    -- RN-01: Prevención estricta y atómica de solapamiento de citas activas por barbero
    CONSTRAINT excl_citas_barbero_solapamiento EXCLUDE USING GIST (
        barbero_id WITH =,
        rango_tiempo WITH &&
    ) WHERE (estado IN ('pendiente', 'confirmada'))
);

-- 4.10 CITAS_SERVICIOS
CREATE TABLE citas_servicios (
    cita_servicio_id          UUID          NOT NULL DEFAULT gen_random_uuid(),
    cita_id                   UUID          NOT NULL,
    servicio_id               UUID          NOT NULL,
    nombre_servicio_snapshot  VARCHAR(80)   NOT NULL,
    precio_cop_snapshot       NUMERIC(12,0) NOT NULL,
    duracion_bloques_snapshot SMALLINT      NOT NULL,
    creado_en                 TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

    CONSTRAINT pk_citas_servicios PRIMARY KEY (cita_servicio_id),
    CONSTRAINT fk_citas_servicios_citas FOREIGN KEY (cita_id)
        REFERENCES citas (cita_id) ON DELETE RESTRICT ON UPDATE RESTRICT,
    CONSTRAINT fk_citas_servicios_servicios FOREIGN KEY (servicio_id)
        REFERENCES servicios (servicio_id) ON DELETE RESTRICT ON UPDATE RESTRICT,
    CONSTRAINT uq_citas_servicios_cita_servicio UNIQUE (cita_id, servicio_id),
    CONSTRAINT chk_citas_servicios_nombre_snapshot CHECK (char_length(TRIM(nombre_servicio_snapshot)) >= 2),
    CONSTRAINT chk_citas_servicios_precio_snapshot CHECK (precio_cop_snapshot > 0),
    CONSTRAINT chk_citas_servicios_bloques_snapshot CHECK (duracion_bloques_snapshot BETWEEN 1 AND 6)
);

-- 4.11 HISTORIAL_ESTADOS_CITAS
CREATE TABLE historial_estados_citas (
    historial_id            UUID             NOT NULL DEFAULT gen_random_uuid(),
    cita_id                 UUID             NOT NULL,
    estado_anterior         estado_cita_enum NULL,
    estado_nuevo            estado_cita_enum NOT NULL,
    observacion             VARCHAR(250)     NULL,
    cambiado_por_usuario_id UUID             NULL,
    cambiado_en             TIMESTAMPTZ      NOT NULL DEFAULT NOW(),

    CONSTRAINT pk_historial_estados_citas PRIMARY KEY (historial_id),
    CONSTRAINT fk_historial_estados_citas_citas FOREIGN KEY (cita_id)
        REFERENCES citas (cita_id) ON DELETE RESTRICT ON UPDATE RESTRICT,
    CONSTRAINT fk_historial_estados_citas_usuarios FOREIGN KEY (cambiado_por_usuario_id)
        REFERENCES usuarios (usuario_id) ON DELETE RESTRICT ON UPDATE RESTRICT,
    CONSTRAINT chk_historial_estados_citas_cambio CHECK (
        estado_anterior IS NULL OR estado_anterior <> estado_nuevo
    )
);

-- 4.12 NOTIFICACIONES_CORREO
CREATE TABLE notificaciones_correo (
    notificacion_id      UUID                     NOT NULL DEFAULT gen_random_uuid(),
    sede_id              UUID                     NOT NULL,
    cita_id              UUID                     NOT NULL,
    correo_destino       VARCHAR(150)             NOT NULL,
    asunto               VARCHAR(200)             NOT NULL,
    estado               estado_notificacion_enum NOT NULL DEFAULT 'pendiente',
    intentos             SMALLINT                 NOT NULL DEFAULT 0,
    ultimo_error         TEXT                     NULL,
    proximo_reintento_en TIMESTAMPTZ              NULL DEFAULT NOW(),
    enviada_en           TIMESTAMPTZ              NULL,
    creado_en            TIMESTAMPTZ              NOT NULL DEFAULT NOW(),
    actualizado_en       TIMESTAMPTZ              NOT NULL DEFAULT NOW(),

    CONSTRAINT pk_notificaciones_correo PRIMARY KEY (notificacion_id),
    CONSTRAINT fk_notificaciones_correo_sedes FOREIGN KEY (sede_id)
        REFERENCES sedes (sede_id) ON DELETE RESTRICT ON UPDATE RESTRICT,
    CONSTRAINT fk_notificaciones_correo_citas FOREIGN KEY (cita_id)
        REFERENCES citas (cita_id) ON DELETE RESTRICT ON UPDATE RESTRICT,
    CONSTRAINT chk_notificaciones_correo_destino CHECK (correo_destino = LOWER(TRIM(correo_destino))),
    CONSTRAINT chk_notificaciones_correo_asunto CHECK (char_length(TRIM(asunto)) >= 3),
    CONSTRAINT chk_notificaciones_correo_intentos CHECK (intentos BETWEEN 0 AND 3),
    CONSTRAINT chk_notificaciones_correo_enviada CHECK (
        (estado = 'enviada' AND enviada_en IS NOT NULL)
        OR
        (estado <> 'enviada' AND enviada_en IS NULL)
    )
);

-- 4.13 REGISTROS_CORTES
CREATE TABLE registros_cortes (
    registro_corte_id            UUID              NOT NULL DEFAULT gen_random_uuid(),
    sede_id                      UUID              NOT NULL,
    cita_id                      UUID              NULL,
    barbero_id                   UUID              NOT NULL,
    cliente_id                   UUID              NULL,
    nombre_cliente_referencial   VARCHAR(100)      NULL,
    origen                       origen_corte_enum NOT NULL,
    fecha_hora_atencion          TIMESTAMPTZ       NOT NULL DEFAULT NOW(),
    precio_calculado_cop         NUMERIC(12,0)     NOT NULL,
    precio_cobrado_cop           NUMERIC(12,0)     NOT NULL,
    metodo_pago                  metodo_pago_enum  NOT NULL,
    porcentaje_comision_snapshot NUMERIC(5,2)      NOT NULL DEFAULT 0.00,
    comision_calculada_cop       NUMERIC(12,0)     NOT NULL DEFAULT 0,
    notas                        VARCHAR(300)      NULL,
    estado                       estado_corte_enum NOT NULL DEFAULT 'activo',
    motivo_anulacion             VARCHAR(250)      NULL,
    anulado_por_usuario_id       UUID              NULL,
    anulado_en                   TIMESTAMPTZ       NULL,
    registrado_por_usuario_id    UUID              NOT NULL,
    creado_en                    TIMESTAMPTZ       NOT NULL DEFAULT NOW(),
    actualizado_en               TIMESTAMPTZ       NOT NULL DEFAULT NOW(),

    CONSTRAINT pk_registros_cortes PRIMARY KEY (registro_corte_id),
    CONSTRAINT fk_registros_cortes_sedes FOREIGN KEY (sede_id)
        REFERENCES sedes (sede_id) ON DELETE RESTRICT ON UPDATE RESTRICT,
    CONSTRAINT fk_registros_cortes_citas FOREIGN KEY (cita_id)
        REFERENCES citas (cita_id) ON DELETE RESTRICT ON UPDATE RESTRICT,
    CONSTRAINT fk_registros_cortes_barberos FOREIGN KEY (barbero_id)
        REFERENCES barberos (barbero_id) ON DELETE RESTRICT ON UPDATE RESTRICT,
    CONSTRAINT fk_registros_cortes_clientes FOREIGN KEY (cliente_id)
        REFERENCES clientes (cliente_id) ON DELETE RESTRICT ON UPDATE RESTRICT,
    CONSTRAINT fk_registros_cortes_usuarios_registro FOREIGN KEY (registrado_por_usuario_id)
        REFERENCES usuarios (usuario_id) ON DELETE RESTRICT ON UPDATE RESTRICT,
    CONSTRAINT fk_registros_cortes_usuarios_anulacion FOREIGN KEY (anulado_por_usuario_id)
        REFERENCES usuarios (usuario_id) ON DELETE RESTRICT ON UPDATE RESTRICT,
    CONSTRAINT chk_registros_cortes_origen_cita CHECK (
        (origen = 'cita' AND cita_id IS NOT NULL)
        OR
        (origen = 'walk_in' AND cita_id IS NULL)
    ),
    CONSTRAINT chk_registros_cortes_precios CHECK (
        precio_calculado_cop > 0 AND precio_cobrado_cop >= 0
    ),
    CONSTRAINT chk_registros_cortes_comision CHECK (
        porcentaje_comision_snapshot >= 0.00
        AND porcentaje_comision_snapshot <= 100.00
        AND comision_calculada_cop >= 0
    ),
    -- RN-15: Todo ajuste manual de precio exige nota justificativa
    CONSTRAINT chk_registros_cortes_notas_ajuste CHECK (
        precio_cobrado_cop = precio_calculado_cop
        OR (notas IS NOT NULL AND char_length(TRIM(notas)) >= 5)
    ),
    -- RF-COR-05: La anulación exige motivo (>= 10 caracteres), usuario y marca temporal
    CONSTRAINT chk_registros_cortes_anulacion CHECK (
        (
            estado = 'activo'
            AND motivo_anulacion IS NULL
            AND anulado_por_usuario_id IS NULL
            AND anulado_en IS NULL
        )
        OR
        (
            estado = 'anulado'
            AND motivo_anulacion IS NOT NULL
            AND char_length(TRIM(motivo_anulacion)) >= 10
            AND anulado_por_usuario_id IS NOT NULL
            AND anulado_en IS NOT NULL
        )
    )
);

-- 4.14 REGISTROS_CORTES_SERVICIOS
CREATE TABLE registros_cortes_servicios (
    registro_corte_servicio_id UUID          NOT NULL DEFAULT gen_random_uuid(),
    registro_corte_id          UUID          NOT NULL,
    servicio_id                UUID          NOT NULL,
    nombre_servicio_snapshot   VARCHAR(80)   NOT NULL,
    precio_cop_snapshot        NUMERIC(12,0) NOT NULL,
    creado_en                  TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

    CONSTRAINT pk_registros_cortes_servicios PRIMARY KEY (registro_corte_servicio_id),
    CONSTRAINT fk_registros_cortes_servicios_cortes FOREIGN KEY (registro_corte_id)
        REFERENCES registros_cortes (registro_corte_id) ON DELETE RESTRICT ON UPDATE RESTRICT,
    CONSTRAINT fk_registros_cortes_servicios_servicios FOREIGN KEY (servicio_id)
        REFERENCES servicios (servicio_id) ON DELETE RESTRICT ON UPDATE RESTRICT,
    CONSTRAINT uq_registros_cortes_servicios_corte_servicio UNIQUE (registro_corte_id, servicio_id),
    CONSTRAINT chk_registros_cortes_servicios_nombre CHECK (char_length(TRIM(nombre_servicio_snapshot)) >= 2),
    CONSTRAINT chk_registros_cortes_servicios_precio CHECK (precio_cop_snapshot > 0)
);

-- 4.15 PRODUCTOS_INVENTARIO
CREATE TABLE productos_inventario (
    producto_id        UUID                 NOT NULL DEFAULT gen_random_uuid(),
    sede_id            UUID                 NOT NULL,
    sku                VARCHAR(50)          NULL,
    nombre             VARCHAR(100)         NOT NULL,
    categoria          VARCHAR(60)          NOT NULL,
    precio_venta_cop   NUMERIC(12,0)        NOT NULL,
    costo_unitario_cop NUMERIC(12,0)        NULL,
    stock_actual       INTEGER              NOT NULL DEFAULT 0,
    stock_minimo       INTEGER              NOT NULL DEFAULT 0,
    estado             estado_registro_enum NOT NULL DEFAULT 'activo',
    creado_en          TIMESTAMPTZ          NOT NULL DEFAULT NOW(),
    actualizado_en     TIMESTAMPTZ          NOT NULL DEFAULT NOW(),

    CONSTRAINT pk_productos_inventario PRIMARY KEY (producto_id),
    CONSTRAINT fk_productos_inventario_sedes FOREIGN KEY (sede_id)
        REFERENCES sedes (sede_id) ON DELETE RESTRICT ON UPDATE RESTRICT,
    CONSTRAINT chk_productos_inventario_nombre CHECK (char_length(TRIM(nombre)) >= 2),
    CONSTRAINT chk_productos_inventario_categoria CHECK (char_length(TRIM(categoria)) >= 2),
    CONSTRAINT chk_productos_inventario_sku CHECK (sku IS NULL OR char_length(TRIM(sku)) >= 2),
    CONSTRAINT chk_productos_inventario_precio_venta CHECK (precio_venta_cop > 0),
    CONSTRAINT chk_productos_inventario_costo_unitario CHECK (
        costo_unitario_cop IS NULL OR costo_unitario_cop >= 0
    ),
    -- RN-10: Prohibición absoluta de stock negativo
    CONSTRAINT chk_productos_inventario_stock_no_negativo CHECK (stock_actual >= 0),
    CONSTRAINT chk_productos_inventario_stock_minimo CHECK (stock_minimo >= 0)
);

-- 4.16 MOVIMIENTOS_INVENTARIO
CREATE TABLE movimientos_inventario (
    movimiento_id       UUID                                NOT NULL DEFAULT gen_random_uuid(),
    sede_id             UUID                                NOT NULL,
    producto_id         UUID                                NOT NULL,
    tipo                tipo_movimiento_inventario_enum     NOT NULL,
    subtipo             subtipo_movimiento_inventario_enum  NOT NULL,
    cantidad            INTEGER                             NOT NULL,
    stock_anterior      INTEGER                             NOT NULL,
    stock_resultante    INTEGER                             NOT NULL,
    costo_unitario_cop  NUMERIC(12,0)                       NULL,
    precio_unitario_cop NUMERIC(12,0)                       NULL,
    valor_total_cop     NUMERIC(12,0)                       NULL,
    metodo_pago         metodo_pago_enum                    NULL,
    registro_corte_id   UUID                                NULL,
    observacion         VARCHAR(200)                        NULL,
    usuario_id          UUID                                NOT NULL,
    creado_en           TIMESTAMPTZ                         NOT NULL DEFAULT NOW(),

    CONSTRAINT pk_movimientos_inventario PRIMARY KEY (movimiento_id),
    CONSTRAINT fk_movimientos_inventario_sedes FOREIGN KEY (sede_id)
        REFERENCES sedes (sede_id) ON DELETE RESTRICT ON UPDATE RESTRICT,
    CONSTRAINT fk_movimientos_inventario_productos FOREIGN KEY (producto_id)
        REFERENCES productos_inventario (producto_id) ON DELETE RESTRICT ON UPDATE RESTRICT,
    CONSTRAINT fk_movimientos_inventario_cortes FOREIGN KEY (registro_corte_id)
        REFERENCES registros_cortes (registro_corte_id) ON DELETE RESTRICT ON UPDATE RESTRICT,
    CONSTRAINT fk_movimientos_inventario_usuarios FOREIGN KEY (usuario_id)
        REFERENCES usuarios (usuario_id) ON DELETE RESTRICT ON UPDATE RESTRICT,
    CONSTRAINT chk_movimientos_inventario_tipo_subtipo CHECK (
        (tipo = 'entrada' AND subtipo IN ('inventario_inicial', 'compra_reposicion', 'ajuste_positivo'))
        OR
        (tipo = 'salida' AND subtipo IN ('venta_publico', 'consumo_interno', 'ajuste_negativo'))
    ),
    CONSTRAINT chk_movimientos_inventario_cantidad CHECK (cantidad > 0),
    CONSTRAINT chk_movimientos_inventario_saldos CHECK (
        stock_anterior >= 0
        AND stock_resultante >= 0
        AND (
            (tipo = 'entrada' AND stock_resultante = stock_anterior + cantidad)
            OR
            (tipo = 'salida' AND stock_resultante = stock_anterior - cantidad)
        )
    ),
    CONSTRAINT chk_movimientos_inventario_costos CHECK (
        (costo_unitario_cop IS NULL OR costo_unitario_cop >= 0)
        AND (precio_unitario_cop IS NULL OR precio_unitario_cop > 0)
        AND (valor_total_cop IS NULL OR valor_total_cop >= 0)
    ),
    CONSTRAINT chk_movimientos_inventario_venta_pago CHECK (
        (
            subtipo = 'venta_publico'
            AND metodo_pago IS NOT NULL
            AND precio_unitario_cop IS NOT NULL
            AND valor_total_cop = precio_unitario_cop * cantidad
        )
        OR
        (
            subtipo <> 'venta_publico'
            AND metodo_pago IS NULL
        )
    ),
    CONSTRAINT chk_movimientos_inventario_corte_solo_salida CHECK (
        registro_corte_id IS NULL OR tipo = 'salida'
    )
);

-- ----------------------------------------------------------------------------
-- 5. ÍNDICES ESTRATÉGICOS Y UNICIDADES PARCIALES
-- ----------------------------------------------------------------------------

-- Usuarios y sesiones
CREATE INDEX idx_usuarios_sede_rol_activo
    ON usuarios (sede_id, rol)
    WHERE (estado = 'activo');

CREATE INDEX idx_sesiones_usuarios_activas
    ON sesiones_usuarios (usuario_id, expira_en)
    WHERE (revocada_en IS NULL);

-- Barberos, horarios y bloqueos
CREATE INDEX idx_barberos_activos_sede
    ON barberos (sede_id, nombre_completo)
    WHERE (estado = 'activo');

CREATE INDEX idx_horarios_barberos_consulta
    ON horarios_barberos (barbero_id, dia_semana)
    INCLUDE (es_descanso, hora_inicio, hora_fin);

CREATE INDEX idx_bloqueos_horarios_fecha
    ON bloqueos_horarios (barbero_id, fecha)
    WHERE (activo = TRUE);

-- Servicios
CREATE UNIQUE INDEX uq_servicios_sede_nombre_activo
    ON servicios (sede_id, LOWER(TRIM(nombre)))
    WHERE (estado = 'activo');

CREATE INDEX idx_servicios_landing_publico
    ON servicios (sede_id, orden_visual, nombre)
    WHERE (estado = 'activo' AND visible_publico = TRUE);

-- Clientes
CREATE INDEX idx_clientes_sede_telefono
    ON clientes (sede_id, telefono_whatsapp);

-- Citas y trazabilidad
CREATE INDEX idx_citas_disponibilidad_fecha
    ON citas (sede_id, fecha, barbero_id)
    INCLUDE (hora_inicio, hora_fin, bloques_totales, estado)
    WHERE (estado IN ('pendiente', 'confirmada'));

CREATE INDEX idx_citas_agenda_sede_fecha
    ON citas (sede_id, fecha, hora_inicio, barbero_id);

CREATE INDEX idx_citas_cliente_activas
    ON citas (cliente_id, fecha)
    WHERE (estado IN ('pendiente', 'confirmada'));

CREATE INDEX idx_citas_servicios_servicio_id
    ON citas_servicios (servicio_id);

CREATE INDEX idx_historial_estados_citas_cita_fecha
    ON historial_estados_citas (cita_id, cambiado_en DESC);

CREATE INDEX idx_notificaciones_correo_cola
    ON notificaciones_correo (proximo_reintento_en, creado_en)
    WHERE (estado = 'pendiente');

CREATE INDEX idx_notificaciones_correo_cita_id
    ON notificaciones_correo (cita_id);

-- Registros de cortes (Caja)
-- RN-08: Exactamente un registro de corte ACTIVO por cita
CREATE UNIQUE INDEX uq_registros_cortes_cita_activa
    ON registros_cortes (cita_id)
    WHERE (cita_id IS NOT NULL AND estado = 'activo');

CREATE INDEX idx_registros_cortes_reporte_diario
    ON registros_cortes (sede_id, fecha_hora_atencion DESC, barbero_id)
    INCLUDE (precio_cobrado_cop, metodo_pago, comision_calculada_cop, origen)
    WHERE (estado = 'activo');

CREATE INDEX idx_registros_cortes_barbero_historial
    ON registros_cortes (barbero_id, fecha_hora_atencion DESC);

CREATE INDEX idx_registros_cortes_servicios_servicio_id
    ON registros_cortes_servicios (servicio_id);

-- Inventario y Kardex
CREATE UNIQUE INDEX uq_productos_inventario_sede_sku
    ON productos_inventario (sede_id, LOWER(TRIM(sku)))
    WHERE (sku IS NOT NULL);

-- RN-11: Índice parcial para alertas instantáneas de Stock Bajo y Agotado
CREATE INDEX idx_productos_inventario_alerta_stock
    ON productos_inventario (sede_id, stock_actual)
    WHERE (estado = 'activo' AND stock_actual <= stock_minimo);

CREATE INDEX idx_movimientos_inventario_kardex
    ON movimientos_inventario (sede_id, producto_id, creado_en DESC);

CREATE INDEX idx_movimientos_inventario_fecha_tipo
    ON movimientos_inventario (sede_id, creado_en DESC, tipo);

CREATE INDEX idx_movimientos_inventario_corte_id
    ON movimientos_inventario (registro_corte_id)
    WHERE (registro_corte_id IS NOT NULL);

-- ----------------------------------------------------------------------------
-- 6. TRIGGERS DE AUDITORÍA E INTEGRIDAD
-- ----------------------------------------------------------------------------

-- Triggers de actualización automática de actualizado_en
CREATE TRIGGER trg_sedes_actualizado_en
    BEFORE UPDATE ON sedes
    FOR EACH ROW EXECUTE FUNCTION fn_actualizar_marca_tiempo();

CREATE TRIGGER trg_usuarios_actualizado_en
    BEFORE UPDATE ON usuarios
    FOR EACH ROW EXECUTE FUNCTION fn_actualizar_marca_tiempo();

CREATE TRIGGER trg_barberos_actualizado_en
    BEFORE UPDATE ON barberos
    FOR EACH ROW EXECUTE FUNCTION fn_actualizar_marca_tiempo();

CREATE TRIGGER trg_horarios_barberos_actualizado_en
    BEFORE UPDATE ON horarios_barberos
    FOR EACH ROW EXECUTE FUNCTION fn_actualizar_marca_tiempo();

CREATE TRIGGER trg_bloqueos_horarios_actualizado_en
    BEFORE UPDATE ON bloqueos_horarios
    FOR EACH ROW EXECUTE FUNCTION fn_actualizar_marca_tiempo();

CREATE TRIGGER trg_servicios_actualizado_en
    BEFORE UPDATE ON servicios
    FOR EACH ROW EXECUTE FUNCTION fn_actualizar_marca_tiempo();

CREATE TRIGGER trg_clientes_actualizado_en
    BEFORE UPDATE ON clientes
    FOR EACH ROW EXECUTE FUNCTION fn_actualizar_marca_tiempo();

CREATE TRIGGER trg_citas_actualizado_en
    BEFORE UPDATE ON citas
    FOR EACH ROW EXECUTE FUNCTION fn_actualizar_marca_tiempo();

CREATE TRIGGER trg_notificaciones_correo_actualizado_en
    BEFORE UPDATE ON notificaciones_correo
    FOR EACH ROW EXECUTE FUNCTION fn_actualizar_marca_tiempo();

CREATE TRIGGER trg_registros_cortes_actualizado_en
    BEFORE UPDATE ON registros_cortes
    FOR EACH ROW EXECUTE FUNCTION fn_actualizar_marca_tiempo();

CREATE TRIGGER trg_productos_inventario_actualizado_en
    BEFORE UPDATE ON productos_inventario
    FOR EACH ROW EXECUTE FUNCTION fn_actualizar_marca_tiempo();

-- Trigger de coherencia entre día de descanso y turnos laborales
CREATE TRIGGER trg_horarios_barberos_coherencia_descanso
    BEFORE INSERT OR UPDATE ON horarios_barberos
    FOR EACH ROW EXECUTE FUNCTION fn_validar_coherencia_descanso_barbero();

-- Triggers de inmutabilidad absoluta (RF-INV-05 y RF-AGE-07)
CREATE TRIGGER trg_movimientos_inventario_inmutable
    BEFORE UPDATE OR DELETE ON movimientos_inventario
    FOR EACH ROW EXECUTE FUNCTION fn_bloquear_mutacion_inmutable();

CREATE TRIGGER trg_historial_estados_citas_inmutable
    BEFORE UPDATE OR DELETE ON historial_estados_citas
    FOR EACH ROW EXECUTE FUNCTION fn_bloquear_mutacion_inmutable();

-- ----------------------------------------------------------------------------
-- 7. COMENTARIOS NATIVOS DE DOCUMENTACIÓN EN BASE DE DATOS
-- ----------------------------------------------------------------------------
COMMENT ON TABLE sedes IS 'Configuración global e identidad comercial de la barbería (arquitectura preparada para multi-sede).';
COMMENT ON TABLE citas IS 'Reservas de agenda con control nativo de concurrencia mediante EXCLUDE USING GIST sobre rango_tiempo (RN-01).';
COMMENT ON COLUMN citas.rango_tiempo IS 'Rango semiabierto [inicio_en, fin_en) en UTC que previene solapamiento de citas activas por barbero.';
COMMENT ON COLUMN citas.codigo_reserva IS 'Código único legible formato SB-XXXXXX excluyendo caracteres confusos O, 0, I, 1 (RF-AGE-06).';
COMMENT ON TABLE registros_cortes IS 'Transacciones operativas de caja provenientes de citas completadas o clientes walk-in; jamás se eliminan físicamente (RN-13).';
COMMENT ON COLUMN registros_cortes.porcentaje_comision_snapshot IS 'Instantánea inmutable del porcentaje de comisión del barbero al momento del servicio (RN-12).';
COMMENT ON TABLE productos_inventario IS 'Catálogo de productos de venta y consumo interno con protección estricta contra stock negativo (RN-10).';
COMMENT ON COLUMN productos_inventario.stock_actual IS 'Existencias actuales actualizadas únicamente en transacción ACID junto a movimientos_inventario.';
COMMENT ON TABLE movimientos_inventario IS 'Kardex cronológico estrictamente inmutable (append-only) protegido por trigger contra UPDATE y DELETE (RF-INV-05).';
COMMENT ON TABLE notificaciones_correo IS 'Cola transaccional (Outbox) para envío asíncrono y hasta 3 reintentos de confirmaciones de cita (CU-01 FA-03).';

COMMIT;
```