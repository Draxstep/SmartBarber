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
DO $$ BEGIN
    CREATE TYPE estado_registro_enum AS ENUM ('activo', 'inactivo');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE rol_usuario_enum AS ENUM ('administrador', 'barbero');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE estado_cita_enum AS ENUM ('pendiente', 'confirmada', 'completada', 'cancelada', 'no_asistio');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE origen_cita_enum AS ENUM ('landing', 'backoffice');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE origen_corte_enum AS ENUM ('cita', 'walk_in');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE estado_corte_enum AS ENUM ('activo', 'anulado');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE metodo_pago_enum AS ENUM ('efectivo', 'transferencia_bancaria', 'tarjeta_debito_credito', 'nequi', 'daviplata');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE tipo_movimiento_inventario_enum AS ENUM ('entrada', 'salida');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE subtipo_movimiento_inventario_enum AS ENUM (
        'inventario_inicial',
        'compra_reposicion',
        'ajuste_positivo',
        'venta_publico',
        'consumo_interno',
        'ajuste_negativo'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE estado_notificacion_enum AS ENUM ('pendiente', 'enviada', 'fallida');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

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
CREATE TABLE IF NOT EXISTS sedes (
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
CREATE TABLE IF NOT EXISTS usuarios (
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
CREATE TABLE IF NOT EXISTS sesiones_usuarios (
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
CREATE TABLE IF NOT EXISTS barberos (
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
CREATE TABLE IF NOT EXISTS horarios_barberos (
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
CREATE TABLE IF NOT EXISTS bloqueos_horarios (
    bloqueo_id            UUID         NOT NULL DEFAULT gen_random_uuid(),
    sede_id               UUID         NOT NULL,
    barbero_id            UUID         NOT NULL,
    fecha                 DATE         NOT NULL,
    dia_completo          BOOLEAN      NOT NULL DEFAULT FALSE,
    hora_inicio           TIME         NULL,
    hora_fin              TIME         NULL,
    inicio_en             TIMESTAMPTZ  NOT NULL,
    fin_en                TIMESTAMPTZ  NOT NULL,
    rango_tiempo          TSTZRANGE    GENERATED ALWAYS AS (
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
CREATE TABLE IF NOT EXISTS servicios (
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
CREATE TABLE IF NOT EXISTS clientes (
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
CREATE TABLE IF NOT EXISTS citas (
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
CREATE TABLE IF NOT EXISTS citas_servicios (
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
CREATE TABLE IF NOT EXISTS historial_estados_citas (
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
CREATE TABLE IF NOT EXISTS notificaciones_correo (
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
CREATE TABLE IF NOT EXISTS registros_cortes (
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
CREATE TABLE IF NOT EXISTS registros_cortes_servicios (
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
CREATE TABLE IF NOT EXISTS productos_inventario (
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
CREATE TABLE IF NOT EXISTS movimientos_inventario (
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

CREATE INDEX IF NOT EXISTS idx_usuarios_sede_rol_activo
    ON usuarios (sede_id, rol)
    WHERE (estado = 'activo');

CREATE INDEX IF NOT EXISTS idx_sesiones_usuarios_activas
    ON sesiones_usuarios (usuario_id, expira_en)
    WHERE (revocada_en IS NULL);

CREATE INDEX IF NOT EXISTS idx_barberos_activos_sede
    ON barberos (sede_id, nombre_completo)
    WHERE (estado = 'activo');

CREATE INDEX IF NOT EXISTS idx_horarios_barberos_consulta
    ON horarios_barberos (barbero_id, dia_semana)
    INCLUDE (es_descanso, hora_inicio, hora_fin);

CREATE INDEX IF NOT EXISTS idx_bloqueos_horarios_fecha
    ON bloqueos_horarios (barbero_id, fecha)
    WHERE (activo = TRUE);

CREATE UNIQUE INDEX IF NOT EXISTS uq_servicios_sede_nombre_activo
    ON servicios (sede_id, LOWER(TRIM(nombre)))
    WHERE (estado = 'activo');

CREATE INDEX IF NOT EXISTS idx_servicios_landing_publico
    ON servicios (sede_id, orden_visual, nombre)
    WHERE (estado = 'activo' AND visible_publico = TRUE);

CREATE INDEX IF NOT EXISTS idx_clientes_sede_telefono
    ON clientes (sede_id, telefono_whatsapp);

CREATE INDEX IF NOT EXISTS idx_citas_disponibilidad_fecha
    ON citas (sede_id, fecha, barbero_id)
    INCLUDE (hora_inicio, hora_fin, bloques_totales, estado)
    WHERE (estado IN ('pendiente', 'confirmada'));

CREATE INDEX IF NOT EXISTS idx_citas_agenda_sede_fecha
    ON citas (sede_id, fecha, hora_inicio, barbero_id);

CREATE INDEX IF NOT EXISTS idx_citas_cliente_activas
    ON citas (cliente_id, fecha)
    WHERE (estado IN ('pendiente', 'confirmada'));

CREATE INDEX IF NOT EXISTS idx_citas_servicios_servicio_id
    ON citas_servicios (servicio_id);

CREATE INDEX IF NOT EXISTS idx_historial_estados_citas_cita_fecha
    ON historial_estados_citas (cita_id, cambiado_en DESC);

CREATE INDEX IF NOT EXISTS idx_notificaciones_correo_cola
    ON notificaciones_correo (proximo_reintento_en, creado_en)
    WHERE (estado = 'pendiente');

CREATE INDEX IF NOT EXISTS idx_notificaciones_correo_cita_id
    ON notificaciones_correo (cita_id);

CREATE UNIQUE INDEX IF NOT EXISTS uq_registros_cortes_cita_activa
    ON registros_cortes (cita_id)
    WHERE (cita_id IS NOT NULL AND estado = 'activo');

CREATE INDEX IF NOT EXISTS idx_registros_cortes_reporte_diario
    ON registros_cortes (sede_id, fecha_hora_atencion DESC, barbero_id)
    INCLUDE (precio_cobrado_cop, metodo_pago, comision_calculada_cop, origen)
    WHERE (estado = 'activo');

CREATE INDEX IF NOT EXISTS idx_registros_cortes_barbero_historial
    ON registros_cortes (barbero_id, fecha_hora_atencion DESC);

CREATE INDEX IF NOT EXISTS idx_registros_cortes_servicios_servicio_id
    ON registros_cortes_servicios (servicio_id);

CREATE UNIQUE INDEX IF NOT EXISTS uq_productos_inventario_sede_sku
    ON productos_inventario (sede_id, LOWER(TRIM(sku)))
    WHERE (sku IS NOT NULL);

CREATE INDEX IF NOT EXISTS idx_productos_inventario_alerta_stock
    ON productos_inventario (sede_id, stock_actual)
    WHERE (estado = 'activo' AND stock_actual <= stock_minimo);

CREATE INDEX IF NOT EXISTS idx_movimientos_inventario_kardex
    ON movimientos_inventario (sede_id, producto_id, creado_en DESC);

CREATE INDEX IF NOT EXISTS idx_movimientos_inventario_fecha_tipo
    ON movimientos_inventario (sede_id, creado_en DESC, tipo);

CREATE INDEX IF NOT EXISTS idx_movimientos_inventario_corte_id
    ON movimientos_inventario (registro_corte_id)
    WHERE (registro_corte_id IS NOT NULL);

-- ----------------------------------------------------------------------------
-- 6. TRIGGERS DE AUDITORÍA E INTEGRIDAD
-- ----------------------------------------------------------------------------

DROP TRIGGER IF EXISTS trg_sedes_actualizado_en ON sedes;
CREATE TRIGGER trg_sedes_actualizado_en
    BEFORE UPDATE ON sedes
    FOR EACH ROW EXECUTE FUNCTION fn_actualizar_marca_tiempo();

DROP TRIGGER IF EXISTS trg_usuarios_actualizado_en ON usuarios;
CREATE TRIGGER trg_usuarios_actualizado_en
    BEFORE UPDATE ON usuarios
    FOR EACH ROW EXECUTE FUNCTION fn_actualizar_marca_tiempo();

DROP TRIGGER IF EXISTS trg_barberos_actualizado_en ON barberos;
CREATE TRIGGER trg_barberos_actualizado_en
    BEFORE UPDATE ON barberos
    FOR EACH ROW EXECUTE FUNCTION fn_actualizar_marca_tiempo();

DROP TRIGGER IF EXISTS trg_horarios_barberos_actualizado_en ON horarios_barberos;
CREATE TRIGGER trg_horarios_barberos_actualizado_en
    BEFORE UPDATE ON horarios_barberos
    FOR EACH ROW EXECUTE FUNCTION fn_actualizar_marca_tiempo();

DROP TRIGGER IF EXISTS trg_bloqueos_horarios_actualizado_en ON bloqueos_horarios;
CREATE TRIGGER trg_bloqueos_horarios_actualizado_en
    BEFORE UPDATE ON bloqueos_horarios
    FOR EACH ROW EXECUTE FUNCTION fn_actualizar_marca_tiempo();

DROP TRIGGER IF EXISTS trg_servicios_actualizado_en ON servicios;
CREATE TRIGGER trg_servicios_actualizado_en
    BEFORE UPDATE ON servicios
    FOR EACH ROW EXECUTE FUNCTION fn_actualizar_marca_tiempo();

DROP TRIGGER IF EXISTS trg_clientes_actualizado_en ON clientes;
CREATE TRIGGER trg_clientes_actualizado_en
    BEFORE UPDATE ON clientes
    FOR EACH ROW EXECUTE FUNCTION fn_actualizar_marca_tiempo();

DROP TRIGGER IF EXISTS trg_citas_actualizado_en ON citas;
CREATE TRIGGER trg_citas_actualizado_en
    BEFORE UPDATE ON citas
    FOR EACH ROW EXECUTE FUNCTION fn_actualizar_marca_tiempo();

DROP TRIGGER IF EXISTS trg_notificaciones_correo_actualizado_en ON notificaciones_correo;
CREATE TRIGGER trg_notificaciones_correo_actualizado_en
    BEFORE UPDATE ON notificaciones_correo
    FOR EACH ROW EXECUTE FUNCTION fn_actualizar_marca_tiempo();

DROP TRIGGER IF EXISTS trg_registros_cortes_actualizado_en ON registros_cortes;
CREATE TRIGGER trg_registros_cortes_actualizado_en
    BEFORE UPDATE ON registros_cortes
    FOR EACH ROW EXECUTE FUNCTION fn_actualizar_marca_tiempo();

DROP TRIGGER IF EXISTS trg_productos_inventario_actualizado_en ON productos_inventario;
CREATE TRIGGER trg_productos_inventario_actualizado_en
    BEFORE UPDATE ON productos_inventario
    FOR EACH ROW EXECUTE FUNCTION fn_actualizar_marca_tiempo();

DROP TRIGGER IF EXISTS trg_horarios_barberos_coherencia_descanso ON horarios_barberos;
CREATE TRIGGER trg_horarios_barberos_coherencia_descanso
    BEFORE INSERT OR UPDATE ON horarios_barberos
    FOR EACH ROW EXECUTE FUNCTION fn_validar_coherencia_descanso_barbero();

DROP TRIGGER IF EXISTS trg_movimientos_inventario_inmutable ON movimientos_inventario;
CREATE TRIGGER trg_movimientos_inventario_inmutable
    BEFORE UPDATE OR DELETE ON movimientos_inventario
    FOR EACH ROW EXECUTE FUNCTION fn_bloquear_mutacion_inmutable();

DROP TRIGGER IF EXISTS trg_historial_estados_citas_inmutable ON historial_estados_citas;
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
