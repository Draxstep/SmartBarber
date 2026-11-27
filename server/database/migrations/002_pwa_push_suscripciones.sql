-- ============================================================================
-- SMARTBARBER — MIGRACIÓN 002: TABLAS AUXILIARES PWA Y OFFLINE-FIRST
-- ============================================================================
-- Tablas técnicas aditivas requeridas para:
-- 1. Idempotencia del endpoint POST /api/v1/sync/outbox (Background Sync / Outbox)
-- 2. Gestión de suscripciones Web Push VAPID RFC 8292 con limpieza automática 404/410
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- 1. TABLA sync_idempotencia
-- ----------------------------------------------------------------------------
-- Registra cada UUID único generado en cliente (idCambio) procesado exitosamente
-- para evitar duplicación de cortes, citas o movimientos de kardex en reintentos.
CREATE TABLE IF NOT EXISTS sync_idempotencia (
    id_cambio UUID PRIMARY KEY,
    usuario_id UUID REFERENCES usuarios(usuario_id) ON DELETE SET NULL,
    tipo_operacion VARCHAR(64) NOT NULL,
    respuesta_json JSONB,
    creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sync_idempotencia_usuario 
    ON sync_idempotencia (usuario_id, creado_en DESC);

-- ----------------------------------------------------------------------------
-- 2. TABLA push_suscripciones
-- ----------------------------------------------------------------------------
-- Almacena las suscripciones activas del navegador para el Backoffice
-- vinculadas al usuario (administrador o barbero) para recepción de alertas.
CREATE TABLE IF NOT EXISTS push_suscripciones (
    suscripcion_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id UUID NOT NULL REFERENCES usuarios(usuario_id) ON DELETE CASCADE,
    endpoint TEXT NOT NULL UNIQUE,
    p256dh TEXT NOT NULL,
    auth TEXT NOT NULL,
    creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    actualizado_en TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_push_suscripciones_usuario 
    ON push_suscripciones (usuario_id);

COMMIT;
