/**
 * @file index.js
 * @description Punto de entrada público (Public Facade / Barrel) del módulo Registro de Cortes (Caja).
 */
import { RegistroCortePgRepository } from './repositories/RegistroCortePgRepository.js';
import { CorteService } from './services/CorteService.js';

export * from './domain/RegistroCorte.js';
export * from './domain/RegistroCorteServicio.js';
export * from './dto/corteDto.js';
export * from './mappers/corteMapper.js';
export * from './repositories/IRegistroCorteRepository.js';
export * from './repositories/RegistroCortePgRepository.js';
export * from './services/CorteService.js';

export const registroCorteRepository = new RegistroCortePgRepository();
export const corteService = new CorteService(registroCorteRepository);
