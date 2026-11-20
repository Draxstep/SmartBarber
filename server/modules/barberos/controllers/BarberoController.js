/**
 * @file BarberoController.js
 * @description Controlador HTTP para gestión de barberos, horarios, bloqueos y liquidaciones (CU-009 a CU-013).
 */
import { BarberoService } from '../services/BarberoService.js';
import { sendSuccess } from '../../../shared/utils/response.js';
import { ForbiddenError } from '../../../shared/errors/domainErrors.js';

export class BarberoController {
  constructor(barberoService = null) {
    this.barberoService = barberoService || new BarberoService();
  }

  list = async (req, res, next) => {
    try {
      const sedeId = req.query.sedeId || req.user?.sedeId;
      const activosSolo = req.query.activosSolo === 'true' || req.user?.rol === 'barbero';
      const barberos = await this.barberoService.listBarberos(sedeId, { activosSolo });
      return sendSuccess(res, barberos, 200);
    } catch (error) {
      next(error);
    }
  };

  getById = async (req, res, next) => {
    try {
      const barbero = await this.barberoService.getBarberoById(req.params.id);
      return sendSuccess(res, barbero, 200);
    } catch (error) {
      next(error);
    }
  };

  create = async (req, res, next) => {
    try {
      const sedeId = req.body.sedeId || req.user?.sedeId;
      const nuevo = await this.barberoService.createBarbero({
        ...req.body,
        sedeId
      });
      return sendSuccess(res, nuevo, 201);
    } catch (error) {
      next(error);
    }
  };

  update = async (req, res, next) => {
    try {
      const actualizado = await this.barberoService.updateBarbero(req.params.id, req.body);
      return sendSuccess(res, actualizado, 200);
    } catch (error) {
      next(error);
    }
  };

  desactivar = async (req, res, next) => {
    try {
      const resultado = await this.barberoService.desactivarBarbero(req.params.id);
      return sendSuccess(res, resultado, 200);
    } catch (error) {
      next(error);
    }
  };

  getHorarios = async (req, res, next) => {
    try {
      const horarios = await this.barberoService.getHorarios(req.params.id);
      return sendSuccess(res, horarios, 200);
    } catch (error) {
      next(error);
    }
  };

  configurarHorarios = async (req, res, next) => {
    try {
      const barberoId = req.params.id;
      // Verificación de scope: barbero solo puede configurar su propio horario o administrador
      if (req.user.rol === 'barbero' && req.user.barberoId !== barberoId) {
        throw new ForbiddenError('Solo puede configurar su propio horario.');
      }
      const resultado = await this.barberoService.configurarHorarios(barberoId, req.body.horarios);
      return sendSuccess(res, resultado, 200);
    } catch (error) {
      next(error);
    }
  };

  getBloqueos = async (req, res, next) => {
    try {
      const { fecha } = req.query;
      const bloqueos = await this.barberoService.getBloqueos(req.params.id, fecha);
      return sendSuccess(res, bloqueos, 200);
    } catch (error) {
      next(error);
    }
  };

  crearBloqueo = async (req, res, next) => {
    try {
      const barberoId = req.params.id || req.body.barberoId;
      if (req.user.rol === 'barbero' && req.user.barberoId !== barberoId) {
        throw new ForbiddenError('Solo puede crear bloqueos sobre su propia agenda.');
      }
      const sedeId = req.body.sedeId || req.user.sedeId;
      const nuevo = await this.barberoService.crearBloqueo(
        { ...req.body, barberoId, sedeId },
        req.user.id
      );
      return sendSuccess(res, nuevo, 201);
    } catch (error) {
      next(error);
    }
  };

  eliminarBloqueo = async (req, res, next) => {
    try {
      const resultado = await this.barberoService.eliminarBloqueo(req.params.bloqueoId);
      return sendSuccess(res, resultado, 200);
    } catch (error) {
      next(error);
    }
  };

  getLiquidacion = async (req, res, next) => {
    try {
      const sedeId = req.user.sedeId;
      const { fechaInicio, fechaFin, formato } = req.query;
      let barberoId = req.query.barberoId || null;

      // Restricción RBAC: Barbero solo puede consultar su propia liquidación ('P')
      if (req.user.rol === 'barbero') {
        barberoId = req.user.barberoId;
      }

      const resultado = await this.barberoService.getLiquidacion({
        sedeId,
        fechaInicio,
        fechaFin,
        barberoId,
        formato
      });

      if (resultado.isCsv) {
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename="liquidacion_comisiones.csv"');
        return res.status(200).send(resultado.data);
      }

      return sendSuccess(res, resultado.data, 200);
    } catch (error) {
      next(error);
    }
  };
}
