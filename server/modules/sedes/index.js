/**
 * @file index.js
 * @description Punto de entrada público (Public Facade / Barrel) del módulo Sedes.
 */
import { SedePgRepository } from './repositories/SedePgRepository.js';

export * from './domain/Sede.js';
export * from './dto/sedeDto.js';
export * from './mappers/sedeMapper.js';
export * from './repositories/ISedeRepository.js';
export * from './repositories/SedePgRepository.js';

// Instancia singleton del repositorio para consumo público
export const sedeRepository = new SedePgRepository();
