/**
 * @file barberoDto.js
 * @description Esquemas de validación y DTOs para el módulo de Barberos.
 */
import { z } from 'zod';
import { EstadoRegistro } from '../../../../shared/contracts/enums.js';

export const fotoUrlSchema = z.string().trim().max(1000000).refine((val) => {
  if (!val) return true;
  return (
    /^https?:\/\//i.test(val) ||
    val.startsWith('/uploads/') ||
    val.startsWith('data:image/')
  );
}, { message: 'Formato de imagen o URL no válido' }).nullable().optional();

export const uploadFotoSchema = z.object({
  imagenBase64: z.string().min(1, 'La imagen en base64 es requerida')
});

export const createBarberoSchema = z.object({
  sedeId: z.string().uuid('ID de sede inválido'),
  usuarioId: z.string().uuid('ID de usuario inválido').nullable().optional(),
  nombreCompleto: z.string().trim().min(3, 'El nombre debe tener al menos 3 caracteres').max(120),
  nombrePublico: z.string().trim().max(80).nullable().optional(),
  telefono: z.string().trim().min(7, 'El teléfono debe tener al menos 7 caracteres').max(20),
  correo: z.string().trim().email('Correo electrónico inválido').max(150),
  fotoUrl: fotoUrlSchema,
  biografiaBreve: z.string().trim().max(200).nullable().optional(),
  porcentajeComision: z.number().min(0).max(100).nullable().optional(),
  estado: z.enum([EstadoRegistro.ACTIVO, EstadoRegistro.INACTIVO]).default(EstadoRegistro.ACTIVO),
  crearUsuario: z.boolean().optional().default(false),
  contrasenaInicial: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres').optional()
});

export const updateBarberoSchema = createBarberoSchema.partial();

export const updateMiPerfilSchema = z.object({
  nombrePublico: z.string().trim().max(80).nullable().optional(),
  telefono: z.string().trim().min(7, 'El teléfono debe tener al menos 7 caracteres').max(20).optional(),
  fotoUrl: fotoUrlSchema,
  biografiaBreve: z.string().trim().max(200).nullable().optional()
});

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
