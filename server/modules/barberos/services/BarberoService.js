/**
 * @file BarberoService.js
 * @description Servicio de aplicación para administración de barberos, horarios, bloqueos y comisiones (CU-009 a CU-013).
 */
import { Barbero } from '../domain/Barbero.js';
import { BloqueoHorario } from '../domain/BloqueoHorario.js';
import { BarberoPgRepository } from '../repositories/BarberoPgRepository.js';
import { RegistroCortePgRepository } from '../../cortes/repositories/RegistroCortePgRepository.js';
import { UsuarioPgRepository } from '../../seguridad/repositories/UsuarioPgRepository.js';
import { NotFoundError, ValidationError, ForbiddenError } from '../../../shared/errors/domainErrors.js';
import { getDatabasePool } from '../../../shared/database/connection.js';
import bcrypt from 'bcryptjs';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

export class BarberoService {
  constructor(barberoRepo = null, corteRepo = null, usuarioRepo = null) {
    this.barberoRepo = barberoRepo || new BarberoPgRepository();
    this.corteRepo = corteRepo || new RegistroCortePgRepository();
    this.usuarioRepo = usuarioRepo || new UsuarioPgRepository();
  }

  async listBarberos(sedeId, { activosSolo = false } = {}) {
    return await this.barberoRepo.findBySede(sedeId, { activosSolo });
  }

  async getBarberoById(id) {
    const barbero = await this.barberoRepo.findById(id);
    if (!barbero) {
      throw new NotFoundError('Barbero', id);
    }
    return barbero;
  }

  async createBarbero(data) {
    if (data.porcentajeComision !== undefined && data.porcentajeComision !== null) {
      if (data.porcentajeComision < 0 || data.porcentajeComision > 100) {
        throw new ValidationError('El porcentaje de comisión debe estar entre 0.00 y 100.00%.');
      }
    }

    if (data.crearUsuario) {
      const pool = getDatabasePool();
      const client = await pool.connect();
      try {
        await client.query('BEGIN');

        const correo = data.correo.toLowerCase().trim();
        const existing = await client.query('SELECT usuario_id FROM usuarios WHERE correo = $1 LIMIT 1', [correo]);
        let usuarioId = null;

        if (existing.rows.length > 0) {
          usuarioId = existing.rows[0].usuario_id;
        } else {
          const pass = data.contrasenaInicial || 'Barbero2026*';
          const hash = await bcrypt.hash(pass, 10);
          const userRes = await client.query(
            `INSERT INTO usuarios (sede_id, correo, contrasena_hash, rol, estado)
             VALUES ($1, $2, $3, 'barbero', 'activo')
             RETURNING usuario_id`,
            [data.sedeId, correo, hash]
          );
          usuarioId = userRes.rows[0].usuario_id;
        }

        const barberoData = {
          ...data,
          usuarioId
        };
        const nuevo = new Barbero(barberoData);
        const guardado = await this.barberoRepo.save(nuevo, { client });
        await client.query('COMMIT');
        return guardado;
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      } finally {
        client.release();
      }
    }

    const nuevo = new Barbero(data);
    return await this.barberoRepo.save(nuevo);
  }

  async updateBarbero(id, data) {
    const barbero = await this.barberoRepo.findById(id);
    if (!barbero) {
      throw new NotFoundError('Barbero', id);
    }

    if (data.porcentajeComision !== undefined && data.porcentajeComision !== null) {
      if (data.porcentajeComision < 0 || data.porcentajeComision > 100) {
        throw new ValidationError('El porcentaje de comisión debe estar entre 0.00 y 100.00%.');
      }
    }

    Object.assign(barbero, data);
    return await this.barberoRepo.save(barbero);
  }

  async updateMiPerfil(barberoId, data) {
    const barbero = await this.getBarberoById(barberoId);

    // Solo mutar campos permitidos al barbero
    if (data.nombrePublico !== undefined) barbero.nombrePublico = data.nombrePublico;
    if (data.telefono !== undefined) barbero.telefono = data.telefono;
    if (data.fotoUrl !== undefined) barbero.fotoUrl = data.fotoUrl;
    if (data.biografiaBreve !== undefined) barbero.biografiaBreve = data.biografiaBreve;

    return await this.barberoRepo.save(barbero);
  }

  async guardarFoto(imagenBase64) {
    if (!imagenBase64 || typeof imagenBase64 !== 'string') {
      throw new ValidationError('La imagen es requerida en formato base64.');
    }

    let mimeType = 'image/webp';
    let base64Data = imagenBase64;
    const matches = imagenBase64.match(/^data:(image\/[a-zA-Z+]+);base64,(.+)$/);
    if (matches) {
      mimeType = matches[1];
      base64Data = matches[2];
    }

    const extensionMap = {
      'image/jpeg': 'jpg',
      'image/jpg': 'jpg',
      'image/png': 'png',
      'image/webp': 'webp'
    };

    const ext = extensionMap[mimeType] || 'webp';
    const buffer = Buffer.from(base64Data, 'base64');

    // Validar peso máximo 2MB (2 * 1024 * 1024 bytes)
    const MAX_SIZE_BYTES = 2 * 1024 * 1024;
    if (buffer.length > MAX_SIZE_BYTES) {
      throw new ValidationError(`La imagen supera el límite máximo permitido de 2 MB (tamaño actual: ${(buffer.length / (1024 * 1024)).toFixed(2)} MB).`);
    }

    const uploadsDir = path.resolve(process.cwd(), 'public/uploads/barberos');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    const filename = `barbero-${crypto.randomUUID()}.${ext}`;
    const filePath = path.join(uploadsDir, filename);
    await fs.promises.writeFile(filePath, buffer);

    const fotoUrl = `/uploads/barberos/${filename}`;
    return {
      fotoUrl,
      filename,
      size: buffer.length,
      mimeType
    };
  }

  async getCitasFuturas(id) {
    await this.getBarberoById(id);
    return await this.barberoRepo.findCitasFuturasActivas(id);
  }

  async desactivarBarbero(id) {
    const barbero = await this.barberoRepo.findById(id);
    if (!barbero) {
      throw new NotFoundError('Barbero', id);
    }

    // Comprobar si tiene citas futuras activas (RF-BAR-02, CU-010)
    const citasFuturas = await this.barberoRepo.findCitasFuturasActivas(id);

    // Desactivar perfil (borrado lógico RN-13)
    const desactivado = await this.barberoRepo.desactivar(id);

    // Desactivar cuenta de usuario y revocar sesiones si tiene usuario vinculado
    if (barbero.usuarioId) {
      await this.usuarioRepo.cambiarEstado(barbero.usuarioId, 'inactivo').catch(() => {});
      await this.usuarioRepo.revocarSesionesActivas(barbero.usuarioId);
    }

    return {
      barbero: desactivado,
      alertaCitasFuturas: citasFuturas.length > 0,
      totalCitasFuturasAfectadas: citasFuturas.length,
      citasFuturas
    };
  }

  async activarBarbero(id) {
    const barbero = await this.barberoRepo.findById(id);
    if (!barbero) {
      throw new NotFoundError('Barbero', id);
    }

    const activado = await this.barberoRepo.activar(id);

    if (barbero.usuarioId) {
      await this.usuarioRepo.cambiarEstado(barbero.usuarioId, 'activo').catch(() => {});
    }

    return activado;
  }

  async getHorarios(barberoId) {
    await this.getBarberoById(barberoId);
    return await this.barberoRepo.getHorariosByBarbero(barberoId);
  }

  async configurarHorarios(barberoId, horarios) {
    await this.getBarberoById(barberoId);

    // Validar que cada franja laboral cumpla con la regla de 30 min y start < end
    for (const h of horarios) {
      if (!h.esDescanso) {
        if (!h.horaInicio || !h.horaFin) {
          throw new ValidationError('Para días laborales debe especificar hora de inicio y fin.');
        }
        if (h.horaInicio >= h.horaFin) {
          throw new ValidationError(`La hora de inicio (${h.horaInicio}) debe ser menor a la hora de fin (${h.horaFin}).`);
        }
        const minInicio = h.horaInicio.split(':')[1];
        const minFin = h.horaFin.split(':')[1];
        if (!['00', '30'].includes(minInicio) || !['00', '30'].includes(minFin)) {
          throw new ValidationError('Los horarios deben iniciar y finalizar en minutos :00 o :30.');
        }
      }
    }

    return await this.barberoRepo.saveHorarios(barberoId, horarios);
  }

  async getBloqueos(barberoId, fecha) {
    return await this.barberoRepo.getBloqueosByFecha(barberoId, fecha);
  }

  async crearBloqueo(data, usuarioId) {
    await this.getBarberoById(data.barberoId);

    let inicioEn = data.inicioEn ? new Date(data.inicioEn) : null;
    let finEn = data.finEn ? new Date(data.finEn) : null;
    let horaInicio = data.horaInicio || null;
    let horaFin = data.horaFin || null;

    if (data.diaCompleto) {
      inicioEn = inicioEn || new Date(`${data.fecha}T00:00:00-05:00`);
      finEn = finEn || new Date(`${data.fecha}T23:59:59-05:00`);
    } else {
      if (horaInicio && horaInicio.length === 5) horaInicio += ':00';
      if (horaFin && horaFin.length === 5) horaFin += ':00';
      inicioEn = inicioEn || new Date(`${data.fecha}T${horaInicio || '00:00:00'}-05:00`);
      finEn = finEn || new Date(`${data.fecha}T${horaFin || '23:59:59'}-05:00`);
    }

    const bloqueo = new BloqueoHorario({
      ...data,
      horaInicio,
      horaFin,
      inicioEn,
      finEn,
      creadoPorUsuarioId: usuarioId
    });

    return await this.barberoRepo.saveBloqueo(bloqueo);
  }

  async eliminarBloqueo(bloqueoId) {
    const cancelado = await this.barberoRepo.deleteBloqueo(bloqueoId);
    if (!cancelado) {
      throw new NotFoundError('BloqueoHorario', bloqueoId);
    }
    return { mensaje: 'Bloqueo eliminado exitosamente.' };
  }

  async getLiquidacion({ sedeId, fechaInicio, fechaFin, barberoId = null, formato = 'json' }) {
    const liquidacion = await this.corteRepo.getLiquidacionBarberos({
      sedeId,
      fechaInicio,
      fechaFin,
      barberoId
    });

    if (formato === 'csv') {
      const headers = 'Barbero ID,Nombre Barbero,Comision %,Total Cortes,Total Facturado COP,Total Comision COP\n';
      const rows = liquidacion
        .map(
          (l) =>
            `"${l.barberoId}","${l.barberoNombre}",${l.porcentajeComisionActual},${l.totalCortes},${l.totalFacturadoCop},${l.totalComisionCop}`
        )
        .join('\n');
      return { isCsv: true, data: headers + rows };
    }

    return { isCsv: false, data: liquidacion };
  }
}
