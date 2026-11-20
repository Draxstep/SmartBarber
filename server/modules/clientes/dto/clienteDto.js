/**
 * @file clienteDto.js
 * @description Esquemas de validación y DTOs para el módulo de Clientes.
 */
import { z } from 'zod';

export const createClienteSchema = z.object({
  sedeId: z.string().uuid('ID de sede inválido'),
  nombreCompleto: z.string().trim().min(3, 'El nombre debe tener al menos 3 caracteres').max(100),
  telefonoWhatsapp: z.string().trim().min(10, 'El teléfono debe contener al menos 10 dígitos').max(20),
  correo: z.string().trim().email('Correo electrónico del cliente inválido').max(150),
  aceptoPoliticaDatos: z.boolean().refine((val) => val === true, {
    message: 'Debe aceptar la política de tratamiento de datos personales (Ley 1581 de 2012)'
  })
});
