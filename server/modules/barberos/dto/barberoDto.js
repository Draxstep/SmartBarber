/**
 * @file barberoDto.js
 * @description Esquemas de validación y DTOs para el módulo de Barberos.
 */
import { z } from 'zod';
import { EstadoRegistro } from '../../../../shared/contracts/enums.js';

export const createBarberoSchema = z.object({
  sedeId: z.string().uuid('ID de sede inválido'),
  usuarioId: z.string().uuid('ID de usuario inválido').nullable().optional(),
  nombreCompleto: z.string().trim().min(3, 'El nombre debe tener al menos 3 caracteres').max(120),
  nombrePublico: z.string().trim().max(80).nullable().optional(),
  telefono: z.string().trim().min(7, 'El teléfono debe tener al menos 7 caracteres').max(20),
  correo: z.string().trim().email('Correo electrónico inválido').max(150),
  fotoUrl: z.string().url().nullable().optional(),
  biografiaBreve: z.string().trim().max(200).nullable().optional(),
  porcentajeComision: z.number().min(0).max(100).nullable().optional(),
  estado: z.enum([EstadoRegistro.ACTIVO, EstadoRegistro.INACTIVO]).default(EstadoRegistro.ACTIVO)
});

export const updateBarberoSchema = createBarberoSchema.partial();

export const createBloqueoSchema = z.object({
  sedeId: z.string().uuid('ID de sede inválido').optional(),
  barberoId: z.string().uuid('ID de barbero inválido').optional(),
  fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato de fecha YYYY-MM-DD inválido'),
  diaCompleto: z.boolean().default(false),
  horaInicio: z.string().regex(/^\d{2}:(00|30)(:00)?$/, 'Hora de inicio debe ser múltiplo de 30 min (HH:MM)').nullable().optional(),
  horaFin: z.string().regex(/^\d{2}:(00|30)(:00)?$/, 'Hora de fin debe ser múltiplo de 30 min (HH:MM)').nullable().optional(),
  inicioEn: z.string().optional(),
  finEn: z.string().optional(),
  motivo: z.string().trim().min(3, 'El motivo debe tener al menos 3 caracteres').max(200),
  creadoPorUsuarioId: z.string().uuid('ID de usuario autor inválido').optional()
});
