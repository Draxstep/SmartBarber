/**
 * @file SedeService.js
 * @description Servicio de aplicación para configuración y parámetros de sede (CU-003).
 */
import { SedePgRepository } from '../repositories/SedePgRepository.js';
import { NotFoundError } from '../../../shared/errors/domainErrors.js';

export class SedeService {
  constructor(sedeRepo = null) {
    this.sedeRepo = sedeRepo || new SedePgRepository();
  }

  async getSedePrincipal() {
    const sede = await this.sedeRepo.findPrincipal();
    if (!sede) {
      throw new NotFoundError('Sede', 'principal');
    }
    return sede;
  }

  async getSedeById(id) {
    const sede = await this.sedeRepo.findById(id);
    if (!sede) {
      throw new NotFoundError('Sede', id);
    }
    return sede;
  }

  async updateSede(id, data) {
    const sede = await this.sedeRepo.findById(id);
    if (!sede) {
      throw new NotFoundError('Sede', id);
    }

    Object.assign(sede, data);
    return await this.sedeRepo.save(sede);
  }
}
