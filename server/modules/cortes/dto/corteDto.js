/**
 * @file corteDto.js
 * @description Esquemas de validación y DTOs para el módulo de Registro de Cortes (Caja).
 */
import { z } from 'zod';
import { OrigenCorte, MetodoPago, EstadoCorte } from '../../../../shared/contracts/enums.js';

export const createCorteSchema = z.object({
  sedeId: z.string().uuid('ID de sede inválido'),
  citaId: z.string().uuid().nullable().optional(),
  barberoId: z.string().uuid('ID de barbero inválido'),
  clienteId: z.string().uuid().nullable().optional(),
  nombreClienteReferencial: z.string().trim().max(100).nullable().optional(),
  origen: z.enum([OrigenCorte.CITA, OrigenCorte.WALK_IN]),
  fechaHoraAtencion: z.string().datetime().optional(),
  precioCalculadoCop: z.number().int().positive(),
  precioCobradoCop: z.number().int().nonnegative(),
  metodoPago: z.enum([
    MetodoPago.EFECTIVO,
    MetodoPago.TRANSFERENCIA_BANCARIA,
    MetodoPago.TARJETA_DEBITO_CREDITO,
    MetodoPago.NEQUI,
    MetodoPago.DAVIPLATA
  ]),
  porcentajeComisionSnapshot: z.number().min(0).max(100).default(0),
  comisionCalculadaCop: z.number().int().nonnegative().default(0),
  notas: z.string().trim().max(300).nullable().optional(),
  registradoPorUsuarioId: z.string().uuid('ID de usuario registrador inválido'),
  servicios: z.array(
    z.object({
      servicioId: z.string().uuid(),
      nombreServicioSnapshot: z.string().min(2),
      precioCopSnapshot: z.number().int().positive()
    })
  ).min(1, 'Debe incluir al menos un servicio en el corte')
}).refine(
  (data) => {
    // RN-15: Todo ajuste manual de precio exige nota justificativa (>= 5 chars)
    if (data.precioCobradoCop !== data.precioCalculadoCop) {
      return data.notas && data.notas.trim().length >= 5;
    }
    return true;
  },
  {
    message: 'Todo ajuste manual sobre el precio calculado requiere una nota explicativa de al menos 5 caracteres (RN-15)',
    path: ['notas']
  }
);

export const walkInSchema = z.object({
  barberoId: z.string().uuid('ID de barbero inválido').optional(), // Se autocompleta para barberos
  servicioIds: z.array(z.string().uuid()).min(1, 'Debe seleccionar al menos un servicio'),
  metodoPago: z.enum([
    MetodoPago.EFECTIVO,
    MetodoPago.TRANSFERENCIA_BANCARIA,
    MetodoPago.TARJETA_DEBITO_CREDITO,
    MetodoPago.NEQUI,
    MetodoPago.DAVIPLATA
  ]),
  precioCobradoCop: z.number().int().nonnegative().optional(), // Solo ajustable por admin
  nombreCliente: z.string().trim().max(100).nullable().optional(),
  notas: z.string().trim().max(300).nullable().optional()
});

export const convertirCitaSchema = z.object({
  servicioIds: z.array(z.string().uuid()).min(1, 'Debe incluir al menos un servicio').optional(),
  metodoPago: z.enum([
    MetodoPago.EFECTIVO,
    MetodoPago.TRANSFERENCIA_BANCARIA,
    MetodoPago.TARJETA_DEBITO_CREDITO,
    MetodoPago.NEQUI,
    MetodoPago.DAVIPLATA
  ]),
  precioCobradoCop: z.number().int().nonnegative().optional(), // Ajuste de precio
  notas: z.string().trim().max(300).nullable().optional()
});

export const anularCorteSchema = z.object({
  motivoAnulacion: z.string().trim().min(10, 'El motivo de anulación debe tener al menos 10 caracteres (RF-COR-05)').max(250),
  revertirEstadoCita: z.boolean().default(false)
});
