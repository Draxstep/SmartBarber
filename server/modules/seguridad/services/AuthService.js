/**
 * @file AuthService.js
 * @description Servicio de aplicación para autenticación, bloqueo por fuerza bruta y sesiones (CU-001).
 */
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { env } from '../../../config/env.js';
import { getDatabasePool } from '../../../shared/database/connection.js';
import {
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ValidationError,
  AccountLockedError
} from '../../../shared/errors/domainErrors.js';
import { UsuarioPgRepository } from '../repositories/UsuarioPgRepository.js';
import { BarberoPgRepository } from '../../barberos/repositories/BarberoPgRepository.js';

export class AuthService {
  /**
   * @param {UsuarioPgRepository} [usuarioRepo]
   * @param {BarberoPgRepository} [barberoRepo]
   */
  constructor(usuarioRepo = null, barberoRepo = null) {
    this.usuarioRepo = usuarioRepo || new UsuarioPgRepository();
    this.barberoRepo = barberoRepo || new BarberoPgRepository();
  }

  /**
   * Inicia sesión, valida intentos y emite JWT de 8h (CU-001, RNF-09, RNF-10).
   * @param {string} correo
   * @param {string} contrasena
   * @returns {Promise<{token: string, usuario: object}>}
   */
  async login(correo, contrasena, { ip = null, userAgent = null } = {}) {
    const usuario = await this.usuarioRepo.findByCorreo(correo);

    if (!usuario) {
      // Prevención de enumeración de usuarios
      throw new UnauthorizedError('Credenciales de acceso incorrectas.');
    }

    if (usuario.estado !== 'activo') {
      throw new ForbiddenError('La cuenta de usuario se encuentra inactiva. Comuníquese con el administrador.');
    }

    // Verificar si está en periodo de bloqueo por fuerza bruta (RNF-10: 15 min tras 5 intentos -> HTTP 423)
    if (usuario.bloqueadoHasta && new Date(usuario.bloqueadoHasta) > new Date()) {
      const minutosRestantes = Math.ceil((new Date(usuario.bloqueadoHasta).getTime() - Date.now()) / 60000);
      throw new AccountLockedError(
        `Cuenta bloqueada temporalmente por 5 intentos fallidos consecutivos. Por favor espere ${minutosRestantes} minuto(s).`
      );
    }

    const contrasenaValida = await bcrypt.compare(contrasena, usuario.contrasenaHash);

    if (!contrasenaValida) {
      await this.usuarioRepo.registrarIntentoFallido(usuario.usuarioId);
      const intentosActuales = (usuario.intentosFallidos || 0) + 1;

      if (intentosActuales >= 5) {
        throw new AccountLockedError(
          'Ha superado los 5 intentos fallidos permitidos. Su cuenta ha sido bloqueada temporalmente por 15 minutos.'
        );
      }

      throw new UnauthorizedError('Credenciales de acceso incorrectas.');
    }

    // Credenciales válidas: restablecer intentos y actualizar último acceso
    await this.usuarioRepo.resetearIntentosYAcceso(usuario.usuarioId);

    // Obtener perfil de barbero si aplica
    let barberoId = null;
    let barberoNombre = null;
    const barbero = await this.barberoRepo.findByUsuarioId(usuario.usuarioId);
    if (barbero) {
      barberoId = barbero.barberoId;
      barberoNombre = barbero.nombreCompleto;
    }

    // Emitir JWT de sesión con expiración de 8 horas (RNF-10)
    const token = jwt.sign(
      {
        id: usuario.usuarioId,
        correo: usuario.correo,
        rol: usuario.rol,
        sedeId: usuario.sedeId,
        barberoId
      },
      env.JWT_SECRET,
      { expiresIn: env.JWT_EXPIRES_IN }
    );

    // Registrar sesión activa en sesiones_usuarios (RNF-10)
    try {
      const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
      const pool = getDatabasePool();
      await pool.query(
        `INSERT INTO sesiones_usuarios (usuario_id, token_hash, direccion_ip, agente_usuario, expira_en)
         VALUES ($1, $2, $3, $4, NOW() + INTERVAL '8 hours')`,
        [usuario.usuarioId, tokenHash, ip, userAgent]
      );
    } catch (sessionErr) {
      console.warn('⚠️ No se pudo registrar sesión en sesiones_usuarios:', sessionErr.message);
    }

    return {
      token,
      usuario: {
        id: usuario.usuarioId,
        correo: usuario.correo,
        rol: usuario.rol,
        sedeId: usuario.sedeId,
        barberoId,
        barberoNombre,
        ultimoAccesoEn: new Date().toISOString()
      }
    };
  }

  /**
   * Cierra sesión y revoca registros activos (CU-001).
   * @param {string} usuarioId
   */
  async logout(usuarioId) {
    await this.usuarioRepo.revocarSesionesActivas(usuarioId);
    return { mensaje: 'Sesión cerrada correctamente.' };
  }

  /**
   * Cambia la contraseña de un usuario respetando RBAC (CU-002, RNF-09).
   */
  async cambiarContrasena(usuarioId, { contrasenaActual, nuevaContrasena }, requestingUser) {
    const usuario = await this.usuarioRepo.findById(usuarioId);
    if (!usuario) {
      throw new NotFoundError('Usuario', usuarioId);
    }

    // Si no es administrador o está cambiando su propia contraseña, se exige validar la actual
    const esAdmin = requestingUser.rol === 'administrador';
    const esPropia = requestingUser.id === usuarioId;

    if (!esAdmin || esPropia) {
      if (!contrasenaActual) {
        throw new ValidationError('Debe proporcionar la contraseña actual.');
      }
      const esCorrecta = await bcrypt.compare(contrasenaActual, usuario.contrasenaHash);
      if (!esCorrecta) {
        throw new UnauthorizedError('La contraseña actual es incorrecta.');
      }
    }

    if (nuevaContrasena.length < 8) {
      throw new ValidationError('La nueva contraseña debe tener al menos 8 caracteres.');
    }

    const nuevoHash = await bcrypt.hash(nuevaContrasena, 10);
    usuario.actualizarContrasena(nuevoHash);

    await this.usuarioRepo.save(usuario);
    await this.usuarioRepo.revocarSesionesActivas(usuarioId);

    return { mensaje: 'Contraseña actualizada exitosamente.' };
  }
}
