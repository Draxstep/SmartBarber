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

export const cambiarEstadoCitaSchema = z.object({
  nuevoEstado: z.enum([
    EstadoCita.PENDIENTE,
    EstadoCita.CONFIRMADA,
    EstadoCita.COMPLETADA,
    EstadoCita.CANCELADA,
    EstadoCita.NO_ASISTIO
  ]),
  observacion: z.string().trim().max(250).nullable().optional(),
  motivoCancelacion: z.string().trim().max(250).nullable().optional(),
  cambiadoPorUsuarioId: z.string().uuid().nullable().optional()
});
