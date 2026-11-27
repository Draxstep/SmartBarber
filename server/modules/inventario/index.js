/**
 * @file index.js
 * @description Punto de entrada público (Public Facade / Barrel) del módulo Inventario y Kardex.
 */
import { InventarioPgRepository } from './repositories/InventarioPgRepository.js';
import { InventarioService } from './services/InventarioService.js';

export * from './domain/ProductoInventario.js';
export * from './domain/MovimientoInventario.js';
export * from './dto/inventarioDto.js';
export * from './mappers/inventarioMapper.js';
export * from './repositories/IInventarioRepository.js';
export * from './repositories/InventarioPgRepository.js';
export * from './services/InventarioService.js';

export const inventarioRepository = new InventarioPgRepository();
export const inventarioService = new InventarioService(inventarioRepository);
