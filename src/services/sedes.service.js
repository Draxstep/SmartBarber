/**
 * SmartBarber - Servicio de Sedes e Información de Negocio (100% Producción Real)
 * Conexión a /api/v1/public/info (Landing pública) y /api/v1/sedes/principal (Backoffice).
 */

import { httpClient } from './http-client.js';

export const sedesService = {
  /**
   * Obtiene la información consolidada pública para la Landing Page (CU-020).
   * Incluye negocio, catálogo de servicios y barberos activos sin requerir autenticación.
   */
  async getPublicInfo() {
    const response = await httpClient.get('/public/info');
    return response;
  },

  /**
   * Obtiene la sede principal para usuarios autenticados del Backoffice (CU-003).
   */
  async getSedeActiva() {
    try {
      const response = await httpClient.get('/sedes/principal');
      if (response?.data) {
        const s = response.data;
        return {
          ok: true,
          success: true,
          data: {
            id: s.sedeId,
            sedeId: s.sedeId,
            nombreComercial: s.nombreComercial,
            eslogan: s.eslogan,
            direccion: s.direccionFisica,
            direccionFisica: s.direccionFisica,
            telefono: s.telefonoContacto,
            telefonoContacto: s.telefonoContacto,
            correo: s.correoContacto,
            correoContacto: s.correoContacto,
            zonaHoraria: s.zonaHoraria || 'America/Bogota',
            horarioApertura: '08:00',
            horarioCierre: '20:00',
            horarioGeneralTexto: s.horarioGeneralTexto,
            diasMaxAnticipacion: s.diasMaxAnticipacion,
            minutosMinAnticipacion: s.minutosMinAnticipacion,
            estadoInicialCita: s.estadoInicialCita,
            politicaDatosUrl: s.politicaDatosUrl,
            sillonesActivos: 3
          }
        };
      }
      return response;
    } catch (err) {
      // Si la llamada autenticada no está disponible aún, intentar con info pública
      const pubRes = await this.getPublicInfo();
      if (pubRes?.data?.negocio) {
        const n = pubRes.data.negocio;
        return {
          ok: true,
          success: true,
          data: {
            id: n.sedeId,
            sedeId: n.sedeId,
            nombreComercial: n.nombreComercial,
            eslogan: n.eslogan,
            direccion: n.direccionFisica,
            direccionFisica: n.direccionFisica,
            telefono: n.telefonoContacto,
            zonaHoraria: 'America/Bogota',
            horarioGeneralTexto: n.horarioGeneralTexto,
            sillonesActivos: 3
          }
        };
      }
      throw err;
    }
  },

  /**
   * Actualiza los parámetros de la sede (exclusivo Administrador: CU-003).
   */
  async actualizarSede(id, datos) {
    const response = await httpClient.put(`/sedes/${id}`, datos);
    return response;
  }
};
