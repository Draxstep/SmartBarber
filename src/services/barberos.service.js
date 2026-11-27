/**
 * SmartBarber - Servicio de Barberos y Horarios (100% Producción Real)
 * Perfiles de personal, sillones, plantillas de turnos y bloqueos de agenda (CU-009 a CU-013).
 */

import { httpClient, NetworkError } from './http-client.js';
import { sedesService } from './sedes.service.js';
import { encolarCambio } from '../pwa/sync.js';

function normalizeBarbero(b, index = 0) {
  if (!b) return null;
  const id = b.barberoId || b.id;
  const nombre = b.nombrePublico || b.nombreCompleto || b.nombre;
  const foto = b.fotoUrl || b.foto || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&auto=format&fit=crop&q=80';
  const activo = b.estado ? b.estado === 'activo' : (b.activo ?? true);

  return {
    id,
    barberoId: id,
    sedeId: b.sedeId,
    usuarioId: b.usuarioId,
    nombre,
    nombreCompleto: b.nombreCompleto || nombre,
    nombrePublico: b.nombrePublico || nombre,
    email: b.correo || b.email || '',
    correo: b.correo || b.email || '',
    telefono: b.telefono || '',
    documento: b.documento || `CC ${b.telefono?.slice(-6) || '1.020.300'}`,
    especialidad: b.biografiaBreve || b.especialidad || 'Barbero Profesional · Estilo & Navaja',
    biografiaBreve: b.biografiaBreve || b.especialidad || '',
    experiencia: b.experiencia || 'Master Barber',
    foto,
    fotoUrl: foto,
    sillon: b.sillon || `Sillón 0${(index % 3) + 1}`,
    sillonIndex: index % 3,
    comisionPorcentaje: Number(b.porcentajeComision ?? b.comisionPorcentaje ?? 50),
    porcentajeComision: Number(b.porcentajeComision ?? b.comisionPorcentaje ?? 50),
    activo,
    estado: activo ? 'activo' : 'inactivo',
    enTurno: activo
  };
}

export const barberosService = {
  /**
   * Obtiene la lista de barberos.
   * Si la sesión no está autenticada, consume /public/info.
   */
  async getBarberos() {
    // Sin sesión autenticada (portal público): usar exclusivamente /public/info sin caer a ruta privada
    if (!httpClient.getToken()) {
      const pub = await sedesService.getPublicInfo();
      const rawList = Array.isArray(pub?.data?.barberos) ? pub.data.barberos : [];
      return {
        ok: true,
        success: true,
        data: rawList.map((b, idx) => normalizeBarbero(b, idx)).filter(Boolean)
      };
    }

    try {
      const response = await httpClient.get('/barberos');
      if (response?.data && Array.isArray(response.data)) {
        return {
          ok: true,
          success: true,
          data: response.data.map((b, idx) => normalizeBarbero(b, idx)).filter(Boolean)
        };
      }
      return response;
    } catch (err) {
      if (err.status === 401) {
        const pub = await sedesService.getPublicInfo();
        if (pub?.data?.barberos && Array.isArray(pub.data.barberos)) {
          return {
            ok: true,
            success: true,
            data: pub.data.barberos.map((b, idx) => normalizeBarbero(b, idx)).filter(Boolean)
          };
        }
      }
      throw err;
    }
  },

  async getBarberoPorId(id) {
    const response = await httpClient.get(`/barberos/${id}`);
    if (response?.data) {
      return { ok: true, success: true, data: normalizeBarbero(response.data) };
    }
    return response;
  },

  async subirFoto(imagenBase64) {
    const response = await httpClient.post('/barberos/upload-foto', { imagenBase64 });
    return response;
  },

  async crearBarbero(datos) {
    let sedeId = datos.sedeId;
    if (!sedeId) {
      const sede = await sedesService.getSedeActiva();
      sedeId = sede?.data?.sedeId || sede?.data?.id;
    }

    const payload = {
      sedeId,
      nombreCompleto: datos.nombreCompleto || datos.nombre,
      nombrePublico: datos.nombrePublico || datos.nombre,
      telefono: datos.telefono || '+573001234567',
      correo: (datos.correo || datos.email || `${datos.nombre.toLowerCase().replace(/\s+/g, '.')}@smartbarber.co`).toLowerCase().trim(),
      fotoUrl: datos.fotoUrl || datos.foto || null,
      biografiaBreve: datos.biografiaBreve || datos.especialidad || null,
      porcentajeComision: Number(datos.porcentajeComision || datos.comisionPorcentaje || 50),
      estado: datos.estado || 'activo',
      crearUsuario: Boolean(datos.crearUsuario),
      contrasenaInicial: datos.contrasenaInicial || undefined
    };

    const response = await httpClient.post('/barberos', payload);
    if (response?.data) {
      return { ok: true, success: true, data: normalizeBarbero(response.data) };
    }
    return response;
  },

  async actualizarBarbero(id, datos) {
    const payload = {};
    if (datos.nombreCompleto || datos.nombre) payload.nombreCompleto = datos.nombreCompleto || datos.nombre;
    if (datos.nombrePublico) payload.nombrePublico = datos.nombrePublico;
    if (datos.telefono) payload.telefono = datos.telefono;
    if (datos.correo || datos.email) payload.correo = (datos.correo || datos.email).toLowerCase().trim();
    if (datos.fotoUrl || datos.foto) payload.fotoUrl = datos.fotoUrl || datos.foto;
    if (datos.biografiaBreve || datos.especialidad) payload.biografiaBreve = datos.biografiaBreve || datos.especialidad;
    if (datos.porcentajeComision !== undefined || datos.comisionPorcentaje !== undefined) {
      payload.porcentajeComision = Number(datos.porcentajeComision ?? datos.comisionPorcentaje);
    }
    if (datos.estado) payload.estado = datos.estado;

    const response = await httpClient.put(`/barberos/${id}`, payload);
    if (response?.data) {
      return { ok: true, success: true, data: normalizeBarbero(response.data) };
    }
    return response;
  },

  async cambiarEstadoBarbero(id, activo) {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      throw new NetworkError('El cambio de estado de barbero requiere conexión obligatoria al servidor (CU-010).');
    }
    const endpoint = activo ? `/barberos/${id}/activar` : `/barberos/${id}/desactivar`;
    const response = await httpClient.patch(endpoint, {});
    return response;
  },

  async getCitasFuturas(id) {
    return await httpClient.get(`/barberos/${id}/citas-futuras`);
  },

  async getMiPerfil() {
    const response = await httpClient.get('/barberos/me/perfil');
    if (response?.data?.barbero) {
      response.data.barbero = normalizeBarbero(response.data.barbero);
    }
    return response;
  },

  async actualizarMiPerfil(datos) {
    const payload = {};
    if (datos.nombrePublico !== undefined) payload.nombrePublico = datos.nombrePublico;
    if (datos.telefono !== undefined) payload.telefono = datos.telefono;
    if (datos.fotoUrl !== undefined) payload.fotoUrl = datos.fotoUrl;
    if (datos.biografiaBreve !== undefined) payload.biografiaBreve = datos.biografiaBreve;

    const response = await httpClient.put('/barberos/me/perfil', payload);
    if (response?.data) {
      return { ok: true, success: true, data: normalizeBarbero(response.data) };
    }
    return response;
  },

  async getHorarioSemanal(barberoId) {
    const response = await httpClient.get(`/barberos/${barberoId}/horarios`);
    return response;
  },

  async guardarHorarioSemanal(barberoId, franjas) {
    const response = await httpClient.post(`/barberos/${barberoId}/horarios`, { franjas });
    return response;
  },

  async getBloqueos(barberoId) {
    const response = await httpClient.get(`/barberos/${barberoId}/bloqueos`);
    return response;
  },

  async agregarBloqueo(barberoId, bloqueo) {
    const payload = {
      barberoId,
      fecha: bloqueo.fecha,
      diaCompleto: Boolean(bloqueo.diaCompleto),
      horaInicio: bloqueo.horaInicio ? `${bloqueo.horaInicio.slice(0, 5)}:00` : null,
      horaFin: bloqueo.horaFin ? `${bloqueo.horaFin.slice(0, 5)}:00` : null,
      motivo: bloqueo.motivo?.trim() || 'Bloqueo administrativo de agenda'
    };

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      await encolarCambio('CREAR_BLOQUEO', payload);
      return {
        ok: true,
        success: true,
        offline: true,
        message: 'Bloqueo encolado para sincronización cuando vuelva la conexión'
      };
    }

    const response = await httpClient.post(`/barberos/${barberoId}/bloqueos`, payload);
    return response;
  },

  async eliminarBloqueo(barberoId, bloqueoId) {
    const response = await httpClient.delete(`/barberos/${barberoId}/bloqueos/${bloqueoId}`);
    return response;
  },

  async getLiquidaciones({ fechaInicio, fechaFin, barberoId } = {}) {
    const query = new URLSearchParams();
    if (fechaInicio) query.append('fechaInicio', fechaInicio);
    if (fechaFin) query.append('fechaFin', fechaFin);
    if (barberoId && barberoId !== 'all') query.append('barberoId', barberoId);

    const q = query.toString() ? `?${query.toString()}` : '';
    const response = await httpClient.get(`/barberos/liquidaciones${q}`);
    return response;
  }
};
