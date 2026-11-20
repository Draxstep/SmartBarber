/**
 * @file index.js
 * @description Punto de entrada público (Public Facade / Barrel) del módulo Servicios.
 */
import { ServicioPgRepository } from './repositories/ServicioPgRepository.js';
import { ServicioService } from './services/ServicioService.js';

export * from './domain/Servicio.js';
export * from './dto/servicioDto.js';
export * from './mappers/servicioMapper.js';
export * from './repositories/IServicioRepository.js';
export * from './repositories/ServicioPgRepository.js';
export * from './services/ServicioService.js';

export const servicioRepository = new ServicioPgRepository();
export const servicioService = new ServicioService(servicioRepository);
