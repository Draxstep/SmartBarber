/**
 * @file ServicioController.js
 * @description Controlador HTTP para catálogo de servicios (CU-014, CU-015).
 */
import { ServicioService } from '../services/ServicioService.js';
import { sendSuccess } from '../../../shared/utils/response.js';

export class ServicioController {
  constructor(servicioService = null) {
    this.servicioService = servicioService || new ServicioService();
  }

  list = async (req, res, next) => {
    try {
      const sedeId = req.query.sedeId || req.user?.sedeId;
      const activosSolo = req.query.activosSolo === 'true' || req.user?.rol === 'barbero';
      const visiblePublicoSolo = req.query.visiblePublicoSolo === 'true';

      const servicios = await this.servicioService.listServicios(sedeId, {
        activosSolo,
        visiblePublicoSolo
      });
      return sendSuccess(res, servicios, 200);
    } catch (error) {
      next(error);
    }
  };

  getById = async (req, res, next) => {
    try {
      const servicio = await this.servicioService.getServicioById(req.params.id);
      return sendSuccess(res, servicio, 200);
    } catch (error) {
      next(error);
    }
  };

  create = async (req, res, next) => {
    try {
      const sedeId = req.body.sedeId || req.user?.sedeId;
      const nuevo = await this.servicioService.createServicio({
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
      const actualizado = await this.servicioService.updateServicio(req.params.id, req.body);
      return sendSuccess(res, actualizado, 200);
    } catch (error) {
      next(error);
    }
  };

  toggleEstado = async (req, res, next) => {
    try {
      const { estado } = req.body;
      const actualizado = await this.servicioService.toggleEstado(req.params.id, estado);
      return sendSuccess(res, actualizado, 200);
    } catch (error) {
      next(error);
    }
  };
}
