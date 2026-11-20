/**
 * @file index.js
 * @description Punto de entrada público (Public Facade / Barrel) del módulo Barberos.
 */
import { BarberoPgRepository } from './repositories/BarberoPgRepository.js';
import { BarberoService } from './services/BarberoService.js';

export * from './domain/Barbero.js';
export * from './domain/HorarioBarbero.js';
export * from './domain/BloqueoHorario.js';
export * from './dto/barberoDto.js';
export * from './mappers/barberoMapper.js';
export * from './repositories/IBarberoRepository.js';
export * from './repositories/BarberoPgRepository.js';
export * from './services/BarberoService.js';

export const barberoRepository = new BarberoPgRepository();
export const barberoService = new BarberoService(barberoRepository);
