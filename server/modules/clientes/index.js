/**
 * @file index.js
 * @description Punto de entrada público (Public Facade / Barrel) del módulo Clientes.
 */
import { ClientePgRepository } from './repositories/ClientePgRepository.js';

export * from './domain/Cliente.js';
export * from './dto/clienteDto.js';
export * from './mappers/clienteMapper.js';
export * from './repositories/IClienteRepository.js';
export * from './repositories/ClientePgRepository.js';

export const clienteRepository = new ClientePgRepository();
