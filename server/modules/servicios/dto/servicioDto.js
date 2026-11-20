/**
 * @file servicioDto.js
 * @description Esquemas de validación y DTOs para el catálogo de Servicios.
 */
import { z } from 'zod';
import { EstadoRegistro } from '../../../../shared/contracts/enums.js';

export const createServicioSchema = z.object({
  sedeId: z.string().uuid('ID de sede inválido'),
  nombre: z.string().trim().min(2, 'El nombre debe tener al menos 2 caracteres').max(80),
  descripcionBreve: z.string().trim().max(250).nullable().optional(),
  precioCop: z.number().int().positive('El precio debe ser un número entero mayor a 0 COP'),
  duracionBloques: z.number().int().min(1).max(6, 'La duración debe estar entre 1 y 6 bloques (30 a 180 min)'),
  visiblePublico: z.boolean().default(true),
  estado: z.enum([EstadoRegistro.ACTIVO, EstadoRegistro.INACTIVO]).default(EstadoRegistro.ACTIVO),
  ordenVisual: z.number().int().nonnegative().default(0)
});

export const updateServicioSchema = createServicioSchema.partial();
