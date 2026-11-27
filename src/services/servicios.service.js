/**
 * SmartBarber - Servicio de Catálogo de Servicios (100% Producción Real)
 * Precios en COP enteros, duración en bloques de 30 min (CU-014, CU-015).
 * Conexión a /api/v1/servicios y fallback transparente a /api/v1/public/info para portal público.
 */

import { httpClient } from './http-client.js';
import { sedesService } from './sedes.service.js';

function normalizeServicio(s) {
  if (!s) return null;
  const id = s.servicioId || s.id;
  const precioCop = Number(s.precioCop ?? s.precio ?? 0);
  const bloques = Number(s.duracionBloques ?? Math.ceil((Number(s.duracionMinutos) || 30) / 30) ?? 1);
  const duracionMin = s.duracionMinutos ?? (bloques * 30);
  const estado = s.estado || (s.activo === false ? 'inactivo' : 'activo');

  return {
    id,
    servicioId: id,
    sedeId: s.sedeId,
    nombre: s.nombre,
    descripcion: s.descripcionBreve || s.descripcion || '',
    descripcionBreve: s.descripcionBreve || s.descripcion || '',
    precio: precioCop,
    precioCop,
    duracionMinutos: duracionMin,
    duracionBloques: bloques,
    visibleEnLanding: s.visiblePublico ?? s.visibleEnLanding ?? true,
    visiblePublico: s.visiblePublico ?? s.visibleEnLanding ?? true,
    activo: estado === 'activo',
    estado,
    orden: s.ordenVisual ?? s.orden ?? 0,
    ordenVisual: s.ordenVisual ?? s.orden ?? 0
  };
}

export const serviciosService = {
  /**
   * Obtiene la lista de servicios.
   * Si está en portal público sin autenticación, consume /public/info.
   * En backoffice autenticado, consume /servicios.
   */
  async getServicios(filtros = {}) {
    const sortServicios = (list) => {
      if (!filtros.sort) return list;
      if (filtros.sort === 'price-asc') return list.sort((a, b) => a.precio - b.precio);
      if (filtros.sort === 'price-desc') return list.sort((a, b) => b.precio - a.precio);
      if (filtros.sort === 'duration') return list.sort((a, b) => b.duracionMinutos - a.duracionMinutos);
      return list.sort((a, b) => a.orden - b.orden);
    };

    // Sin sesión autenticada (portal público): usar exclusivamente /public/info sin caer a ruta privada
    if (!httpClient.getToken()) {
      const pub = await sedesService.getPublicInfo();
      const rawList = Array.isArray(pub?.data?.servicios) ? pub.data.servicios : [];
      const list = sortServicios(rawList.map(normalizeServicio).filter(Boolean));
      return { ok: true, success: true, data: list };
    }

    try {
      const query = new URLSearchParams();
      if (filtros.activo !== undefined && filtros.activo !== 'all') {
        query.append('activosSolo', filtros.activo === true || filtros.activo === 'true' || filtros.activo === 'activos');
      }

      const queryString = query.toString() ? `?${query.toString()}` : '';
      const response = await httpClient.get(`/servicios${queryString}`);

      if (response?.data && Array.isArray(response.data)) {
        const list = sortServicios(response.data.map(normalizeServicio).filter(Boolean));
        return { ok: true, success: true, data: list };
      }
      return response;
    } catch (err) {
      // Si el token expiró (401), degradar a /public/info
      if (err.status === 401) {
        const pub = await sedesService.getPublicInfo();
        if (pub?.data?.servicios && Array.isArray(pub.data.servicios)) {
          const list = sortServicios(pub.data.servicios.map(normalizeServicio).filter(Boolean));
          return { ok: true, success: true, data: list };
        }
      }
      throw err;
    }
  },

  async getServicioPorId(id) {
    const response = await httpClient.get(`/servicios/${id}`);
    if (response?.data) {
      return { ok: true, success: true, data: normalizeServicio(response.data) };
    }
    return response;
  },

  async crearServicio(datos) {
    let sedeId = datos.sedeId;
    if (!sedeId) {
      const sede = await sedesService.getSedeActiva();
      sedeId = sede?.data?.sedeId || sede?.data?.id;
    }

    const duracionBloques = Number(datos.duracionBloques) || Math.max(1, Math.ceil((Number(datos.duracionMinutos) || 30) / 30));
    const precioCop = Math.round(Number(datos.precioCop || datos.precio || 0));

    const payload = {
      sedeId,
      nombre: datos.nombre?.trim(),
      descripcionBreve: (datos.descripcionBreve || datos.descripcion || '').trim() || null,
      precioCop,
      duracionBloques,
      visiblePublico: datos.visiblePublico ?? (datos.visibleEnLanding !== false),
      estado: datos.estado || (datos.activo === false ? 'inactivo' : 'activo'),
      ordenVisual: Number(datos.ordenVisual || datos.orden || 0)
    };

    const response = await httpClient.post('/servicios', payload);
    if (response?.data) {
      return { ok: true, success: true, data: normalizeServicio(response.data) };
    }
    return response;
  },

  async actualizarServicio(id, datos) {
    const payload = {};
    if (datos.nombre !== undefined) payload.nombre = datos.nombre.trim();
    if (datos.descripcion !== undefined || datos.descripcionBreve !== undefined) {
      payload.descripcionBreve = (datos.descripcionBreve || datos.descripcion || '').trim();
    }
    if (datos.precio !== undefined || datos.precioCop !== undefined) {
      payload.precioCop = Math.round(Number(datos.precioCop || datos.precio));
    }
    if (datos.duracionMinutos !== undefined || datos.duracionBloques !== undefined) {
      payload.duracionBloques = Number(datos.duracionBloques) || Math.max(1, Math.ceil((Number(datos.duracionMinutos) || 30) / 30));
    }
    if (datos.visiblePublico !== undefined || datos.visibleEnLanding !== undefined) {
      payload.visiblePublico = datos.visiblePublico ?? datos.visibleEnLanding;
    }
    if (datos.estado !== undefined) payload.estado = datos.estado;
    if (datos.activo !== undefined) payload.estado = datos.activo ? 'activo' : 'inactivo';
    if (datos.ordenVisual !== undefined || datos.orden !== undefined) {
      payload.ordenVisual = Number(datos.ordenVisual ?? datos.orden);
    }

    const response = await httpClient.put(`/servicios/${id}`, payload);
    if (response?.data) {
      return { ok: true, success: true, data: normalizeServicio(response.data) };
    }
    return response;
  },

  async cambiarEstadoServicio(id, activo) {
    const response = await httpClient.patch(`/servicios/${id}/estado`, {});
    if (response?.data) {
      return { ok: true, success: true, data: normalizeServicio(response.data) };
    }
    return response;
  }
};
