/**
 * @file UsuarioController.js
 * @description Controlador HTTP para gestión de usuarios del Backoffice (CU-002).
 */
import { UsuarioService } from '../services/UsuarioService.js';
import { sendSuccess } from '../../../shared/utils/response.js';

export class UsuarioController {
  constructor(usuarioService = null) {
    this.usuarioService = usuarioService || new UsuarioService();
  }

  list = async (req, res, next) => {
    try {
      const sedeId = req.user.sedeId;
      const usuarios = await this.usuarioService.listUsuarios(sedeId);
      return sendSuccess(res, usuarios, 200);
    } catch (error) {
      next(error);
    }
  };

  getById = async (req, res, next) => {
    try {
      const usuario = await this.usuarioService.getUsuarioById(req.params.id);
      return sendSuccess(res, usuario, 200);
    } catch (error) {
      next(error);
    }
  };

  create = async (req, res, next) => {
    try {
      const sedeId = req.body.sedeId || req.user.sedeId;
      const nuevo = await this.usuarioService.createUsuario({
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
      const actualizado = await this.usuarioService.updateUsuario(req.params.id, req.body);
      return sendSuccess(res, actualizado, 200);
    } catch (error) {
      next(error);
    }
  };
}
