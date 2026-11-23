/**
 * @file InventarioController.js
 * @description Controlador HTTP para inventario, kardex y movimientos (CU-016 a CU-019).
 */
import { InventarioService } from '../services/InventarioService.js';
import { sendSuccess } from '../../../shared/utils/response.js';

export class InventarioController {
  constructor(inventarioService = null) {
    this.inventarioService = inventarioService || new InventarioService();
  }

  list = async (req, res, next) => {
    try {
      const sedeId = req.user.sedeId;
      const { categoria } = req.query;
      const activosSolo = req.user.rol === 'barbero' ? true : req.query.activosSolo !== 'false';

      const productos = await this.inventarioService.listProductos(sedeId, { categoria, activosSolo });
      return sendSuccess(res, productos, 200);
    } catch (error) {
      next(error);
    }
  };

  getById = async (req, res, next) => {
    try {
      const producto = await this.inventarioService.getProductoById(req.params.id);
      return sendSuccess(res, producto, 200);
    } catch (error) {
      next(error);
    }
  };

  getAlertas = async (req, res, next) => {
    try {
      const sedeId = req.user.sedeId;
      const alertas = await this.inventarioService.getAlertasStock(sedeId);
      return sendSuccess(res, alertas, 200);
    } catch (error) {
      next(error);
    }
  };

  create = async (req, res, next) => {
    try {
      const nuevo = await this.inventarioService.createProducto(req.body, req.user);
      return sendSuccess(res, nuevo, 201);
    } catch (error) {
      next(error);
    }
  };

  update = async (req, res, next) => {
    try {
      const actualizado = await this.inventarioService.updateProducto(req.params.id, req.body, req.user);
      return sendSuccess(res, actualizado, 200);
    } catch (error) {
      next(error);
    }
  };

  registrarEntrada = async (req, res, next) => {
    try {
      const resultado = await this.inventarioService.registrarEntrada(
        req.params.id,
        req.body,
        req.user
      );
      return sendSuccess(res, resultado, 201);
    } catch (error) {
      next(error);
    }
  };

  registrarSalida = async (req, res, next) => {
    try {
      const resultado = await this.inventarioService.registrarSalida(
        req.params.id,
        req.body,
        req.user
      );
      return sendSuccess(res, resultado, 201);
    } catch (error) {
      next(error);
    }
  };

  getKardex = async (req, res, next) => {
    try {
      const kardex = await this.inventarioService.getKardex(req.params.id);
      return sendSuccess(res, kardex, 200);
    } catch (error) {
      next(error);
    }
  };

  getMovimientos = async (req, res, next) => {
    try {
      const movimientos = await this.inventarioService.getMovimientos(req.query, req.user);
      return sendSuccess(res, movimientos, 200);
    } catch (error) {
      next(error);
    }
  };
}
