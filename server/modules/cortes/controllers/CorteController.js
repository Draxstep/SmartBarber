/**
 * @file CorteController.js
 * @description Controlador HTTP para gestión de cortes y caja (CU-004 a CU-008).
 */
import { CorteService } from '../services/CorteService.js';
import { sendSuccess } from '../../../shared/utils/response.js';

export class CorteController {
  constructor(corteService = null) {
    this.corteService = corteService || new CorteService();
  }

  registrarWalkIn = async (req, res, next) => {
    try {
      const nuevoCorte = await this.corteService.registrarWalkIn(req.body, req.user);
      return sendSuccess(res, nuevoCorte, 201);
    } catch (error) {
      next(error);
    }
  };

  convertirCita = async (req, res, next) => {
    try {
      const corte = await this.corteService.convertirCitaACorte(
        req.params.citaId,
        req.body,
        req.user
      );
      return sendSuccess(res, corte, 201);
    } catch (error) {
      next(error);
    }
  };

  getHistorial = async (req, res, next) => {
    try {
      const sedeId = req.user.sedeId;
      const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Bogota' }).format(new Date());
      
      const rawInicio = req.query.fechaInicio?.trim();
      const rawFin = req.query.fechaFin?.trim();

      const fechaInicio = !rawInicio
        ? `${today}T00:00:00.000-05:00`
        : /^\d{4}-\d{2}-\d{2}$/.test(rawInicio)
          ? `${rawInicio}T00:00:00.000-05:00`
          : rawInicio;

      const fechaFin = !rawFin
        ? `${today}T23:59:59.999-05:00`
        : /^\d{4}-\d{2}-\d{2}$/.test(rawFin)
          ? `${rawFin}T23:59:59.999-05:00`
          : rawFin;

      const barberoId = req.query.barberoId || null;
      const estado = req.query.estado || null;

      const historial = await this.corteService.getHistorial(
        { sedeId, fechaInicio, fechaFin, barberoId, estado },
        req.user
      );
      return sendSuccess(res, historial, 200);
    } catch (error) {
      next(error);
    }
  };

  getResumenIngresos = async (req, res, next) => {
    try {
      const sedeId = req.user.sedeId;
      const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Bogota' }).format(new Date());

      const rawInicio = req.query.fechaInicio?.trim();
      const rawFin = req.query.fechaFin?.trim();

      const fechaInicio = !rawInicio
        ? `${today}T00:00:00.000-05:00`
        : /^\d{4}-\d{2}-\d{2}$/.test(rawInicio)
          ? `${rawInicio}T00:00:00.000-05:00`
          : rawInicio;

      const fechaFin = !rawFin
        ? `${today}T23:59:59.999-05:00`
        : /^\d{4}-\d{2}-\d{2}$/.test(rawFin)
          ? `${rawFin}T23:59:59.999-05:00`
          : rawFin;

      const barberoId = req.query.barberoId || null;

      const resumen = await this.corteService.getResumenIngresos(
        { sedeId, fechaInicio, fechaFin, barberoId },
        req.user
      );
      return sendSuccess(res, resumen, 200);
    } catch (error) {
      next(error);
    }
  };

  anularCorte = async (req, res, next) => {
    try {
      const { motivoAnulacion, revertirEstadoCita } = req.body;
      const resultado = await this.corteService.anularCorte(
        req.params.id,
        { motivoAnulacion, revertirEstadoCita },
        req.user
      );
      return sendSuccess(res, resultado, 200);
    } catch (error) {
      next(error);
    }
  };

  getDashboardKpis = async (req, res, next) => {
    try {
      const sedeId = req.user.sedeId;
      const { fecha } = req.query;
      const kpis = await this.corteService.getDashboardKpis({ sedeId, fecha }, req.user);
      return sendSuccess(res, kpis, 200);
    } catch (error) {
      next(error);
    }
  };
}
