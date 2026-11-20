/**
 * @file seguridadDto.js
 * @description Esquemas de validación y DTOs para el módulo de Seguridad.
 */
import { z } from 'zod';
import { RolUsuario, EstadoRegistro } from '../../../../shared/contracts/enums.js';

export const loginSchema = z.object({
  correo: z.string().trim().email('Correo de acceso inválido').max(150),
  contrasena: z.string().min(8, 'La contraseña debe contener al menos 8 caracteres')
});

export const createUsuarioSchema = z.object({
  sedeId: z.string().uuid('ID de sede inválido'),
  correo: z.string().trim().email('Correo electrónico inválido').max(150),
  contrasena: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres'),
  rol: z.enum([RolUsuario.ADMINISTRADOR, RolUsuario.BARBERO]),
  estado: z.enum([EstadoRegistro.ACTIVO, EstadoRegistro.INACTIVO]).default(EstadoRegistro.ACTIVO)
});
