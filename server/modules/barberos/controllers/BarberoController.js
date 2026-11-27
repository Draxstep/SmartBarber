/**
 * @file BarberoController.js
 * @description Controlador HTTP para gestión de barberos, horarios, bloqueos y liquidaciones (CU-009 a CU-013).
 */
import { BarberoService } from '../services/BarberoService.js';
import { sendSuccess } from '../../../shared/utils/response.js';
import { ForbiddenError } from '../../../shared/errors/domainErrors.js';
import { normalizeBogotaDateRange } from '../../../shared/utils/dateRange.js';

export class BarberoController {
  constructor(barberoService = null) {
    this.barberoService = barberoService || new BarberoService();
  }

  list = async (req, res, next) => {
    try {
      const sedeId = req.query.sedeId || req.user?.sedeId;
      const isBarbero = req.user?.rol === 'barbero';
      const activosSolo = req.query.activosSolo === 'true' || isBarbero;
      const barberos = await this.barberoService.listBarberos(sedeId, { activosSolo });

      if (isBarbero) {
        const redacted = barberos.map((b) => ({
          barberoId: b.barberoId || b.id,
          id: b.barberoId || b.id,
          sedeId: b.sedeId,
          nombreCompleto: b.nombreCompleto,
          nombrePublico: b.nombrePublico,
          sillon: b.sillon,
          fotoUrl: b.fotoUrl,
          biografiaBreve: b.biografiaBreve,
          estado: b.estado
        }));
        return sendSuccess(res, redacted, 200);
      }

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

  activar = async (req, res, next) => {
    try {
      const resultado = await this.barberoService.activarBarbero(req.params.id);
      return sendSuccess(res, resultado, 200);
    } catch (error) {
      next(error);
    }
  };

  getCitasFuturas = async (req, res, next) => {
    try {
      const citas = await this.barberoService.getCitasFuturas(req.params.id);
      return sendSuccess(res, citas, 200);
    } catch (error) {
      next(error);
    }
  };

  getMiPerfil = async (req, res, next) => {
    try {
      const barberoId = req.user.barberoId;
      if (!barberoId) {
        return sendSuccess(res, {
          usuario: req.user,
          barbero: null,
          horarios: []
        }, 200);
      }
      const [barbero, horarios] = await Promise.all([
        this.barberoService.getBarberoById(barberoId),
        this.barberoService.getHorarios(barberoId)
      ]);
      return sendSuccess(res, {
        usuario: req.user,
        barbero,
        horarios
      }, 200);
    } catch (error) {
      next(error);
    }
  };

  updateMiPerfil = async (req, res, next) => {
    try {
      const barberoId = req.user.barberoId;
      if (!barberoId) {
        throw new ForbiddenError('No tiene un perfil de barbero asociado a su usuario.');
      }
      const actualizado = await this.barberoService.updateMiPerfil(barberoId, req.body);
      return sendSuccess(res, actualizado, 200);
    } catch (error) {
      next(error);
    }
  };

  uploadFoto = async (req, res, next) => {
    try {
      const resultado = await this.barberoService.guardarFoto(req.body.imagenBase64);
      return sendSuccess(res, resultado, 201);
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
      const horarios = req.body.horarios || req.body.franjas || [];
      const resultado = await this.barberoService.configurarHorarios(barberoId, horarios);
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
      const barberoId = req.params.id;
      if (req.user?.rol === 'barbero' && req.user.barberoId !== barberoId) {
        throw new ForbiddenError('Solo puede eliminar bloqueos sobre su propia agenda.');
      }
      const resultado = await this.barberoService.eliminarBloqueo(req.params.bloqueoId);
      return sendSuccess(res, resultado, 200);
    } catch (error) {
      next(error);
    }
  };

  getLiquidacion = async (req, res, next) => {
    try {
      const sedeId = req.user.sedeId;
      const { formato } = req.query;
      const { fechaInicio, fechaFin } = normalizeBogotaDateRange(req.query.fechaInicio, req.query.fechaFin);
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
