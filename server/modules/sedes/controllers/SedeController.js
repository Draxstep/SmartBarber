/**
 * @file SedeController.js
 * @description Controlador HTTP para gestión de sede y parámetros operativos (CU-003).
 */
import { SedeService } from '../services/SedeService.js';
import { sendSuccess } from '../../../shared/utils/response.js';

export class SedeController {
  constructor(sedeService = null) {
    this.sedeService = sedeService || new SedeService();
  }

  getPrincipal = async (req, res, next) => {
    try {
      const sede = await this.sedeService.getSedePrincipal();
      return sendSuccess(res, sede, 200);
    } catch (error) {
      next(error);
    }
  };

  getById = async (req, res, next) => {
    try {
      const sede = await this.sedeService.getSedeById(req.params.id);
      return sendSuccess(res, sede, 200);
    } catch (error) {
      next(error);
    }
  };

  update = async (req, res, next) => {
    try {
      const actualizada = await this.sedeService.updateSede(req.params.id, req.body);
      return sendSuccess(res, actualizada, 200);
    } catch (error) {
      next(error);
    }
  };
}
