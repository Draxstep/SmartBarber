/**
 * @file PublicAgendamientoController.js
 * @description Controlador público para disponibilidad y reservas de la Landing Page (CU-020, CU-021, CU-025).
 */
import { DisponibilidadService } from '../services/DisponibilidadService.js';
import { CitaService } from '../services/CitaService.js';
import { CitaPgRepository } from '../repositories/CitaPgRepository.js';
import { ServicioPgRepository } from '../../servicios/repositories/ServicioPgRepository.js';
import { sendSuccess } from '../../../shared/utils/response.js';
import { NotFoundError } from '../../../shared/errors/domainErrors.js';

export class PublicAgendamientoController {
  constructor(
    disponibilidadService = null,
    citaService = null,
    citaRepo = null,
    servicioRepo = null
  ) {
    this.disponibilidadService = disponibilidadService || new DisponibilidadService();
    this.citaService = citaService || new CitaService();
    this.citaRepo = citaRepo || new CitaPgRepository();
    this.servicioRepo = servicioRepo || new ServicioPgRepository();
  }

  /**
   * Consulta en tiempo real los bloques de inicio disponibles para una fecha (CU-025, RF-AGE-04).
   */
  consultarDisponibilidad = async (req, res, next) => {
    try {
      const { fecha, barberoId, sedeId, duracionBloques, servicioIds } = req.query;

      let bloques = Math.max(1, Number(duracionBloques) || 1);
      if (servicioIds && typeof servicioIds === 'string' && servicioIds.trim().length > 0) {
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        const ids = servicioIds.split(',').map((id) => id.trim()).filter((id) => uuidRegex.test(id));
        if (ids.length > 0) {
          const servs = await this.servicioRepo.findByIds(ids);
          if (servs.length > 0) {
            bloques = servs.reduce((acc, s) => acc + s.duracionBloques, 0);
          }
        }
      }

      const resultado = await this.disponibilidadService.calcularDisponibilidad({
        sedeId: sedeId || null,
        fecha,
        duracionBloques: bloques,
        barberoId: barberoId || null
      });

      return sendSuccess(res, resultado, 200);
    } catch (error) {
      next(error);
    }
  };

  /**
   * Confirma la reserva de cita en línea (CU-021, RF-AGE-06).
   */
  crearReserva = async (req, res, next) => {
    try {
      const resultado = await this.citaService.crearReservaPublica(req.body);
      return sendSuccess(res, resultado, 201);
    } catch (error) {
      next(error);
    }
  };

  /**
   * Consulta el estado y detalle de una cita mediante su código de reserva único (RF-AGE-06).
   */
  consultarPorCodigo = async (req, res, next) => {
    try {
      const { codigo } = req.params;
      const cita = await this.citaRepo.findByCodigo(codigo.toUpperCase().trim());
      if (!cita) {
        throw new NotFoundError('Reserva con código', codigo);
      }

      // No exponer IDs internos ni datos privados
      return sendSuccess(
        res,
        {
          codigoReserva: cita.codigoReserva,
          fecha: cita.fecha,
          horaInicio: cita.horaInicio?.slice(0, 5),
          horaFin: cita.horaFin?.slice(0, 5),
          estado: cita.estado,
          precioEstimadoCop: cita.precioEstimadoCop,
          servicios: cita.servicios
        },
        200
      );
    } catch (error) {
      next(error);
    }
  };

  /**
   * Cancelación en línea por parte del cliente con código único (RF-AGE-06).
   */
  cancelarReserva = async (req, res, next) => {
    try {
      const { codigo } = req.params;
      const { motivo } = req.body || {};
      const resultado = await this.citaService.cancelarReservaPublica(codigo, motivo);
      return sendSuccess(res, resultado, 200);
    } catch (error) {
      next(error);
    }
  };
}
