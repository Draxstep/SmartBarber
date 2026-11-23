-- ==============================================================================
-- Migración: 20261123_sanitize_test_pwa_inventory.sql
-- Descripción: Desactivar lógicamente los productos huérfanos creados por
--              las pruebas de concurrencia PWA (TEST-PWA-*) para eliminar
--              falsas alertas de stock bajo/agotado (RN-11, RN-13).
-- ==============================================================================

UPDATE productos_inventario
SET estado = 'inactivo'
WHERE sku LIKE 'TEST-PWA%' AND estado = 'activo';
