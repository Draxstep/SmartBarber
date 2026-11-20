/**
 * @file index.js
 * @description Punto de entrada público (Public Facade / Barrel) del módulo Inventario y Kardex.
 */
import { InventarioPgRepository } from './repositories/InventarioPgRepository.js';

export * from './domain/ProductoInventario.js';
export * from './domain/MovimientoInventario.js';
export * from './dto/inventarioDto.js';
export * from './mappers/inventarioMapper.js';
export * from './repositories/IInventarioRepository.js';
export * from './repositories/InventarioPgRepository.js';

export const inventarioRepository = new InventarioPgRepository();
