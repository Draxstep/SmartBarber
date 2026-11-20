/**
 * @file UsuarioService.js
 * @description Servicio de aplicación para administración de usuarios del Backoffice (CU-002).
 */
import bcrypt from 'bcryptjs';
import { Usuario } from '../domain/Usuario.js';
import { UsuarioPgRepository } from '../repositories/UsuarioPgRepository.js';
import {
  NotFoundError,
  UniqueConstraintViolationError,
  ValidationError
} from '../../../shared/errors/domainErrors.js';

export class UsuarioService {
  constructor(usuarioRepo = null) {
    this.usuarioRepo = usuarioRepo || new UsuarioPgRepository();
  }

  async listUsuarios(sedeId) {
    const usuarios = await this.usuarioRepo.findAll(sedeId);
    return usuarios.map((u) => ({
      usuarioId: u.usuarioId,
      sedeId: u.sedeId,
      correo: u.correo,
      rol: u.rol,
      estado: u.estado,
      intentosFallidos: u.intentosFallidos,
      bloqueadoHasta: u.bloqueadoHasta,
      ultimoAccesoEn: u.ultimoAccesoEn,
      creadoEn: u.creadoEn
    }));
  }

  async getUsuarioById(id) {
    const u = await this.usuarioRepo.findById(id);
    if (!u) {
      throw new NotFoundError('Usuario', id);
    }
    return {
      usuarioId: u.usuarioId,
      sedeId: u.sedeId,
      correo: u.correo,
      rol: u.rol,
      estado: u.estado,
      intentosFallidos: u.intentosFallidos,
      bloqueadoHasta: u.bloqueadoHasta,
      ultimoAccesoEn: u.ultimoAccesoEn,
      creadoEn: u.creadoEn
    };
  }

  async createUsuario({ sedeId, correo, contrasena, rol, estado }) {
    const existente = await this.usuarioRepo.findByCorreo(correo);
    if (existente) {
      throw new UniqueConstraintViolationError('correo', correo, `El correo '${correo}' ya está registrado.`);
    }

    if (!contrasena || contrasena.length < 8) {
      throw new ValidationError('La contraseña debe tener al menos 8 caracteres.');
    }

    const contrasenaHash = await bcrypt.hash(contrasena, 10);
    const nuevoUsuario = new Usuario({
      sedeId,
      correo: correo.toLowerCase().trim(),
      contrasenaHash,
      rol,
      estado: estado || 'activo'
    });

    const guardado = await this.usuarioRepo.save(nuevoUsuario);
    return {
      usuarioId: guardado.usuarioId,
      sedeId: guardado.sedeId,
      correo: guardado.correo,
      rol: guardado.rol,
      estado: guardado.estado,
      creadoEn: guardado.creadoEn
    };
  }

  async updateUsuario(id, { correo, rol, estado }) {
    const usuario = await this.usuarioRepo.findById(id);
    if (!usuario) {
      throw new NotFoundError('Usuario', id);
    }

    if (correo && correo.toLowerCase().trim() !== usuario.correo) {
      const existente = await this.usuarioRepo.findByCorreo(correo);
      if (existente && existente.usuarioId !== id) {
        throw new UniqueConstraintViolationError('correo', correo, `El correo '${correo}' ya está en uso.`);
      }
      usuario.correo = correo.toLowerCase().trim();
    }

    if (rol) usuario.rol = rol;
    if (estado) {
      usuario.estado = estado;
      if (estado === 'inactivo') {
        await this.usuarioRepo.revocarSesionesActivas(id);
      }
    }

    const actualizado = await this.usuarioRepo.save(usuario);
    return {
      usuarioId: actualizado.usuarioId,
      sedeId: actualizado.sedeId,
      correo: actualizado.correo,
      rol: actualizado.rol,
      estado: actualizado.estado
    };
  }
}
