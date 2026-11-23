/**
 * @file CitaController.js
 * @description Controlador HTTP para gestión de citas y agenda en el Backoffice (CU-022, CU-023, CU-024).
 */
import { CitaService } from '../services/CitaService.js';
import { CitaPgRepository } from '../repositories/CitaPgRepository.js';
import { sendSuccess } from '../../../shared/utils/response.js';
import { NotFoundError } from '../../../shared/errors/domainErrors.js';

export class CitaController {
  constructor(citaService = null, citaRepo = null) {
    this.citaService = citaService || new CitaService();
    this.citaRepo = citaRepo || new CitaPgRepository();
  }

  getAgenda = async (req, res, next) => {
    try {
      const sedeId = req.query.sedeId || req.user.sedeId;
      const nowBogota = new Date(Date.now() - 5 * 60 * 60 * 1000);
      const fecha = req.query.fecha || nowBogota.toISOString().slice(0, 10);
      const barberoId = req.query.barberoId || null;

      const agenda = await this.citaService.getAgenda({
        sedeId,
        fecha,
        barberoId,
        user: req.user
      });
      return sendSuccess(res, agenda, 200);
    } catch (error) {
      next(error);
    }
  };

  getById = async (req, res, next) => {
    try {
      const cita = await this.citaRepo.findById(req.params.id);
      if (!cita) {
        throw new NotFoundError('Cita', req.params.id);
      }
      return sendSuccess(res, cita, 200);
    } catch (error) {
      next(error);
    }
  };

  crearManual = async (req, res, next) => {
    try {
      const sedeId = req.body.sedeId || req.user.sedeId;
      const cita = await this.citaService.crearCitaManual(
        { ...req.body, sedeId },
        req.user.id
      );
      return sendSuccess(res, cita, 201);
    } catch (error) {
      next(error);
    }
  };

  cambiarEstado = async (req, res, next) => {
    try {
      const citaActualizada = await this.citaService.cambiarEstado(
        req.params.id,
        req.body,
        req.user
      );
      return sendSuccess(res, citaActualizada, 200);
    } catch (error) {
      next(error);
    }
  };
}
