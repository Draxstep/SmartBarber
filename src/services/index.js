/**
 * SmartBarber - Services Index & Central Configuration
 * Bandera central de Mocks y exportación unificada de servicios.
 */

// Bandera central para desarrollo y pruebas pre-backend (DESACTIVADA: 100% PRODUCCIÓN REAL)
export const USE_MOCKS = false;

export * from './http-client.js';
export * from './sedes.service.js';
export * from './servicios.service.js';
export * from './barberos.service.js';
export * from './citas.service.js';
export * from './cortes.service.js';
export * from './caja-financial.service.js';
export * from './inventario.service.js';
export * from './auth.service.js';
export * from './camera.service.js';
