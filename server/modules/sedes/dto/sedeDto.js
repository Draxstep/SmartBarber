/**
 * @file sedeDto.js
 * @description Esquemas de validación y DTOs para el módulo de Sedes.
 */
import { z } from 'zod';
import { EstadoRegistro, EstadoCita } from '../../../../shared/contracts/enums.js';

export const createSedeSchema = z.object({
  nombreComercial: z.string().trim().min(2, 'El nombre comercial debe tener al menos 2 caracteres').max(120),
  eslogan: z.string().trim().max(200).nullable().optional(),
  logoUrl: z.string().url().nullable().optional(),
  direccionFisica: z.string().trim().min(5, 'La dirección física debe tener al menos 5 caracteres').max(250),
  enlaceMapaUrl: z.string().url().nullable().optional(),
  telefonoContacto: z.string().trim().min(7, 'El teléfono debe tener al menos 7 caracteres').max(20),
  correoContacto: z.string().trim().email('Correo de contacto inválido').max(150),
  horarioGeneralTexto: z.string().trim().min(5, 'El horario general debe tener al menos 5 caracteres'),
  zonaHoraria: z.string().default('America/Bogota'),
  diasMaxAnticipacion: z.number().int().min(7).max(60).default(30),
  minutosMinAnticipacion: z.number().int().min(0).max(1440).default(30),
  estadoInicialCita: z.enum([EstadoCita.PENDIENTE, EstadoCita.CONFIRMADA]).default(EstadoCita.PENDIENTE),
  politicaDatosUrl: z.string().trim().url('URL de política de datos inválida'),
  estado: z.enum([EstadoRegistro.ACTIVO, EstadoRegistro.INACTIVO]).default(EstadoRegistro.ACTIVO)
});

export const updateSedeSchema = createSedeSchema.partial();
