/**
 * @file ServicioService.js
 * @description Servicio de aplicación para gestión del catálogo de servicios (CU-014, CU-015).
 */
import { Servicio } from '../domain/Servicio.js';
import { ServicioPgRepository } from '../repositories/ServicioPgRepository.js';
import { NotFoundError, ValidationError } from '../../../shared/errors/domainErrors.js';

export class ServicioService {
  constructor(servicioRepo = null) {
    this.servicioRepo = servicioRepo || new ServicioPgRepository();
  }

  async listServicios(sedeId, { activosSolo = false, visiblePublicoSolo = false } = {}) {
    return await this.servicioRepo.findBySede(sedeId, { activosSolo, visiblePublicoSolo });
  }

  async getServicioById(id) {
    const servicio = await this.servicioRepo.findById(id);
    if (!servicio) {
      throw new NotFoundError('Servicio', id);
    }
    return servicio;
  }

  async createServicio(data) {
    if (data.duracionBloques < 1 || data.duracionBloques > 6) {
      throw new ValidationError('La duración debe estar entre 1 y 6 bloques de 30 minutos (30 a 180 min).');
    }

    if (data.precioCop <= 0) {
      throw new ValidationError('El precio del servicio debe ser un número entero mayor a 0 COP.');
    }

    const nuevoServicio = new Servicio(data);
    return await this.servicioRepo.save(nuevoServicio);
  }

  async updateServicio(id, data) {
    const servicio = await this.servicioRepo.findById(id);
    if (!servicio) {
      throw new NotFoundError('Servicio', id);
    }

    if (data.duracionBloques !== undefined && (data.duracionBloques < 1 || data.duracionBloques > 6)) {
      throw new ValidationError('La duración debe estar entre 1 y 6 bloques de 30 minutos.');
    }

    if (data.precioCop !== undefined && data.precioCop <= 0) {
      throw new ValidationError('El precio debe ser mayor a 0 COP.');
    }

    Object.assign(servicio, data);
    return await this.servicioRepo.save(servicio);
  }

  async toggleEstado(id, nuevoEstado) {
    const servicio = await this.servicioRepo.findById(id);
    if (!servicio) {
      throw new NotFoundError('Servicio', id);
    }

    servicio.estado = nuevoEstado;
    return await this.servicioRepo.save(servicio);
  }
}
