-- ============================================================================
-- SMARTBARBER — SCRIPT DE VACIADO TOTAL DE DATOS DE PRUEBA
-- ============================================================================
-- Este script vacía el 100% de los datos de todas las tablas operativas
-- respetando integridad referencial, reiniciando contadores de identidad
-- y preservando intacta toda la estructura DDL (tablas, índices GiST,
-- triggers de inmutabilidad y tipos ENUM).
-- ============================================================================

BEGIN;

TRUNCATE TABLE 
  registros_cortes_servicios,
  registros_cortes,
  citas_servicios,
  historial_estados_citas,
  citas,
  bloqueos_horarios,
  horarios_barberos,
  barberos,
  sesiones_usuarios,
  notificaciones_correo,
  sync_idempotencia,
  push_suscripciones,
  movimientos_inventario,
  productos_inventario,
  servicios,
  clientes,
  usuarios,
  sedes
RESTART IDENTITY CASCADE;

COMMIT;
