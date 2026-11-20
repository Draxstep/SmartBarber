/**
 * @file index.js
 * @description Punto de entrada público (Public Facade / Barrel) del módulo Seguridad.
 */
import { UsuarioPgRepository } from './repositories/UsuarioPgRepository.js';

export * from './domain/Usuario.js';
export * from './domain/SesionUsuario.js';
export * from './dto/seguridadDto.js';
export * from './mappers/seguridadMapper.js';
export * from './repositories/IUsuarioRepository.js';
export * from './repositories/UsuarioPgRepository.js';

export const usuarioRepository = new UsuarioPgRepository();
