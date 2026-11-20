/**
 * @file index.js
 * @description Punto de entrada público (Public Facade / Barrel) del módulo Agendamiento.
 */
import { CitaPgRepository } from './repositories/CitaPgRepository.js';
import { CitaService } from './services/CitaService.js';
import { DisponibilidadService } from './services/DisponibilidadService.js';
import { EmailService } from './services/EmailService.js';

export * from './domain/Cita.js';
export * from './domain/CitaServicio.js';
export * from './domain/HistorialEstadoCita.js';
export * from './domain/NotificacionCorreo.js';
export * from './dto/citaDto.js';
export * from './mappers/citaMapper.js';
export * from './repositories/ICitaRepository.js';
export * from './repositories/CitaPgRepository.js';
export * from './services/CitaService.js';
export * from './services/DisponibilidadService.js';
export * from './services/EmailService.js';

export const citaRepository = new CitaPgRepository();
export const emailService = new EmailService();
export const disponibilidadService = new DisponibilidadService();
export const citaService = new CitaService(citaRepository, null, null, null, null, disponibilidadService, emailService);
