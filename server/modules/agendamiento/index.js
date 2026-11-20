/**
 * @file index.js
 * @description Punto de entrada público (Public Facade / Barrel) del módulo Agendamiento.
 */
import { CitaPgRepository } from './repositories/CitaPgRepository.js';

export * from './domain/Cita.js';
export * from './domain/CitaServicio.js';
export * from './domain/HistorialEstadoCita.js';
export * from './domain/NotificacionCorreo.js';
export * from './dto/citaDto.js';
export * from './mappers/citaMapper.js';
export * from './repositories/ICitaRepository.js';
export * from './repositories/CitaPgRepository.js';

export const citaRepository = new CitaPgRepository();
