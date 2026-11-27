# Especificación de Requerimientos de Software (ERS) — SmartBarber

**Estándar de referencia:** ISO/IEC/IEEE 29148:2018 (Ingeniería de Sistemas y Software — Procesos del Ciclo de Vida — Ingeniería de Requerimientos)  
**Proyecto:** SmartBarber — Sistema de Gestión Operativa y Agendamiento para Barbería  
**Versión del documento:** 1.0  
**Fecha de emisión:** 20 de noviembre de 2026  
**Moneda base:** Peso Colombiano (COP)  
**Zona horaria operativa:** UTC-5 (`America/Bogota`)

---

## 1. Control de Versiones e Introducción

### Control de Versiones

| Versión | Fecha | Autor / Rol | Descripción de Cambios | Estado |
| :--- | :--- | :--- | :--- | :--- |
| 1.0 | 2026-11-20 | Analista de Sistemas Senior / Arquitecto de Software | Emisión inicial completa de la especificación de requerimientos para el Producto Mínimo Viable (MVP) de SmartBarber, integrando el módulo administrativo (Backoffice) y el portal público de agendamiento (Landing Page). | Aprobación pendiente |

### 1.1 Propósito del documento

El presente documento establece de manera formal, completa, verificable y libre de ambigüedades los requerimientos funcionales, las reglas de negocio, los requerimientos no funcionales, el modelo conceptual de datos y los flujos críticos del sistema de software **SmartBarber**.

Este documento está dirigido a:
- **Propietario / Administrador del negocio:** para validar que el alcance operativo y las reglas de negocio reflejan con precisión la operación diaria de la barbería.
- **Arquitectos y desarrolladores de software:** como fuente única de verdad agnóstica a la implementación para el diseño técnico y la construcción del sistema.
- **Ingenieros de aseguramiento de calidad (QA):** como base contractual para diseñar casos de prueba funcionales, de concurrencia, de seguridad y de aceptación.

### 1.2 Alcance del sistema

**SmartBarber** es una solución de software orientada a la operación diaria de una barbería independiente de una (1) sola sede física, diseñada con una arquitectura de datos preparada para escalar a múltiples sedes en versiones posteriores. El sistema integra dos frentes desacoplados a nivel de interfaz de usuario pero sincronizados en tiempo real sobre un núcleo de datos compartido:

1. **Sistema Interno de Gestión (Backoffice / Panel Administrativo):** aplicación de acceso restringido para el Administrador/Dueño y los Barberos, enfocada en la operación de caja/registro de cortes, administración del equipo de barberos y sus horarios, catálogo de servicios, control de inventario de productos al por menor y gestión del ciclo de vida de las citas.
2. **Portal Público de Agendamiento (Landing Page):** aplicación web pública orientada al cliente final, optimizada para dispositivos móviles (*Mobile-First*), que exhibe la identidad y catálogo de la barbería y permite reservar citas en línea sin requerir creación de cuenta ni inicio de sesión obligatorio.

#### Elementos DENTRO del alcance (Versión 1.0 — MVP)

- **Registro de cortes y servicios realizados:** registro operativo de atenciones provenientes de citas agendadas y de clientes sin cita previa (*walk-in*), con asociación de barbero, uno o más servicios, fecha y hora, valor cobrado en COP, método de pago (`Efectivo`, `Transferencia bancaria`, `Tarjeta débito/crédito`, `Nequi`, `Daviplata`), notas opcionales, historial diario y resumen de ingresos por día y por barbero.
- **Gestión básica de barberos:** operaciones CRUD y desactivación lógica de perfiles, configuración de horarios laborales recurrentes, días de descanso, bloqueos puntuales de agenda y parámetro opcional de porcentaje de comisión para cálculo referencial de pagos.
- **Gestión de servicios (catálogo):** operaciones CRUD y activación/desactivación de servicios con nombre, descripción breve, precio en COP y duración basada en bloques discretos de 30 minutos ($1$ bloque = $30$ minutos, $2$ bloques = $60$ minutos, $n$ bloques = $30 \times n$ minutos).
- **Inventario básico de productos:** administración de productos destinados a la venta al público (ceras, pomadas, aceites para barba y artículos afines), registro de existencias actuales, movimientos de entrada (compras o reposición) y salida (venta o consumo interno), definición de umbral mínimo y generación de alertas visuales de stock bajo.
- **Portal público de agendamiento (Landing Page):** sección informativa del negocio (identidad visual, dirección, horarios de atención, catálogo de servicios con precio y duración, perfiles públicos de barberos activos), flujo paso a paso de reserva en tiempo real con opción de barbero específico o "Cualquier barbero disponible", envío de confirmación por correo electrónico y generación de código único de reserva.
- **Gestión de estados de citas en Backoffice:** administración y trazabilidad de citas en los estados `Pendiente`, `Confirmada`, `Completada` (vinculada directamente al registro de cortes), `Cancelada` y `No asistió`.

#### Elementos FUERA del alcance (Versión 1.0 — MVP)

- **Pasarela de pagos en línea y cobros anticipados:** el agendamiento público no procesa pagos electrónicos, retenciones de tarjeta ni anticipos; todos los pagos se registran presencialmente en el Backoffice.
- **Facturación electrónica ante la DIAN y contabilidad fiscal avanzada:** el sistema genera resúmenes operativos de caja y liquidaciones referenciales, pero no emite documentos tributarios electrónicos, nómina electrónica ni declaraciones de impuestos.
- **Notificaciones por WhatsApp API o SMS automatizado:** las confirmaciones automáticas de esta versión se envían únicamente por correo electrónico; el número de teléfono/WhatsApp del cliente se almacena como dato de contacto operativo para comunicación manual del establecimiento.
- **Cuentas de usuario y portal autenticado para clientes finales:** los clientes no registran contraseñas, no inician sesión y no gestionan historiales personales ni programas de puntos o fidelización en esta versión.
- **Gestión multi-sede activa en interfaz de usuario:** aunque el modelo de datos contempla una entidad de sede para facilitar la evolución futura, la interfaz y lógica de la versión 1.0 operan exclusivamente para una única sede.
- **Gestión de compras a proveedores, órdenes de compra y control de lotes/fechas de vencimiento:** el módulo de inventario controla cantidades y movimientos básicos, excluyendo cuentas por pagar a proveedores y trazabilidad por lote.
- **Aplicación móvil nativa (iOS/Android):** ambos módulos operan mediante interfaz web responsiva accesible desde navegadores modernos.

### 1.3 Definiciones, acrónimos y abreviaturas

| Término / Acrónimo | Definición técnica en el contexto de SmartBarber |
| :--- | :--- |
| **ACID** | Conjunto de propiedades de las transacciones en bases de datos: Atomicidad, Consistencia, Aislamiento y Durabilidad. |
| **API** | Interfaz de Programación de Aplicaciones (*Application Programming Interface*) que expone los servicios del núcleo de negocio. |
| **Backoffice** | Módulo administrativo privado de SmartBarber utilizado por el Administrador/Dueño y los Barberos mediante autenticación. |
| **Bloque de tiempo** | Unidad mínima e indivisible de programación de agenda equivalente exactamente a $30$ minutos calendario (por ejemplo, 09:00–09:30, 09:30–10:00). |
| **COP** | Peso Colombiano, moneda de curso legal en Colombia; todos los montos en el sistema se expresan como números enteros sin decimales. |
| **CRUD** | Acrónimo de las cuatro operaciones básicas sobre entidades persistentes: Crear (*Create*), Leer (*Read*), Actualizar (*Update*) y Eliminar o Desactivar (*Delete*). |
| **ERS / SRS** | Especificación de Requerimientos de Software (*Software Requirements Specification*). |
| **Landing Page** | Módulo web público de SmartBarber que integra información comercial de la barbería y el flujo interactivo de reserva de citas. |
| **Mobile-First** | Enfoque de diseño de interfaz que prioriza la usabilidad y distribución en pantallas de teléfonos inteligentes antes de adaptarse a tabletas y escritorios. |
| **MVP** | Producto Mínimo Viable (*Minimum Viable Product*): versión inicial funcionalmente completa para operar el negocio de manera estable y verificable. |
| **RBAC** | Control de Acceso Basado en Roles (*Role-Based Access Control*). |
| **RF / RN / RNF** | Requerimiento Funcional / Regla de Negocio / Requerimiento No Funcional. |
| **Stock bajo** | Condición operativa de un producto de inventario cuando su cantidad disponible es menor o igual a su umbral mínimo configurado ($S_{\text{actual}} \le S_{\text{mínimo}}$). |
| **Walk-in** | Cliente que acude presencialmente a la barbería solicitando atención sin haber realizado una reserva previa en el sistema. |

---

## 2. Descripción General

### 2.1 Perspectiva del producto

**SmartBarber** se concibe como un sistema web unificado con arquitectura lógica desacoplada en la capa de presentación y centralizada en la capa de dominio y persistencia. Esta separación garantiza que la experiencia pública orientada a conversión y reservas permanezca aislada de las operaciones internas de caja e inventario, manteniendo sincronización inmediata de disponibilidad.

```text
+----------------------------------+        +----------------------------------------+
|  PORTAL PÚBLICO (Landing Page)   |        |  SISTEMA INTERNO (Backoffice / Panel)  |
|  - Acceso público sin login      |        |  - Acceso autenticado (RBAC)           |
|  - Información del negocio       |        |  - Agenda y control de estados de cita |
|  - Catálogo y barberos activos   |        |  - Registro de cortes y caja diaria    |
|  - Flujo de agendamiento en vivo |        |  - Gestión de barberos, servicios e    |
|  - Protección anti-bots          |        |    inventario                          |
+----------------+-----------------+        +-------------------+--------------------+
                 |                                              |
                 | HTTPS (Endpoints públicos                    | HTTPS (Endpoints privados
                 | con control de tasa)                         | con token de sesión y RBAC)
                 v                                              v
+------------------------------------------------------------------------------------+
|                   NÚCLEO DE LÓGICA DE NEGOCIO (Servicios / API)                    |
|  +------------------+ +--------------------+ +-----------------+ +---------------+ |
|  | Motor de Agenda  | | Gestión de Caja y  | | Administración  | | Servicio de   | |
|  | y Disponibilidad | | Registro de Cortes | | Catálogo/Stock  | | Notificación  | |
|  +------------------+ +--------------------+ +-----------------+ +-------+-------+ |
+-----------------------------------------+--------------------------------+---------+
                                          |                                |
                                          | Transacciones ACID             | Correo
                                          v                                v
                           +-----------------------------+      +--------------------+
                           | Repositorio de Datos Central|      | Proveedor de Correo|
                           | (Base de Datos Relacional)  |      | Transaccional      |
                           +-----------------------------+      +--------------------+
```

#### Mecanismo de sincronización entre módulos paralelos

1. **Lectura en tiempo real desde la Landing Page:** toda modificación ejecutada en el Backoffice sobre el catálogo de servicios (precios, duración en bloques, activación/desactivación), perfiles de barberos, horarios laborales, días de descanso, bloqueos excepcionales o estado de citas se refleja en las consultas del Portal Público en un tiempo máximo de $2$ segundos tras su persistencia.
2. **Escritura controlada desde la Landing Page hacia el Backoffice:** cuando un cliente confirma una reserva pública, el núcleo de negocio ejecuta una transacción atómica que valida la disponibilidad de todos los bloques consecutivos requeridos, crea o vincula el registro del cliente, inserta la cita en estado `Pendiente` (o `Confirmada` según configuración de sede) y bloquea inmediatamente los bloques de tiempo asignados, haciéndola visible en la agenda del Backoffice sin intervención manual.
3. **Trazabilidad entre Cita y Registro de Corte:** una cita gestionada en el Backoffice evoluciona directamente a un registro de corte al marcarse como `Completada`, heredando automáticamente el barbero asignado, los servicios reservados y el cliente, eliminando la doble digitación.

### 2.2 Roles de usuario y matriz de permisos

El sistema define exactamente tres (3) roles operativos:

1. **Administrador / Dueño:** usuario autenticado con control total sobre la configuración del establecimiento, gestión de personal, catálogo de servicios, inventario, caja diaria, agenda global y reportes operativos. Puede actuar también como barbero si se le asocia un perfil operativo.
2. **Barbero:** usuario autenticado con acceso operativo restringido a su agenda asignada, registro de sus cortes y servicios realizados, consulta de sus propios ingresos diarios/resúmenes y registro de salidas de inventario por venta o consumo interno, sin acceso a configuraciones globales, finanzas de otros barberos ni administración de usuarios.
3. **Cliente Público:** usuario no autenticado que interactúa exclusivamente con el Portal Público (Landing Page) para consultar información comercial, revisar disponibilidad y generar o consultar su reserva de cita.

#### Matriz de Permisos por Módulo (RBAC)

Leyenda de permisos: **C** = Crear, **L** = Leer, **A** = Actualizar, **D** = Desactivar/Anular, **P** = Solo registros propios, **G** = Todos los registros (Global), **—** = Sin acceso.

| Módulo / Capacidad Funcional | Administrador / Dueño | Barbero | Cliente Público |
| :--- | :--- | :--- | :--- |
| **Información pública de la barbería (Landing)** | L, A (G) | L | L |
| **Catálogo de servicios (CRUD)** | C, L, A, D (G) | L (solo activos) | L (solo activos) |
| **Perfiles de barberos y comisiones** | C, L, A, D (G) | L (P - perfil propio y comisión propia) | L (solo datos públicos de activos) |
| **Horarios laborales y días de descanso** | C, L, A, D (G) | L (P) | — (solo consulta indirecta de bloques libres) |
| **Bloqueos puntuales de agenda** | C, L, A, D (G) | C, L, D (P) | — |
| **Agendamiento de cita en Landing Page** | C (como usuario web) | — | C (sin autenticación) |
| **Agenda de citas en Backoffice** | C, L, A, D (G) | L, A de estado (P) | — |
| **Conversión de cita a Registro de Corte** | C, L (G) | C, L (P) | — |
| **Registro de corte sin cita (*Walk-in*)** | C, L (G) | C, L (P) | — |
| **Anulación de Registro de Corte** | D (G - con motivo obligatorio) | — | — |
| **Resumen de ingresos diarios y por barbero** | L (G) | L (P - solo ingresos y comisión propia) | — |
| **Catálogo de productos de inventario** | C, L, A, D (G) | L (solo activos) | — |
| **Entradas de inventario (compras/reposición)** | C, L (G) | — | — |
| **Salidas de inventario (venta/consumo interno)** | C, L (G) | C (venta/consumo), L (G) | — |
| **Alertas visuales de stock bajo** | L (G) | L (G) | — |
| **Gestión de credenciales de acceso (Usuarios)** | C, L, A, D (G) | A (solo contraseña propia) | — |

### 2.3 Restricciones de diseño y supuestos de negocio

#### Restricciones de diseño

1. **Agnosticismo tecnológico en el ERS:** el presente documento no impone lenguajes de programación, motores de base de datos ni marcos de trabajo específicos; sin embargo, exige un almacén de datos con soporte estricto de transacciones ACID para prevenir condiciones de carrera en citas e inventario.
2. **Unidad monetaria entera:** todos los valores monetarios se almacenan y despliegan en Pesos Colombianos (COP) como enteros no negativos ($\ge 0$), formateados visualmente con separador de miles (por ejemplo, `$ 25.000 COP`), sin centavos.
3. **Discretización horaria fija:** toda la lógica de horarios laborales, duración de servicios y agendamiento se construye sobre una cuadrícula fija de bloques de $30$ minutos exactos iniciando en el minuto `:00` y el minuto `:30` de cada hora.
4. **Arquitectura preparada para multi-sede:** aunque la interfaz de la versión 1.0 opera sobre una sede única, todas las entidades operativas principales deben incluir referencia a una entidad `Sede` para habilitar crecimiento futuro sin rediseño estructural de la base de datos.
5. **Cumplimiento normativo de datos personales:** la captura de nombre, teléfono y correo electrónico en la Landing Page debe incluir un enlace y casilla de aceptación de la política de tratamiento de datos personales conforme a la Ley 1581 de 2012 de Colombia.

#### Supuestos de negocio

1. Cada barbero atiende un máximo de un (1) cliente por bloque de tiempo; no se soportan atenciones simultáneas por el mismo barbero en un mismo bloque.
2. Un cliente puede seleccionar uno o varios servicios en una misma cita o atención *walk-in*, los cuales serán ejecutados de forma continua por el mismo barbero.
3. El establecimiento cuenta con una cuenta o servicio de correo electrónico transaccional operativo para el envío de confirmaciones de reserva.
4. Los precios mostrados en el catálogo corresponden a valores finales al público en COP (impuestos incluidos, cuando apliquen).

---

## 3. Requerimientos Funcionales (RF)

### 3.1 Módulo 1: Registro de Cortes y Servicios Realizados (Caja / Operación Diaria)

| ID | Nombre | Prioridad | Descripción (Entradas, Proceso y Salidas) | Criterios de Aceptación Verificables |
| :--- | :--- | :--- | :--- | :--- |
| **RF-COR-01** | Registro operativo de atención sin cita (*Walk-in*) | Alta | **Entradas:** ID del barbero, lista de uno o más servicios activos, fecha y hora (precargadas con la fecha/hora actual del sistema en UTC-5), valor cobrado total en COP (calculado automáticamente por suma de servicios, con ajuste manual permitido solo al Administrador), método de pago (`Efectivo`, `Transferencia bancaria`, `Tarjeta débito/crédito`, `Nequi`, `Daviplata`), nombre opcional del cliente y notas opcionales (máximo 300 caracteres).<br>**Proceso:** valida que el barbero y los servicios existan y estén activos, calcula el monto total sumando el precio vigente de los servicios seleccionados, almacena una instantánea (*snapshot*) del precio de cada servicio y del porcentaje de comisión vigente del barbero, y persiste el registro marcado con origen `Walk-in`.<br>**Salidas:** comprobante visual en pantalla con ID único de registro y actualización inmediata del resumen diario. | 1. El formulario se completa y guarda en un máximo de 4 interacciones desde la vista principal de operación diaria.<br>2. Si no se selecciona al menos un servicio o un método de pago válido, el sistema impide el guardado e indica exactamente el campo faltante.<br>3. Al registrar un barbero autenticado, su propio perfil aparece preseleccionado y bloqueado para edición.<br>4. El valor cobrado queda persistido con precisión exacta en COP enteros sin decimales. |
| **RF-COR-02** | Conversión de cita agendada a Registro de Corte | Alta | **Entradas:** ID de cita en estado `Pendiente` o `Confirmada`, confirmación o modificación de la lista de servicios efectivamente prestados, método de pago seleccionado, ajuste opcional de precio (solo Administrador) y notas opcionales.<br>**Proceso:** precarga automáticamente el barbero, cliente y servicios asociados a la cita; permite agregar o retirar servicios antes del cierre; dentro de una única transacción ACID crea el `RegistroCorte` con origen `Cita` y enlace al `cita_id`, y actualiza el estado de la cita a `Completada`.<br>**Salidas:** registro de corte confirmado y cita marcada como `Completada` en la agenda. | 1. El barbero o administrador no debe volver a digitar el nombre del cliente ni seleccionar manualmente los servicios que ya venían en la cita.<br>2. El sistema impide generar un segundo registro de corte para una cita que ya se encuentra en estado `Completada`.<br>3. Si se añade un servicio adicional durante el cierre, el valor total se recalcula automáticamente antes de confirmar.<br>4. Si falla la creación del registro de corte, la cita conserva su estado previo sin cambios parciales. |
| **RF-COR-03** | Consulta y filtrado del historial diario de cortes | Alta | **Entradas:** rango de fechas (por defecto, el día calendario actual en UTC-5), filtro opcional por barbero (disponible solo para Administrador), filtro opcional por método de pago, filtro opcional por origen (`Cita` o `Walk-in`) y estado (`Activo` o `Anulado`).<br>**Proceso:** recupera los registros de corte que cumplen los criterios ordenados cronológicamente de forma descendente.<br>**Salidas:** listado tabular mostrando ID, fecha/hora, barbero, servicios aplicados, origen, método de pago, valor cobrado en COP, estado y acceso al detalle completo con notas. | 1. Al ingresar al módulo, se muestran por defecto los registros del día en curso en menos de $1.5$ segundos.<br>2. Un usuario con rol Barbero visualiza exclusivamente sus propios registros y no puede consultar registros de otros barberos mediante filtros ni manipulación de parámetros de URL.<br>3. Los registros anulados aparecen diferenciados visualmente y excluidos de los totales monetarios. |
| **RF-COR-04** | Resumen de ingresos por día, método de pago y barbero | Alta | **Entradas:** fecha específica o rango de fechas (máximo 90 días por consulta) y filtro opcional por barbero.<br>**Proceso:** agrega todos los registros de corte en estado `Activo` dentro del periodo seleccionado; calcula cantidad total de atenciones, ingresos brutos totales en COP, desglose exacto por cada uno de los cinco (5) métodos de pago y resumen individual por barbero incluyendo comisión referencial acumulada.<br>**Salidas:** tablero resumido con tarjetas numéricas y tabla desglosada por barbero y por método de pago. | 1. La suma del desglose por los cinco métodos de pago coincide exactamente ($100\%$) con el total general de ingresos brutos del periodo.<br>2. La comisión referencial por barbero se calcula sumando la comisión almacenada en cada registro histórico, sin verse alterada por cambios posteriores en el porcentaje de comisión del perfil.<br>3. El rol Barbero visualiza únicamente sus métricas propias. |
| **RF-COR-05** | Anulación auditada de Registro de Corte erróneo | Media | **Entradas:** ID del registro de corte en estado `Activo` y motivo obligatorio de anulación (mínimo 10 caracteres, máximo 250 caracteres).<br>**Proceso:** exclusivo para el rol Administrador; cambia el estado del registro a `Anulado`, registra el ID del administrador, fecha/hora de anulación y motivo, sin eliminar físicamente el registro de la base de datos. Si el registro provenía de una cita, ofrece la opción explícita de revertir o mantener el estado de la cita.<br>**Salidas:** registro marcado como `Anulado` y recálculo inmediato de los resúmenes de ingresos. | 1. Ningún registro de corte puede eliminarse físicamente desde la interfaz ni la API.<br>2. El sistema rechaza la anulación si el motivo tiene menos de 10 caracteres.<br>3. Tras anular un registro de `$ 30.000 COP`, el total diario disminuye exactamente en `$ 30.000 COP` de forma inmediata. |

---

### 3.2 Módulo 2: Gestión Básica de Barberos

| ID | Nombre | Prioridad | Descripción (Entradas, Proceso y Salidas) | Criterios de Aceptación Verificables |
| :--- | :--- | :--- | :--- | :--- |
| **RF-BAR-01** | Creación y actualización de perfiles de barberos | Alta | **Entradas:** nombre completo (obligatorio), apodo o nombre público (opcional), teléfono de contacto (obligatorio), correo electrónico (obligatorio y único para acceso), fotografía de perfil (opcional, formatos JPG/PNG/WebP, tamaño máximo $2$ MB), biografía breve pública (opcional, máximo 200 caracteres), porcentaje de comisión referencial (opcional, número decimal entre $0$ y $100$) y estado (`Activo`/`Inactivo`).<br>**Proceso:** valida unicidad del correo, formato de imagen y rango de comisión; crea o actualiza el perfil del barbero y vincula sus credenciales de acceso al Backoffice si se habilita su usuario.<br>**Salidas:** perfil guardado y listado actualizado de barberos. | 1. El sistema impide registrar dos barberos con el mismo correo electrónico.<br>2. Si se carga una imagen superior a $2$ MB o de formato no permitido, el sistema rechaza el archivo indicando la restricción exacta.<br>3. Al asignar un porcentaje de comisión fuera del rango $[0, 100]$, el sistema muestra error de validación y bloquea el guardado. |
| **RF-BAR-02** | Desactivación lógica de perfiles de barberos | Alta | **Entradas:** ID del barbero y acción de desactivación.<br>**Proceso:** cambia el estado del barbero a `Inactivo`, revoca inmediatamente sus sesiones activas en el Backoffice, lo oculta del Portal Público para nuevas reservas y verifica si posee citas futuras en estado `Pendiente` o `Confirmada`.<br>**Salidas:** barbero marcado como `Inactivo` y alerta explícita al Administrador listando las citas futuras afectadas que requieren reasignación o cancelación. | 1. Un barbero inactivo desaparece de la Landing Page en menos de $2$ segundos tras la desactivación.<br>2. Todo el historial de cortes y citas pasadas del barbero permanece intacto y consultable en reportes.<br>3. Si el barbero tiene citas futuras vigentes, el sistema despliega la lista de dichas citas antes de confirmar la desactivación para acción administrativa. |
| **RF-BAR-03** | Configuración de horarios laborales recurrentes y días de descanso | Alta | **Entradas:** ID del barbero y configuración para cada uno de los siete (7) días de la semana (lunes a domingo), indicando si es `Día laboral` o `Día de descanso`; para días laborales, una o hasta dos franjas horarias continuas (por ejemplo, turno mañana 09:00–13:00 y turno tarde 14:00–20:00) alineadas a bloques de 30 minutos.<br>**Proceso:** valida que la hora de fin sea mayor que la hora de inicio, que los minutos sean estrictamente `:00` o `:30`, y que no exista solapamiento entre franjas del mismo día; persiste la plantilla semanal que alimenta el motor de disponibilidad.<br>**Salidas:** grilla semanal de disponibilidad guardada y aplicada inmediatamente al cálculo de citas. | 1. El sistema rechaza cualquier hora cuyos minutos sean distintos de `:00` o `:30`.<br>2. No se permite guardar una franja cuya hora de inicio sea mayor o igual a la hora de finalización, ni dos franjas superpuestas en un mismo día.<br>3. Un día marcado como `Día de descanso` no genera ningún bloque disponible en la Landing Page para ese barbero. |
| **RF-BAR-04** | Gestión de bloqueos puntuales y excepciones de agenda | Media | **Entradas:** ID del barbero, fecha específica, selección de día completo o rango horario alineado a bloques de 30 minutos, y motivo breve (por ejemplo, permiso médico, capacitación, almuerzo extendido).<br>**Proceso:** verifica si existen citas ya agendadas en el rango seleccionado; si no existen conflictos (o tras advertencia confirmada por el Administrador), bloquea dichos bloques para evitar nuevas reservas públicas.<br>**Salidas:** bloqueo visible en el calendario del Backoffice y bloques retirados de la disponibilidad pública. | 1. Los bloques cubiertos por una excepción dejan de mostrarse como disponibles en la Landing Page inmediatamente.<br>2. Si el rango coincide con una cita `Pendiente` o `Confirmada`, el sistema notifica el conflicto mostrando el código de la cita afectada.<br>3. Un barbero puede crear bloqueos únicamente sobre su propia agenda. |
| **RF-BAR-05** | Consulta de liquidación referencial por comisión | Media | **Entradas:** ID del barbero (o todos para Administrador) y rango de fechas.<br>**Proceso:** suma el monto base de servicios prestados y el monto de comisión calculado sobre cada registro de corte `Activo` del periodo.<br>**Salidas:** reporte tabular en pantalla mostrando número de cortes, total facturado en COP, porcentaje aplicado y valor referencial a pagar al barbero en COP. | 1. El cálculo de comisión por registro sigue la fórmula $C = \text{redondear}(P_{\text{servicio}} \times \frac{p}{100})$ a entero en COP.<br>2. Los registros anulados se excluyen del cálculo.<br>3. El reporte permite exportar la tabla visualizada en formato CSV para respaldo administrativo. |

---

### 3.3 Módulo 3: Gestión de Servicios (Catálogo)

| ID | Nombre | Prioridad | Descripción (Entradas, Proceso y Salidas) | Criterios de Aceptación Verificables |
| :--- | :--- | :--- | :--- | :--- |
| **RF-SER-01** | Creación y edición de servicios del catálogo | Alta | **Entradas:** nombre del servicio (obligatorio, único entre servicios activos, máximo 80 caracteres), descripción breve (opcional, máximo 250 caracteres), precio base en COP (obligatorio, entero mayor a $0$), duración estimada expresada en cantidad entera de bloques de 30 minutos ($n \in \{1, 2, 3, 4, 5, 6\}$, equivalente a 30, 60, 90, 120, 150 o 180 minutos), indicador de visibilidad en Landing Page (`Visible`/`Oculto`) y estado (`Activo`/`Inactivo`).<br>**Proceso:** valida obligatoriedad, unicidad y restricciones numéricas; guarda el servicio y lo sincroniza con el catálogo interno y público.<br>**Salidas:** servicio registrado o actualizado en el catálogo. | 1. La interfaz presenta la duración en formato dual claro: número de bloques y minutos equivalentes (ejemplo: `1 bloque (30 min)`, `2 bloques (60 min)`).<br>2. El sistema rechaza precios iguales o menores a $0$ COP y cantidades de bloques menores a $1$ o no enteras.<br>3. Un servicio marcado como `Activo` y `Visible` aparece en la Landing Page en menos de $2$ segundos. |
| **RF-SER-02** | Activación y desactivación lógica de servicios | Alta | **Entradas:** ID del servicio y cambio de estado (`Activo` / `Inactivo`).<br>**Proceso:** actualiza el estado del servicio sin eliminarlo físicamente. Un servicio `Inactivo` deja de ofrecerse para nuevas citas públicas y nuevos registros *walk-in*, pero mantiene su integridad referencial en citas futuras ya agendadas y en cortes históricos.<br>**Salidas:** estado actualizado en el catálogo. | 1. Al desactivar un servicio, este desaparece inmediatamente del flujo de reserva público y del selector de nuevos cortes.<br>2. Las citas previamente confirmadas que incluyen dicho servicio siguen mostrando su nombre, precio y duración originales.<br>3. El servicio puede reactivarse en cualquier momento sin pérdida de datos. |
| **RF-SER-03** | Consulta y ordenamiento del catálogo de servicios | Media | **Entradas:** filtro opcional por estado (`Todos`, `Activos`, `Inactivos`), criterio de ordenamiento (nombre, precio o duración) y posición de visualización opcional.<br>**Proceso:** consulta y retorna los servicios configurados en el catálogo.<br>**Salidas:** lista tabular con nombre, descripción, precio en COP, duración en bloques y minutos, visibilidad pública y estado. | 1. El listado refleja los precios formateados en COP y la equivalencia exacta en bloques y minutos.<br>2. El rol Barbero puede consultar los servicios activos en modo de solo lectura. |
| **RF-SER-04** | Preservación histórica de precios y duraciones | Alta | **Entradas:** actualización del precio o de la duración en bloques de un servicio existente.<br>**Proceso:** aplica los nuevos valores únicamente a citas y registros de corte creados a partir del instante del cambio, sin modificar los valores instantáneos guardados en registros históricos ni en citas ya confirmadas.<br>**Salidas:** servicio actualizado conservando intacta la contabilidad histórica. | 1. Si el servicio "Corte Fade" cambia de `$ 25.000 COP` a `$ 28.000 COP`, todos los registros de corte previos continúan mostrando exactamente `$ 25.000 COP` en los reportes de ingresos.<br>2. Las citas creadas antes del cambio conservan el precio informado al cliente al momento de la reserva. |

---

### 3.4 Módulo 4: Inventario Básico

| ID | Nombre | Prioridad | Descripción (Entradas, Proceso y Salidas) | Criterios de Aceptación Verificables |
| :--- | :--- | :--- | :--- | :--- |
| **RF-INV-01** | Gestión CRUD de productos para venta al público | Alta | **Entradas:** nombre del producto (obligatorio, máximo 100 caracteres), código/SKU interno (opcional, único si se diligencia), categoría (ej. `Ceras y Pomadas`, `Cuidado de Barba`, `Cuidado Capilar`, `Accesorios`), precio de venta unitario en COP (obligatorio, entero $> 0$), costo unitario referencial en COP (opcional, entero $\ge 0$), stock inicial (entero $\ge 0$, solo al crear), umbral mínimo de stock (obligatorio, entero $\ge 0$) y estado (`Activo`/`Inactivo`).<br>**Proceso:** valida datos y crea o actualiza la ficha del producto. Si se ingresa un stock inicial mayor a $0$, genera automáticamente un movimiento inicial de entrada tipo `Inventario Inicial` para trazabilidad.<br>**Salidas:** producto persistido en el listado de inventario. | 1. No se permite editar manualmente el campo `stock_actual` desde la pantalla de edición del producto; toda variación de existencias debe ocurrir mediante un movimiento registrado.<br>2. Si el SKU ingresado ya pertenece a otro producto, el sistema rechaza el guardado con mensaje específico.<br>3. Los productos con movimientos históricos solo pueden desactivarse lógicamente, nunca eliminarse físicamente. |
| **RF-INV-02** | Registro de movimientos de entrada de inventario | Alta | **Entradas:** ID de producto activo, cantidad de entrada (entero $> 0$), motivo/tipo (`Compra / Reposición` o `Ajuste positivo`), costo unitario opcional y observación opcional (máximo 200 caracteres).<br>**Proceso:** exclusivo para el rol Administrador; dentro de una transacción ACID incrementa el `stock_actual` del producto en la cantidad indicada y crea un registro inmutable en `MovimientoInventario` con el saldo resultante, usuario y marca de tiempo.<br>**Salidas:** movimiento registrado y stock actualizado. | 1. El sistema rechaza cantidades iguales o menores a $0$ o valores decimales.<br>2. El nuevo saldo es exactamente igual a $S_{\text{anterior}} + Q_{\text{entrada}}$.<br>3. Si el nuevo saldo supera el umbral mínimo, la alerta visual de stock bajo desaparece automáticamente. |
| **RF-INV-03** | Registro de movimientos de salida de inventario | Alta | **Entradas:** ID de producto activo, cantidad de salida (entero $> 0$), tipo de salida (`Venta al público`, `Consumo interno` o `Ajuste negativo`), método de pago (obligatorio si el tipo es `Venta al público`, usando los mismos cinco métodos de caja), referencia opcional a un `RegistroCorte` y observación opcional.<br>**Proceso:** verifica dentro de una transacción ACID con bloqueo de fila que $S_{\text{actual}} - Q_{\text{salida}} \ge 0$; en caso afirmativo descuenta el stock, registra el movimiento inmutable con valor total de venta (si aplica) y evalúa el umbral de stock bajo.<br>**Salidas:** movimiento registrado, stock descontado y actualización inmediata de alertas visuales. | 1. Si $Q_{\text{salida}} > S_{\text{actual}}$, el sistema rechaza la operación indicando la cantidad exacta disponible y no modifica el stock.<br>2. Cuando el tipo es `Venta al público`, el sistema exige método de pago y calcula automáticamente el monto de venta ($P_{\text{venta}} \times Q_{\text{salida}}$).<br>3. Tanto el Administrador como el Barbero pueden registrar salidas por `Venta al público` y `Consumo interno`. |
| **RF-INV-04** | Alerta visual de stock bajo y agotado | Alta | **Entradas:** lectura del catálogo de productos activos comparando `stock_actual` frente a `stock_minimo`.<br>**Proceso:** clasifica automáticamente cada producto activo en tres niveles visuales: `Disponible` ($S_{\text{actual}} > S_{\text{mínimo}}$), `Stock bajo` ($0 < S_{\text{actual}} \le S_{\text{mínimo}}$) y `Agotado` ($S_{\text{actual}} = 0$).<br>**Salidas:** indicador visual (etiqueta de color y texto accesible) en la tabla de inventario, filtro rápido de productos con alerta y contador resumen visible en el tablero principal del Backoffice. | 1. Al ejecutar una salida que deje un producto con $S_{\text{actual}} \le S_{\text{mínimo}}$, la etiqueta `Stock bajo` se activa inmediatamente sin requerir recarga manual de la sesión.<br>2. El indicador no depende exclusivamente del color; incluye texto explícito (`Stock bajo` / `Agotado`) y cantidad restante.<br>3. El panel principal del Backoffice muestra el conteo exacto de productos activos en estado `Stock bajo` o `Agotado`. |
| **RF-INV-05** | Consulta de historial de movimientos (Kardex básico) | Media | **Entradas:** filtro opcional por producto, rango de fechas y tipo de movimiento (`Entrada` o `Salida`).<br>**Proceso:** recupera los movimientos registrados ordenados cronológicamente de forma descendente.<br>**Salidas:** tabla auditable mostrando fecha/hora, producto, tipo y subtipo de movimiento, cantidad, saldo resultante, valor de venta (si aplica), usuario responsable y observación. | 1. Todo cambio de existencias queda respaldado por exactamente un registro en el historial.<br>2. Los registros del historial son estrictamente de solo lectura y no admiten edición ni borrado. |

---

### 3.5 Módulo 5: Apartado de Agendamiento para Usuarios (Portal Público / Landing Page y Gestión de Citas)

| ID | Nombre | Prioridad | Descripción (Entradas, Proceso y Salidas) | Criterios de Aceptación Verificables |
| :--- | :--- | :--- | :--- | :--- |
| **RF-AGE-01** | Visualización de la Landing Page informativa | Alta | **Entradas:** acceso público mediante navegador web sin credenciales.<br>**Proceso:** consulta la información pública configurada de la sede, el catálogo de servicios con estado `Activo` y `Visible`, y los perfiles de barberos en estado `Activo`.<br>**Salidas:** página pública responsiva (*Mobile-First*) que despliega: (1) identidad visual (logotipo, nombre, eslogan y botón principal de llamado a la acción "Agendar Cita"), (2) catálogo de servicios con nombre, descripción, precio en COP y duración en minutos, (3) sección de barberos disponibles con foto (o avatar por defecto), nombre y breve descripción, (4) ubicación física con dirección y enlace a mapa externo, y (5) horarios generales de atención y botón de contacto. | 1. La página carga completamente sin exigir inicio de sesión ni registro previo.<br>2. No se muestra ningún servicio inactivo/oculto ni ningún barbero inactivo.<br>3. La información de precios y duraciones coincide en un $100\%$ con los valores vigentes del Backoffice.<br>4. La página se visualiza correctamente sin desplazamiento horizontal en anchos de pantalla desde $360\text{ px}$ hasta $1920\text{ px}$. |
| **RF-AGE-02** | Paso 1 del agendamiento: Selección de servicio(s) | Alta | **Entradas:** selección de uno o más servicios activos y visibles por parte del cliente público.<br>**Proceso:** acumula en tiempo real el precio estimado total en COP y la duración total requerida en bloques de 30 minutos ($B_{\text{total}} = \sum B_i$).<br>**Salidas:** resumen interactivo visible en pantalla mostrando los servicios seleccionados, el tiempo total estimado (en minutos y horas) y el valor total estimado en COP, habilitando el botón "Continuar". | 1. El botón "Continuar" permanece deshabilitado hasta que exista al menos un (1) servicio seleccionado.<br>2. Al seleccionar "Corte Fade" (1 bloque, `$ 25.000 COP`) y "Perfilado de Barba" (1 bloque, `$ 15.000 COP`), el resumen muestra exactamente `60 min (2 bloques)` y `$ 40.000 COP`. |
| **RF-AGE-03** | Paso 2 del agendamiento: Selección de barbero | Alta | **Entradas:** elección de un barbero activo específico o de la opción `"Cualquier barbero disponible"`.<br>**Proceso:** carga los barberos en estado `Activo` que tengan al menos un día laboral configurado y almacena la preferencia en el estado del flujo de reserva.<br>**Salidas:** confirmación de preferencia de barbero y avance al selector de fecha y hora. | 1. La opción `"Cualquier barbero disponible"` siempre aparece en primer lugar de manera destacada.<br>2. Si solo existe un barbero activo en el negocio, se muestra el barbero y el flujo continúa sin errores.<br>3. El cliente puede regresar al Paso 1 sin perder su selección previa. |
| **RF-AGE-04** | Paso 3 del agendamiento: Selección de fecha y hora disponible en bloques | Alta | **Entradas:** fecha seleccionada dentro de la ventana habilitada (desde el día actual hasta el límite máximo configurado, por defecto $30$ días calendario), lista de servicios ($B_{\text{total}}$) y barbero seleccionado (o "Cualquier barbero disponible").<br>**Proceso:** calcula en tiempo real los bloques de inicio válidos de 30 minutos donde exista al menos $B_{\text{total}}$ bloques consecutivos libres dentro del horario laboral del barbero (sin solaparse con citas `Pendiente`/`Confirmada`, bloqueos puntuales, descansos ni tiempos pasados respetando la antelación mínima).<br>**Salidas:** calendario con fechas habilitadas y cuadrícula de horas de inicio disponibles (formato claro de 12 horas o 24 horas consistente, ej. `09:00 AM`, `09:30 AM`). | 1. Si un servicio requiere $2$ bloques (60 min) y el barbero solo tiene libre el bloque `11:30–12:00` antes de una cita a las `12:00`, el horario `11:30` NO se muestra como disponible.<br>2. Si el cliente seleccionó `"Cualquier barbero disponible"`, se muestra la unión de horarios de inicio donde al menos un barbero activo disponga de los $B_{\text{total}}$ bloques consecutivos libres.<br>3. Para la fecha actual, no se muestran bloques que inicien antes de la hora actual más el margen mínimo de antelación ($30$ minutos).<br>4. Si un día no tiene disponibilidad, se muestra el mensaje claro `"No hay horarios disponibles para esta fecha"` y se sugiere seleccionar otro día. |
| **RF-AGE-05** | Paso 4 del agendamiento: Ingreso de datos mínimos del cliente | Alta | **Entradas:** nombre completo (obligatorio, mínimo 3 y máximo 100 caracteres), número de teléfono/WhatsApp (obligatorio, formato numérico de 10 dígitos para Colombia o formato internacional válido), correo electrónico (obligatorio, formato RFC válido), notas opcionales para el barbero (máximo 200 caracteres), aceptación obligatoria de política de datos personales y verificación silenciosa anti-bots.<br>**Proceso:** valida sintaxis de campos, verifica límites anti-spam y prepara el resumen final previo a la confirmación.<br>**Salidas:** pantalla de resumen con servicios, barbero asignado (o por asignar), fecha, hora de inicio y fin, valor estimado en COP y datos de contacto listos para confirmar. | 1. No se solicita contraseña ni creación de cuenta.<br>2. Los campos con errores muestran mensajes de validación específicos antes de enviar la solicitud.<br>3. No es posible confirmar la reserva sin marcar la aceptación de tratamiento de datos personales. |
| **RF-AGE-06** | Paso 5 del agendamiento: Confirmación de cita, código único y notificación por correo | Alta | **Entradas:** confirmación explícita del cliente sobre el resumen de reserva.<br>**Proceso:** dentro de una transacción ACID revalida disponibilidad de los $B_{\text{total}}$ bloques consecutivos; si el usuario eligió `"Cualquier barbero disponible"`, asigna automáticamente un barbero disponible según la regla RN-04; crea o actualiza la ficha del cliente (identificado por correo/teléfono), persiste la cita en estado `Pendiente` (o `Confirmada` según configuración de la sede) con código alfanumérico único (formato `SB-XXXXXX`), y despacha de forma asíncrona un correo electrónico de confirmación al cliente.<br>**Salidas:** pantalla de éxito con código de reserva, resumen completo de la cita, dirección de la barbería, opción de descargar/copiar resumen y correo electrónico enviado. | 1. El código de reserva generado es único en todo el sistema y legible para el usuario (sin caracteres confusos como `O`/`0` o `I`/`1`).<br>2. Si otro usuario reservó el mismo bloque milisegundos antes, la transacción se rechaza limpiamente informando que el horario ya no está disponible y recargando los horarios libres del día sin perder los servicios ni datos del cliente.<br>3. El correo de confirmación se encola y despacha en menos de $60$ segundos con código de reserva, fecha, hora, servicios, barbero, dirección y política de cancelación. |
| **RF-AGE-07** | Gestión del ciclo de vida y estados de citas en el Backoffice | Alta | **Entradas:** ID de cita y acción de cambio de estado (`Pendiente`, `Confirmada`, `Completada`, `Cancelada`, `No asistió`), más motivo opcional en caso de cancelación.<br>**Proceso:** valida que la transición de estado esté permitida según la máquina de estados definida en RN-07; actualiza el estado y registra la auditoría del cambio. Al pasar a `Cancelada`, libera inmediatamente los bloques reservados para nuevas citas públicas. Al seleccionar `Completada`, invoca obligatoriamente el flujo de conversión a Registro de Corte (RF-COR-02).<br>**Salidas:** estado actualizado en tiempo real en la agenda del Backoffice y liberación de cupo en la Landing Page cuando aplique. | 1. Una cita en estado `Cancelada`, `No asistió` o `Completada` se considera estado terminal y no puede volver a `Pendiente` ni `Confirmada`.<br>2. Al marcar una cita futura como `Cancelada`, sus bloques de tiempo aparecen nuevamente disponibles en la Landing Page en menos de $2$ segundos.<br>3. No es posible marcar una cita como `Completada` sin completar el registro de corte asociado (RF-COR-02). |
| **RF-AGE-08** | Visualización de agenda diaria y semanal en el Backoffice | Alta | **Entradas:** vista seleccionada (`Día` o `Semana`), fecha de referencia y filtro opcional por barbero (Administrador) o estado de cita.<br>**Proceso:** consulta las citas programadas y bloqueos puntuales en la cuadrícula de 30 minutos.<br>**Salidas:** agenda visual ordenada cronológicamente que diferencia por etiqueta y color cada estado de cita, mostrando código, cliente, teléfono, barbero, servicios, duración y acciones rápidas (`Confirmar`, `Completar / Registrar Corte`, `Cancelar`, `No asistió`). | 1. Un barbero visualiza exclusivamente su propia columna de agenda; el Administrador visualiza todos los barberos activos en columnas paralelas o filtrados individualmente.<br>2. Las citas cuya duración sea de $n$ bloques ocupan visualmente $n$ filas consecutivas de 30 minutos en la grilla horaria. |
| **RF-AGE-09** | Registro manual de cita desde el Backoffice | Media | **Entradas:** los mismos datos de una reserva (cliente existente o nuevo, servicio(s), barbero, fecha y hora disponible).<br>**Proceso:** permite al Administrador registrar citas solicitadas por teléfono o WhatsApp directo utilizando exactamente el mismo motor de validación de bloques y concurrencia que la Landing Page.<br>**Salidas:** cita creada en estado `Confirmada` y bloques bloqueados inmediatamente en la disponibilidad pública. | 1. Una cita creada desde el Backoffice bloquea inmediatamente los mismos horarios en el Portal Público.<br>2. El sistema aplica las mismas validaciones de no solapamiento que en el agendamiento público. |

---

## 4. Reglas de Negocio (RN)

| ID | Nombre de la Regla | Descripción Formal y Restricción Verificable | Módulos Impactados |
| :--- | :--- | :--- | :--- |
| **RN-01** | Prevención estricta de solapamiento de citas (Concurrencia) | Un mismo barbero no puede tener dos citas activas (`Pendiente` o `Confirmada`) que compartan total o parcialmente algún bloque de 30 minutos. Toda confirmación de reserva debe ejecutarse dentro de una transacción ACID con bloqueo pesimista u optimista verificado a nivel de base de datos sobre la tupla `(barbero_id, fecha, bloque_horario)`. Ante dos solicitudes simultáneas sobre el mismo bloque, exactamente una debe confirmarse y la segunda debe fallar con notificación de conflicto. | Agendamiento, Backoffice |
| **RN-02** | Cálculo de bloques consecutivos por duración de servicios | La duración total de una cita es igual a la suma entera de los bloques de 30 minutos de todos los servicios incluidos: $B_{\text{total}} = \sum_{i=1}^{k} B_i$, donde $T_{\text{minutos}} = 30 \times B_{\text{total}}$. Todos los $B_{\text{total}}$ bloques deben ser estrictamente consecutivos, pertenecer al mismo turno laboral continuo del barbero y estar completamente libres antes del cierre de dicho turno. | Servicios, Agendamiento |
| **RN-03** | Ventana temporal de agendamiento público | Un cliente público no puede reservar en fechas pasadas ni con una antelación menor a $30$ minutos respecto a la hora actual del servidor en UTC-5. El horizonte máximo de reserva anticipada es de $30$ días calendario (parámetro configurable por el Administrador entre $7$ y $60$ días). | Agendamiento |
| **RN-04** | Asignación automática para "Cualquier barbero disponible" | Cuando un cliente selecciona la opción `"Cualquier barbero disponible"`, al momento de confirmar la transacción el sistema asigna un barbero específico que disponga de los $B_{\text{total}}$ bloques consecutivos libres, priorizando al barbero activo con menor cantidad de bloques ya reservados en esa fecha (balanceo equitativo de carga); en caso de empate, se selecciona por orden alfabético ascendente del nombre. El nombre del barbero asignado se informa en el resumen y en el correo de confirmación. | Barberos, Agendamiento |
| **RN-05** | Política de cancelación y liberación de cupo | Las citas pueden ser canceladas por el Administrador o el Barbero asignado en cualquier momento previo a su finalización. En el correo de confirmación se informa al cliente la política del negocio: se recomienda notificar cancelaciones con al menos $2$ horas de antelación. Toda cancelación registrada en el sistema libera de forma inmediata los bloques ocupados si la hora de inicio de la cita aún cumple con la ventana temporal de RN-03. | Agendamiento |
| **RN-06** | Manejo de inasistencia (`No asistió`) | Una cita en estado `Pendiente` o `Confirmada` solo puede marcarse como `No asistió` cuando hayan transcurrido al menos $15$ minutos después de su hora programada de inicio (ventana de tolerancia). Al marcar `No asistió`, no se genera ningún registro de corte ni ingreso en caja; si la cita ocupaba más de $1$ bloque y aún restan bloques futuros completos de 30 minutos sin iniciar, dichos bloques restantes se liberan automáticamente. | Agendamiento, Caja |
| **RN-07** | Máquina de estados válida para citas | Las únicas transiciones de estado permitidas para una cita son: `Pendiente` $\rightarrow$ `Confirmada`, `Pendiente` $\rightarrow$ `Completada`, `Pendiente` $\rightarrow$ `Cancelada`, `Pendiente` $\rightarrow$ `No asistió`; `Confirmada` $\rightarrow$ `Completada`, `Confirmada` $\rightarrow$ `Cancelada`, `Confirmada` $\rightarrow$ `No asistió`. Los estados `Completada`, `Cancelada` y `No asistió` son terminales, salvo reversión excepcional de `Completada` auditada por el Administrador al anular un registro de corte (RF-COR-05). | Agendamiento, Caja |
| **RN-08** | Integración 1:1 entre Cita Completada y Registro de Corte | Cada cita que transicione al estado `Completada` debe generar exactamente un (1) `RegistroCorte` asociado mediante clave foránea única (`cita_id`). Se prohíbe la existencia de una cita `Completada` sin registro de corte asociado o de múltiples registros de corte activos apuntando a la misma cita. | Agendamiento, Caja |
| **RN-09** | Convivencia entre clientes *Walk-in* y citas agendadas | Un cliente sin cita (*walk-in*) se registra directamente en el módulo de Registro de Cortes (RF-COR-01) al finalizar o iniciar su atención sin obligar a crear una cita previa. La atención *walk-in* nunca cancela ni sobrescribe citas futuras ya reservadas; si un barbero decide atender a un cliente *walk-in* durante un espacio libre y desea evitar reservas en línea durante esa atención, puede registrar un bloqueo puntual (RF-BAR-04) por los bloques correspondientes. | Caja, Agendamiento, Barberos |
| **RN-10** | Prohibición absoluta de stock negativo | Ninguna operación de salida de inventario (`Venta al público`, `Consumo interno` o `Ajuste negativo`) puede ejecutarse si el resultado produce existencias menores a cero. Debe cumplirse siempre la invariante $S_{\text{actual}} - Q_{\text{salida}} \ge 0$, garantizada mediante validación atómica en base de datos. | Inventario |
| **RN-11** | Activación de alertas de stock bajo y agotado | Un producto activo genera alerta de `Stock bajo` automáticamente cuando $0 < S_{\text{actual}} \le S_{\text{mínimo}}$, y alerta de `Agotado` cuando $S_{\text{actual}} = 0$. Los productos en estado `Inactivo` no disparan alertas en el tablero operativo. | Inventario |
| **RN-12** | Inmutabilidad financiera e histórica (Instantáneas) | Al crear una `Cita` o un `RegistroCorte`, el sistema almacena una copia instantánea (*snapshot*) del nombre y precio en COP de cada servicio aplicado, así como del porcentaje de comisión vigente del barbero al momento del corte. Cambios futuros en el catálogo de servicios o en el perfil del barbero nunca recalculan ni alteran registros históricos. | Caja, Servicios, Barberos |
| **RN-13** | Integridad referencial mediante borrado lógico | Las entidades `Barbero`, `Servicio`, `ProductoInventario`, `Cita` y `RegistroCorte` que participen en operaciones históricas no pueden eliminarse físicamente de la base de datos. Su retiro de la operación diaria se ejecuta exclusivamente mediante cambio de estado a `Inactivo` o `Anulado`. | Todos los módulos |
| **RN-14** | Límites anti-abuso en agendamiento público | Un mismo cliente (identificado por correo electrónico o número de teléfono) puede mantener un máximo de dos (2) citas activas (`Pendiente` o `Confirmada`) para una misma fecha calendario y un máximo de tres (3) citas activas futuras en total, con el fin de mitigar reservas falsas o acaparamiento de agenda. | Agendamiento, Seguridad |
| **RN-15** | Consistencia monetaria y ajustes en caja | El valor total de un `RegistroCorte` corresponde por defecto a la suma exacta de los precios vigentes de los servicios aplicados. Solo el usuario con rol Administrador puede aplicar un ajuste manual (descuento o recargo) al valor cobrado final, en cuyo caso el campo de notas pasa a ser obligatorio para justificar la diferencia. | Caja |

---

## 5. Requerimientos No Funcionales (RNF)

### 5.1 Rendimiento

| ID | Categoría | Requerimiento Medible | Criterio de Verificación |
| :--- | :--- | :--- | :--- |
| **RNF-01** | Rendimiento | La carga inicial del Portal Público (Landing Page) en una conexión móvil 4G estándar debe completarse con un *Largest Contentful Paint* (LCP) inferior a $2.5$ segundos. | Medición mediante auditoría de rendimiento web en perfil móvil simulado 4G con caché fría. |
| **RNF-02** | Rendimiento | El cálculo y respuesta de los bloques de horarios disponibles para una fecha y barbero seleccionados (RF-AGE-04) debe responder en menos de $500$ ms en el percentil 95 ($p_{95}$). | Pruebas de carga sobre el endpoint de disponibilidad con 50 usuarios concurrentes. |
| **RNF-03** | Rendimiento | Las operaciones transaccionales del Backoffice (registro de corte, cambio de estado de cita y movimiento de inventario) deben confirmarse en menos de $800$ ms en el percentil 95 ($p_{95}$). | Medición de tiempos de respuesta del servidor bajo operación simultánea de 10 sesiones administrativas. |
| **RNF-04** | Rendimiento | El sistema debe soportar al menos $50$ consultas concurrentes en la Landing Page y $10$ intentos simultáneos de confirmación de cita sin degradación superior al $20\%$ en tiempos de respuesta ni errores de concurrencia. | Ejecución de pruebas de estrés y carrera sobre el mismo bloque horario. |

### 5.2 Usabilidad y Accesibilidad

| ID | Categoría | Requerimiento Medible | Criterio de Verificación |
| :--- | :--- | :--- | :--- |
| **RNF-05** | Usabilidad (Landing Page) | El Portal Público debe diseñarse bajo enfoque *Mobile-First*, garantizando operabilidad completa en pantallas táctiles de $360\text{ px}$ a $430\text{ px}$ de ancho con áreas táctiles de botones de al menos $44 \times 44\text{ px}$ y sin desplazamiento horizontal. | Inspección en dispositivos móviles reales y emuladores en resoluciones $360 \times 800$, $390 \times 844$ y $1366 \times 768$. |
| **RNF-06** | Usabilidad (Flujo de reserva) | El flujo de agendamiento público debe completarse en exactamente cinco (5) pasos claros con indicador visual de progreso y permitir que un usuario nuevo complete una reserva en menos de $90$ segundos. | Prueba de usabilidad cronometrada con al menos 5 usuarios representativos sin capacitación previa. |
| **RNF-07** | Usabilidad (Backoffice) | El registro de un cliente *walk-in* (RF-COR-01) y la conversión de una cita a corte (RF-COR-02) deben ejecutarse en un máximo de $4$ interacciones (clics/toques) y en un tiempo operativo inferior a $25$ segundos desde la vista principal del Backoffice. | Validación de flujo operativo cronometrado en dispositivo de escritorio y tableta. |
| **RNF-08** | Accesibilidad | Las interfaces pública y administrativa deben cumplir con el nivel de contraste mínimo de WCAG 2.1 Nivel AA (relación de contraste $\ge 4.5:1$ para texto normal y $\ge 3:1$ para texto grande y componentes gráficos) y no depender únicamente del color para transmitir estados. | Auditoría automatizada de accesibilidad sin errores críticos de contraste ni etiquetas faltantes. |

### 5.3 Seguridad y Privacidad

| ID | Categoría | Requerimiento Medible | Criterio de Verificación |
| :--- | :--- | :--- | :--- |
| **RNF-09** | Seguridad (Autenticación y Cifrado) | Todo acceso al Backoffice requiere autenticación mediante correo y contraseña con longitud mínima de $8$ caracteres alfanuméricos. Las contraseñas deben almacenarse utilizando un algoritmo criptográfico de hash lento con sal única (como Argon2id o bcrypt con factor de costo $\ge 10$). Todo el tráfico de red debe cifrarse obligatoriamente mediante HTTPS (TLS 1.2 o superior). | Revisión de código, inspección de base de datos (ausencia de contraseñas en texto plano) y verificación de redirección HTTP a HTTPS. |
| **RNF-10** | Seguridad (Control de Acceso y Sesiones) | El control de permisos RBAC (Sección 2.2) debe aplicarse obligatoriamente en el servidor en cada solicitud de API. Tras $5$ intentos fallidos consecutivos de inicio de sesión sobre una cuenta, el sistema debe bloquear temporalmente el acceso durante $15$ minutos. Las sesiones inactivas del Backoffice deben expirar automáticamente tras $8$ horas. | Pruebas de autorización horizontal y vertical (intentar acceder a endpoints de Administrador usando un token de Barbero debe retornar código HTTP `403 Forbidden`). |
| **RNF-11** | Seguridad (Protección Anti-Bots en Landing) | Los endpoints públicos de creación de citas deben incorporar protección contra automatización y spam mediante: (1) mecanismo de verificación anti-bots no intrusivo (CAPTCHA invisible o campo trampa/*honeypot*) y (2) limitación de tasa (*rate limiting*) de máximo $10$ solicitudes de reserva por dirección IP en una ventana de $15$ minutos. | Prueba automatizada enviando $15$ solicitudes en $1$ minuto desde una misma IP; a partir de la solicitud $11$ el servidor debe retornar HTTP `429 Too Many Requests`. |
| **RNF-12** | Seguridad (Validación de Entradas y Datos) | Todas las entradas de usuario deben validarse y sanitizarse en el servidor contra inyección SQL, Cross-Site Scripting (XSS) y falsificación de solicitudes entre sitios (CSRF). Los datos personales de los clientes (teléfono y correo) nunca se exponen en endpoints públicos no autenticados. | Escaneo de seguridad basado en OWASP Top 10 y verificación de respuestas JSON públicas. |

### 5.4 Disponibilidad, Confiabilidad y Mantenibilidad

| ID | Categoría | Requerimiento Medible | Criterio de Verificación |
| :--- | :--- | :--- | :--- |
| **RNF-13** | Disponibilidad | El sistema debe garantizar una disponibilidad operativa mínima del $99.5\%$ mensual (tiempo máximo de inactividad no planificada de $3.6$ horas al mes), especialmente durante la franja horaria de operación comercial (07:00 a 21:00 UTC-5). | Monitoreo continuo de disponibilidad (*health checks*) cada 60 segundos con registro mensual. |
| **RNF-14** | Confiabilidad y Respaldos | Debe ejecutarse un respaldo automatizado diario de la base de datos con retención mínima de $30$ días, garantizando un Objetivo de Punto de Recuperación (RPO) $\le 24$ horas y un Objetivo de Tiempo de Recuperación (RTO) $\le 4$ horas. | Prueba trimestral de restauración exitosa de un respaldo en un entorno de validación. |
| **RNF-15** | Mantenibilidad y Portabilidad | La capa de lógica de negocio debe exponerse mediante contratos de interfaz documentados y desacoplados de la presentación, con registros estructurados (*logs*) de errores y eventos críticos (confirmación de citas, anulaciones de caja, cambios de stock). Todas las marcas de tiempo deben persistirse en UTC y renderizarse en `America/Bogota` (UTC-5). | Verificación de documentación de API, formato de logs y consistencia horaria en pruebas de cambio de día (23:30–00:30 UTC-5). |
| **RNF-16** | Compatibilidad | Tanto la Landing Page como el Backoffice deben operar sin defectos funcionales en las dos últimas versiones estables de Google Chrome, Mozilla Firefox, Apple Safari (iOS/macOS) y Microsoft Edge. | Ejecución de matriz de pruebas de humo (*smoke testing*) en los cuatro navegadores indicados. |

---

## 6. Modelo Conceptual de Datos (Entidades Principales)

El modelo conceptual se diseña de manera relacional y normalizada, incorporando la entidad `Sede` como raíz de configuración para asegurar la escalabilidad futura a múltiples sucursales sin afectar la simplicidad operativa del MVP.

### Diagrama Conceptual de Relaciones

```text
[Sede] 1 ----< * [Usuario] 1 ---- 0..1 [Barbero]
  |                                       |
  |-- 1 ----< * [Servicio]                |-- 1 ----< * [HorarioBarbero]
  |-- 1 ----< * [ProductoInventario]      |-- 1 ----< * [BloqueoHorario]
  |                    |                  |
  |                    +-- 1 ----< * [MovimientoInventario]
  |
  |-- 1 ----< * [Cita] * >---- 1 [Cliente]
  |               |  \
  |               |   +-- 1 ----< * [CitaServicio] * >---- 1 [Servicio]
  |               |
  |               +-- 0..1 ---- 1 [RegistroCorte] * >---- 1 [Barbero]
  |                                   |
  |                                   +-- 1 ----< * [RegistroCorteServicio] * >---- 1 [Servicio]
```

### Definición de Entidades y Atributos Principales

#### 1. `Sede`
Almacena la identidad y configuración operativa global del negocio (instancia única en versión 1.0).
- **Atributos:** `sede_id` (PK), `nombre_comercial`, `eslogan`, `logo_url`, `direccion_fisica`, `enlace_mapa_url`, `telefono_contacto`, `correo_contacto`, `horario_general_texto`, `dias_max_anticipacion` (defecto: 30), `minutos_min_anticipacion` (defecto: 30), `estado_inicial_cita` (`Pendiente` o `Confirmada`), `politica_datos_url`.

#### 2. `Usuario`
Representa las cuentas autenticadas del Backoffice.
- **Atributos:** `usuario_id` (PK), `sede_id` (FK), `correo` (Único), `contrasena_hash`, `rol` (`Administrador` | `Barbero`), `estado` (`Activo` | `Inactivo`), `intentos_fallidos`, `bloqueado_hasta`, `ultimo_acceso_en`, `creado_en`.

#### 3. `Barbero`
Perfil operativo y público de cada barbero de la sede.
- **Atributos:** `barbero_id` (PK), `sede_id` (FK), `usuario_id` (FK opcional, Único), `nombre_completo`, `nombre_publico`, `telefono`, `foto_url`, `biografia_breve`, `porcentaje_comision` (Decimal $0.00$–$100.00$, opcional), `estado` (`Activo` | `Inactivo`), `creado_en`, `actualizado_en`.

#### 4. `HorarioBarbero`
Plantilla semanal recurrente de disponibilidad laboral por barbero.
- **Atributos:** `horario_id` (PK), `barbero_id` (FK), `dia_semana` (Entero $1$=Lunes a $7$=Domingo), `es_descanso` (Booleano), `hora_inicio` (HH:MM, minutos `:00`/`:30`), `hora_fin` (HH:MM, minutos `:00`/`:30`).

#### 5. `BloqueoHorario`
Excepciones puntuales de no disponibilidad para una fecha específica.
- **Atributos:** `bloqueo_id` (PK), `barbero_id` (FK), `fecha` (Fecha), `dia_completo` (Booleano), `hora_inicio` (HH:MM), `hora_fin` (HH:MM), `motivo`, `creado_por_usuario_id` (FK), `creado_en`.

#### 6. `Servicio`
Catálogo de servicios ofrecidos por la barbería.
- **Atributos:** `servicio_id` (PK), `sede_id` (FK), `nombre`, `descripcion_breve`, `precio_cop` (Entero $> 0$), `duracion_bloques` (Entero $\ge 1$, unidad de 30 min), `visible_publico` (Booleano), `estado` (`Activo` | `Inactivo`), `orden_visual`, `creado_en`, `actualizado_en`.

#### 7. `Cliente`
Registro liviano de clientes capturados en agendamiento público o en recepción (sin contraseña).
- **Atributos:** `cliente_id` (PK), `sede_id` (FK), `nombre_completo`, `telefono_whatsapp`, `correo`, `acepto_politica_datos_en`, `creado_en`, `actualizado_en`.

#### 8. `Cita`
Reserva programada de uno o más bloques de tiempo para un cliente con un barbero.
- **Atributos:** `cita_id` (PK), `sede_id` (FK), `codigo_reserva` (Único, formato `SB-XXXXXX`), `cliente_id` (FK), `barbero_id` (FK), `barbero_asignado_automaticamente` (Booleano), `fecha` (Fecha), `hora_inicio` (HH:MM), `hora_fin` (HH:MM), `bloques_totales` (Entero $\ge 1$), `precio_estimado_cop` (Entero), `estado` (`Pendiente` | `Confirmada` | `Completada` | `Cancelada` | `No asistió`), `notas_cliente`, `motivo_cancelacion`, `origen` (`Landing` | `Backoffice`), `creado_en`, `actualizado_en`.

#### 9. `CitaServicio`
Entidad asociativa que vincula una `Cita` con los servicios reservados preservando instantánea de precio y duración.
- **Atributos:** `cita_servicio_id` (PK), `cita_id` (FK), `servicio_id` (FK), `nombre_servicio_snapshot`, `precio_cop_snapshot` (Entero), `duracion_bloques_snapshot` (Entero).

#### 10. `RegistroCorte`
Transacción operativa de caja que consolida un servicio efectivamente realizado (proveniente de cita o *walk-in*).
- **Atributos:** `registro_corte_id` (PK), `sede_id` (FK), `cita_id` (FK opcional, Único cuando no es nulo), `barbero_id` (FK), `cliente_id` (FK opcional), `nombre_cliente_referencial`, `origen` (`Cita` | `Walk-in`), `fecha_hora_atencion`, `precio_calculado_cop` (Entero), `precio_cobrado_cop` (Entero), `metodo_pago` (`Efectivo` | `Transferencia bancaria` | `Tarjeta débito/crédito` | `Nequi` | `Daviplata`), `porcentaje_comision_snapshot` (Decimal), `comision_calculada_cop` (Entero), `notas`, `estado` (`Activo` | `Anulado`), `motivo_anulacion`, `anulado_por_usuario_id` (FK opcional), `anulado_en`, `registrado_por_usuario_id` (FK), `creado_en`.

#### 11. `RegistroCorteServicio`
Entidad asociativa que detalla cada servicio efectivamente ejecutado en un `RegistroCorte`.
- **Atributos:** `registro_corte_servicio_id` (PK), `registro_corte_id` (FK), `servicio_id` (FK), `nombre_servicio_snapshot`, `precio_cop_snapshot` (Entero).

#### 12. `ProductoInventario`
Ficha maestra de artículos disponibles para venta al público o consumo interno.
- **Atributos:** `producto_id` (PK), `sede_id` (FK), `sku` (Único opcional), `nombre`, `categoria`, `precio_venta_cop` (Entero $> 0$), `costo_unitario_cop` (Entero $\ge 0$, opcional), `stock_actual` (Entero $\ge 0$), `stock_minimo` (Entero $\ge 0$), `estado` (`Activo` | `Inactivo`), `creado_en`, `actualizado_en`.

#### 13. `MovimientoInventario`
Registro cronológico inmutable de cada entrada o salida de existencias.
- **Atributos:** `movimiento_id` (PK), `sede_id` (FK), `producto_id` (FK), `tipo` (`Entrada` | `Salida`), `subtipo` (`Inventario Inicial` | `Compra / Reposición` | `Ajuste positivo` | `Venta al público` | `Consumo interno` | `Ajuste negativo`), `cantidad` (Entero $> 0$), `stock_resultante` (Entero $\ge 0$), `valor_total_cop` (Entero opcional), `metodo_pago` (Opcional, obligatorio en ventas), `registro_corte_id` (FK opcional), `observacion`, `usuario_id` (FK), `creado_en`.

### Resumen de Cardinalidades Clave

| Relación | Cardinalidad | Restricción de Integridad |
| :--- | :--- | :--- |
| `Barbero` — `HorarioBarbero` | $1 : N$ | Un barbero tiene 7 días configurados, pudiendo tener 1 o 2 franjas por día laboral. |
| `Barbero` — `Cita` | $1 : N$ | Restricción de no solapamiento por bloques horarios en citas activas (RN-01). |
| `Cliente` — `Cita` | $1 : N$ | Un cliente puede acumular historial ilimitado de citas y hasta 3 citas futuras activas (RN-14). |
| `Cita` — `Servicio` (vía `CitaServicio`) | $N : M$ | Toda cita debe tener al menos un (1) servicio asociado. |
| `Cita` — `RegistroCorte` | $1 : 0..1$ | Una cita `Completada` origina exactamente un `RegistroCorte`; un `RegistroCorte` *walk-in* tiene `cita_id` nulo (RN-08). |
| `RegistroCorte` — `Servicio` (vía `RegistroCorteServicio`) | $N : M$ | Todo registro de corte debe asociar al menos un (1) servicio. |
| `ProductoInventario` — `MovimientoInventario` | $1 : N$ | Toda variación de `stock_actual` requiere exactamente un registro de movimiento atómico (RN-10). |

---

## 7. Flujos Críticos de Usuario (Casos de Uso Resumidos)

### CU-01: Reserva de cita en línea desde la Landing Page

- **Actor principal:** Cliente Público.
- **Trazabilidad:** RF-AGE-01, RF-AGE-02, RF-AGE-03, RF-AGE-04, RF-AGE-05, RF-AGE-06; RN-01, RN-02, RN-03, RN-04, RN-14; RNF-01, RNF-02, RNF-05, RNF-06, RNF-11.
- **Precondiciones:** existe al menos un servicio `Activo` y `Visible` en el catálogo y al menos un barbero `Activo` con horario laboral configurado.
- **Disparador:** el cliente accede al Portal Público y pulsa el botón `"Agendar Cita"`.

#### Flujo Principal

1. El sistema despliega el **Paso 1 (Servicios)** listando los servicios activos y visibles con su precio en COP y duración en minutos.
2. El cliente selecciona uno o más servicios (por ejemplo, `"Corte Fade"` de 1 bloque y `"Perfilado de Barba"` de 1 bloque). El sistema calcula y muestra en tiempo real `Duración total: 60 min (2 bloques)` y `Total estimado: $ 40.000 COP`. El cliente pulsa `"Continuar"`.
3. El sistema despliega el **Paso 2 (Barbero)** mostrando la opción `"Cualquier barbero disponible"` seguida de las tarjetas de barberos activos. El cliente selecciona un barbero específico (o `"Cualquier barbero disponible"`) y pulsa `"Continuar"`.
4. El sistema despliega el **Paso 3 (Fecha y Hora)** y consulta en tiempo real los bloques consecutivos libres para la duración requerida ($B_{\text{total}} = 2$). El cliente selecciona una fecha dentro de los próximos $30$ días y elige una hora de inicio disponible (por ejemplo, `03:00 PM`, correspondiente a los bloques `15:00–15:30` y `15:30–16:00`). El cliente pulsa `"Continuar"`.
5. El sistema despliega el **Paso 4 (Datos del Cliente)**. El cliente ingresa su nombre completo, teléfono/WhatsApp, correo electrónico, notas opcionales y marca la casilla de aceptación de tratamiento de datos personales.
6. El sistema muestra el resumen consolidado de la reserva y el cliente pulsa `"Confirmar Cita"`.
7. El servidor valida el mecanismo anti-bots, verifica los límites de reservas activas del cliente (RN-14) e inicia una transacción ACID bloqueando los bloques `15:00–15:30` y `15:30–16:00` para el barbero seleccionado (o asigna un barbero según RN-04 si eligió `"Cualquier barbero disponible"`).
8. El sistema crea o actualiza el registro de `Cliente`, inserta la `Cita` con sus registros en `CitaServicio` en estado `Pendiente` (o `Confirmada`), genera el código único `SB-XXXXXX` y confirma la transacción.
9. El sistema encola el envío del correo electrónico de confirmación con los datos de la cita y presenta en pantalla el **Paso 5 (Confirmación)** con el código único de reserva y el resumen completo.

#### Flujos Alternativos y de Excepción

- **FA-01 (Conflicto de concurrencia en el paso 7):** si otro cliente confirmó el mismo bloque horario instantes antes, el sistema aborta la transacción sin crear la cita, muestra el mensaje `"El horario seleccionado acaba de ser ocupado. Por favor elige otro horario disponible"`, retorna al Paso 3 conservando los servicios, barbero y datos del cliente, y recarga la cuadrícula actualizada de disponibilidad.
- **FA-02 (Límite de citas activas excedido en el paso 7):** si el correo o teléfono ya posee $2$ citas activas ese mismo día o $3$ citas futuras activas, el sistema rechaza la reserva indicando claramente el límite operativo y el número de contacto de la barbería.
- **FA-03 (Fallo temporal del proveedor de correo en el paso 9):** la reserva permanece válidamente confirmada en el sistema; se muestra el código `SB-XXXXXX` en pantalla invitando al cliente a tomar captura del comprobante y el servidor programa hasta $3$ reintentos automáticos de envío de correo.

- **Postcondiciones:** la cita aparece inmediatamente en la agenda del Backoffice, los bloques horarios quedan bloqueados frente a terceros y el cliente cuenta con su código único de confirmación.

---

### CU-02: Atención de cita agendada y conversión a Registro de Corte

- **Actor principal:** Barbero (o Administrador).
- **Trazabilidad:** RF-AGE-07, RF-AGE-08, RF-COR-02, RF-COR-04; RN-07, RN-08, RN-12, RN-15; RNF-03, RNF-07.
- **Precondiciones:** el actor está autenticado en el Backoffice y existe una cita en estado `Pendiente` o `Confirmada` asignada al barbero para el día en curso.
- **Disparador:** el cliente llega a la barbería, recibe el servicio y procede al pago.

#### Flujo Principal

1. El actor abre la vista de **Agenda del Día** en el Backoffice y ubica la tarjeta de la cita del cliente (por código, hora o nombre).
2. *(Opcional)* Al llegar el cliente, el actor cambia el estado de `Pendiente` a `Confirmada` con un toque.
3. Al finalizar la atención, el actor selecciona la acción `"Completar y Registrar Corte"` sobre la tarjeta de la cita.
4. El sistema abre el modal/pantalla de cierre con los campos precargados automáticamente: barbero asignado, nombre del cliente, fecha/hora actual y lista de servicios reservados con sus precios instantáneos en COP.
5. El actor verifica los servicios realizados (opcionalmente añade un servicio extra ejecutado en silla, como `"Cejas"`, recalculándose automáticamente el total en COP) y selecciona el método de pago entregado por el cliente (por ejemplo, `Nequi`).
6. El actor pulsa `"Guardar y Completar"`.
7. Dentro de una transacción ACID, el sistema crea el `RegistroCorte` con `origen = Cita`, vincula `cita_id`, almacena las instantáneas de cada servicio en `RegistroCorteServicio`, calcula y guarda la comisión referencial vigente del barbero y actualiza el estado de la cita a `Completada`.
8. El sistema cierra el modal, actualiza el color/etiqueta de la cita a `Completada` en la agenda e incrementa inmediatamente los indicadores de ingresos del día y del barbero.

#### Flujos Alternativos y de Excepción

- **FA-01 (Ajuste de precio por Administrador en el paso 5):** si el actor tiene rol Administrador y otorga un descuento manual sobre el valor calculado, modifica el campo `precio_cobrado_cop`; el sistema exige diligenciar el campo `notas` con la justificación antes de habilitar el guardado (RN-15).
- **FA-02 (Cliente no asiste a la cita):** si transcurren más de $15$ minutos desde la hora de inicio sin que llegue el cliente, el actor selecciona `"Marcar No asistió"`. El sistema cambia el estado de la cita a `No asistió`, no genera registro en caja y libera cualquier bloque posterior completo que pertenezca a esa cita (RN-06).

- **Postcondiciones:** la cita queda en estado terminal `Completada`, existe exactamente un `RegistroCorte` vinculado y el resumen diario refleja el ingreso exacto bajo el método de pago seleccionado.

---

### CU-03: Registro de cliente sin cita (*Walk-in*) y actualización de inventario por venta de producto

- **Actor principal:** Barbero (o Administrador).
- **Trazabilidad:** RF-COR-01, RF-COR-03, RF-INV-03, RF-INV-04, RF-INV-05; RN-09, RN-10, RN-11, RN-12; RNF-03, RNF-07.
- **Precondiciones:** el actor está autenticado en el Backoffice; existen servicios activos y productos de inventario activos con existencias disponibles ($S_{\text{actual}} \ge 1$).
- **Disparador:** un cliente llega presencialmente sin cita previa, recibe un servicio y además adquiere un producto al por menor (por ejemplo, una cera moldeadora).

#### Flujo Principal

1. Desde la vista principal del Backoffice, el actor pulsa el botón de acceso directo `"Registrar Corte (Walk-in)"`.
2. El sistema presenta el formulario operativo con la fecha/hora actual y el perfil del barbero autenticado preseleccionado (si es Administrador, selecciona el barbero que atendió).
3. El actor selecciona el o los servicios realizados (por ejemplo, `"Corte a Tijera"` por `$ 25.000 COP`), elige el método de pago (por ejemplo, `Efectivo`) e ingresa opcionalmente el nombre del cliente o notas.
4. El actor pulsa `"Registrar Corte"`. El sistema persiste el `RegistroCorte` con `origen = Walk-in`, `cita_id = NULL`, guarda las instantáneas de servicio y comisión, y muestra confirmación inmediata con opción directa `"Registrar Venta de Producto"`.
5. Para registrar la compra de la cera moldeadora, el actor selecciona `"Registrar Salida / Venta de Producto"` (enlazada opcionalmente al corte recién creado o desde el módulo de Inventario).
6. El actor selecciona el producto `"Cera Mate 100g"` (stock actual: $3$ unidades, umbral mínimo: $2$ unidades), ingresa `cantidad = 1`, `tipo = Venta al público` y `método de pago = Efectivo`.
7. El sistema inicia una transacción ACID, verifica que $3 - 1 \ge 0$ (RN-10), actualiza `stock_actual` del producto a $2$ unidades y registra el `MovimientoInventario` inmutable por el monto de venta configurado.
8. Al verificar que el nuevo saldo cumple $S_{\text{actual}} \le S_{\text{mínimo}}$ ($2 \le 2$), el sistema activa inmediatamente la etiqueta visual `"Stock bajo"` sobre `"Cera Mate 100g"` e incrementa el contador de alertas en el panel del Backoffice (RN-11).

#### Flujos Alternativos y de Excepción

- **FA-01 (Intento de venta superior al stock disponible en el paso 7):** si el actor intenta registrar una salida de $4$ unidades cuando `stock_actual = 3`, el sistema rechaza la transacción sin alterar las existencias y despliega el mensaje `"Stock insuficiente para Cera Mate 100g. Existencia actual disponible: 3 unidades"`.
- **FA-02 (Salida por consumo interno del barbero en el paso 6):** si el producto se utiliza como insumo en el puesto de trabajo y no como venta, el actor selecciona `tipo = Consumo interno`; el sistema omite la obligatoriedad del método de pago, descuenta el inventario con valor de venta `$ 0 COP` y registra el movimiento auditable.

- **Postcondiciones:** el servicio *walk-in* queda contabilizado en caja diaria y en el resumen de comisiones del barbero, el inventario queda descontado de forma atómica con trazabilidad en el kardex y las alertas visuales de stock bajo permanecen actualizadas en tiempo real.