/**
 * @file PublicLandingController.js
 * @description Controlador público consolidado para la Landing Page (CU-020, RF-AGE-01, RNF-01).
 */
import { SedePgRepository } from '../repositories/SedePgRepository.js';
import { ServicioPgRepository } from '../../servicios/repositories/ServicioPgRepository.js';
import { BarberoPgRepository } from '../../barberos/repositories/BarberoPgRepository.js';
import { sendSuccess } from '../../../shared/utils/response.js';

export class PublicLandingController {
  constructor(sedeRepo = null, servicioRepo = null, barberoRepo = null) {
    this.sedeRepo = sedeRepo || new SedePgRepository();
    this.servicioRepo = servicioRepo || new ServicioPgRepository();
    this.barberoRepo = barberoRepo || new BarberoPgRepository();
  }

  /**
   * Retorna toda la información comercial pública necesaria para renderizar la Landing Page.
   * Sin autenticación, optimizado para Mobile-First (RNF-01, RNF-05).
   */
  getLandingInfo = async (req, res, next) => {
    try {
      const sede = await this.sedeRepo.findPrincipal();
      if (!sede) {
        return res.status(404).json({ success: false, message: 'Información de la sede no disponible.' });
      }

      // Consultar en paralelo servicios activos y visibles, y barberos activos
      const [servicios, barberos] = await Promise.all([
        this.servicioRepo.findBySede(sede.sedeId, { activosSolo: true, visiblePublicoSolo: true }),
        this.barberoRepo.findBySede(sede.sedeId, { activosSolo: true })
      ]);

      const data = {
        negocio: {
          sedeId: sede.sedeId,
          nombreComercial: sede.nombreComercial,
          eslogan: sede.eslogan,
          logoUrl: sede.logoUrl,
          direccionFisica: sede.direccionFisica,
          enlaceMapaUrl: sede.enlaceMapaUrl,
          telefonoContacto: sede.telefonoContacto,
          correoContacto: sede.correoContacto,
          horarioGeneralTexto: sede.horarioGeneralTexto,
          politicaDatosUrl: sede.politicaDatosUrl,
          parametrosReserva: {
            diasMaxAnticipacion: sede.diasMaxAnticipacion,
            minutosMinAnticipacion: sede.minutosMinAnticipacion
          }
        },
        servicios: servicios.map((s) => ({
          servicioId: s.servicioId,
          nombre: s.nombre,
          descripcion: s.descripcionBreve,
          precioCop: s.precioCop,
          duracionBloques: s.duracionBloques,
          duracionMinutos: s.duracionBloques * 30,
          ordenVisual: s.ordenVisual
        })),
        barberos: barberos.map((b) => ({
          barberoId: b.barberoId,
          nombrePublico: b.nombrePublico || b.nombreCompleto,
          fotoUrl: b.fotoUrl,
          biografiaBreve: b.biografiaBreve
        }))
      };

      return sendSuccess(res, data, 200);
    } catch (error) {
      next(error);
    }
  };
}
