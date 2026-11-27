-- ============================================================================
-- SMARTBARBER — MIGRACIÓN 003: EXTENSIÓN DE PUSH_SUSCRIPCIONES CON ROL Y SEDE
-- ============================================================================
-- Permite segmentar y asociar suscripciones Web Push por rol y sede operativa.
-- ============================================================================

BEGIN;

ALTER TABLE push_suscripciones 
    ADD COLUMN IF NOT EXISTS rol VARCHAR(20),
    ADD COLUMN IF NOT EXISTS sede_id UUID REFERENCES sedes(sede_id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_push_suscripciones_rol_sede 
    ON push_suscripciones (rol, sede_id);

COMMIT;
