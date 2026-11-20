/**
 * @file publicAgendamientoRoutes.js
 * @description Rutas HTTP públicas sin autenticación para Landing Page y Reservas (CU-020, CU-021, CU-025).
 */
import { Router } from 'express';
import { PublicLandingController } from '../../sedes/controllers/PublicLandingController.js';
import { PublicAgendamientoController } from '../controllers/PublicAgendamientoController.js';
import { bookingRateLimiter } from '../../../shared/middlewares/rateLimiter.js';
import { validate } from '../../../shared/middlewares/validate.js';
import { reservaPublicaSchema, consultaDisponibilidadSchema } from '../dto/citaDto.js';

export const publicAgendamientoRouter = Router();

const landingController = new PublicLandingController();
const agendamientoController = new PublicAgendamientoController();

// 1. Información pública del negocio, catálogo y barberos (CU-020, RNF-01)
publicAgendamientoRouter.get('/info', landingController.getLandingInfo);
publicAgendamientoRouter.get('/landing', landingController.getLandingInfo);

// 2. Consulta en vivo de bloques de horarios disponibles (CU-025, RNF-02)
publicAgendamientoRouter.get(
  '/disponibilidad',
  validate({ query: consultaDisponibilidadSchema }),
  agendamientoController.consultarDisponibilidad
);

// 3. Confirmación de reserva pública protegida contra spam/bots (CU-021, RNF-11)
publicAgendamientoRouter.post(
  '/reservar',
  bookingRateLimiter,
  validate({ body: reservaPublicaSchema }),
  agendamientoController.crearReserva
);
publicAgendamientoRouter.post(
  '/citas',
  bookingRateLimiter,
  validate({ body: reservaPublicaSchema }),
  agendamientoController.crearReserva
);

// 4. Consulta de estado de cita por código único de reserva (SB-XXXXXX)
publicAgendamientoRouter.get(
  '/reservas/:codigo',
  agendamientoController.consultarPorCodigo
);

// 5. Cancelación pública con antelación mínima >= 2h (CU-021, RF-AGE-06)
publicAgendamientoRouter.patch(
  '/reservas/:codigo/cancelar',
  agendamientoController.cancelarReserva
);
