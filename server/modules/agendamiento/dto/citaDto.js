/**
 * @file citaDto.js
 * @description Esquemas de validación y DTOs para el módulo de Agendamiento.
 */
import { z } from 'zod';
import { EstadoCita, OrigenCita } from '../../../../shared/contracts/enums.js';

export const createCitaSchema = z.object({
  sedeId: z.string().uuid('ID de sede inválido'),
  clienteId: z.string().uuid('ID de cliente inválido'),
  barberoId: z.string().uuid('ID de barbero inválido'),
  barberoAsignadoAutomaticamente: z.boolean().default(false),
  fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato de fecha YYYY-MM-DD inválido'),
  horaInicio: z.string().regex(/^\d{2}:(00|30):00$/, 'Hora de inicio debe ser múltiplo de 30 min (HH:MM:00)'),
  horaFin: z.string().regex(/^\d{2}:(00|30):00$/, 'Hora de fin debe ser múltiplo de 30 min (HH:MM:00)'),
  inicioEn: z.string().datetime(),
  finEn: z.string().datetime(),
  bloquesTotales: z.number().int().min(1),
  precioEstimadoCop: z.number().int().positive(),
  notasCliente: z.string().trim().max(200).nullable().optional(),
  origen: z.enum([OrigenCita.LANDING, OrigenCita.BACKOFFICE]).default(OrigenCita.LANDING),
  creadoPorUsuarioId: z.string().uuid().nullable().optional(),
  servicios: z.array(
    z.object({
      servicioId: z.string().uuid(),
      nombreServicioSnapshot: z.string().min(2),
      precioCopSnapshot: z.number().int().positive(),
      duracionBloquesSnapshot: z.number().int().min(1).max(6)
    })
  ).min(1, 'Debe incluir al menos un servicio en la cita')
});

export const reservaPublicaSchema = z.object({
  sedeId: z.string().uuid('ID de sede inválido').optional(),
  servicioIds: z.array(z.string().uuid()).min(1, 'Debe seleccionar al menos un servicio'),
  barberoId: z.string().uuid('ID de barbero inválido').nullable().optional(), // null o ausente = "Cualquier barbero"
  fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato de fecha YYYY-MM-DD inválido'),
  horaInicio: z.string().regex(/^\d{2}:(00|30)(:00)?$/, 'Hora de inicio debe ser :00 o :30'),
  cliente: z.object({
    nombreCompleto: z.string().trim().min(3, 'El nombre debe tener al menos 3 caracteres').max(100),
    telefono: z.string().trim().min(7, 'El teléfono debe tener al menos 7 dígitos').max(20),
    correo: z.string().trim().email('Correo electrónico inválido').max(150),
    aceptoPoliticaDatos: z.literal(true, {
      errorMap: () => ({ message: 'Debe aceptar la política de tratamiento de datos personales' })
    })
  }),
  notasCliente: z.string().trim().max(200).nullable().optional(),
  // Honeypot anti-bots invisible: si viene diligenciado, la petición es rechazada silenciosamente (RNF-11)
  _hp: z.string().max(0, 'Acceso no autorizado').optional()
});

export const createCitaManualSchema = z.object({
  sedeId: z.string().uuid('ID de sede inválido').optional(),
  servicioIds: z.array(z.string().uuid()).min(1, 'Debe seleccionar al menos un servicio'),
  barberoId: z.string().uuid('ID de barbero obligatorio'),
  fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato de fecha YYYY-MM-DD inválido'),
  horaInicio: z.string().regex(/^\d{2}:(00|30)(:00)?$/, 'Hora de inicio debe ser :00 o :30'),
  cliente: z.object({
    nombreCompleto: z.string().trim().min(3).max(100),
    telefono: z.string().trim().min(7).max(20),
    correo: z.string().trim().email().max(150).optional()
  }),
  notasCliente: z.string().trim().max(200).nullable().optional()
});

export const cambiarEstadoCitaSchema = z.object({
  nuevoEstado: z.enum([
    EstadoCita.PENDIENTE,
    EstadoCita.CONFIRMADA,
    EstadoCita.COMPLETADA,
    EstadoCita.CANCELADA,
    EstadoCita.NO_ASISTIO
  ]),
  observacion: z.string().trim().max(250).nullable().optional(),
  motivoCancelacion: z.string().trim().max(250).nullable().optional()
});

export const consultaDisponibilidadSchema = z.object({
  fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato de fecha YYYY-MM-DD inválido'),
  duracionBloques: z.coerce.number().int().min(1).max(12).optional(),
  servicioIds: z.string().optional(), // separados por comas
  barberoId: z.string().trim().optional().transform((val) => {
    if (!val || val === 'any' || val === 'cualquiera') return undefined;
    return val;
  }).pipe(z.string().uuid().optional()),
  sedeId: z.string().trim().optional().transform((val) => {
    if (!val || val === 'null' || val === 'undefined') return undefined;
    return val;
  }).pipe(z.string().uuid().optional())
});
