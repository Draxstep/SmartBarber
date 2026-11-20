/**
 * @file clienteMapper.js
 * @description Mapeador para las entidades del módulo de Clientes.
 */
import { Cliente } from '../domain/Cliente.js';

export class ClienteMapper {
  static toDomain(row) {
    if (!row) return null;
    return new Cliente({
      clienteId: row.cliente_id,
      sedeId: row.sede_id,
      nombreCompleto: row.nombre_completo,
      telefonoWhatsapp: row.telefono_whatsapp,
      correo: row.correo,
      aceptoPoliticaDatosEn: row.acepto_politica_datos_en,
      creadoEn: row.creado_en,
      actualizadoEn: row.actualizado_en
    });
  }

  static toDto(entity) {
    if (!entity) return null;
    return {
      clienteId: entity.clienteId,
      sedeId: entity.sedeId,
      nombreCompleto: entity.nombreCompleto,
      telefonoWhatsapp: entity.telefonoWhatsapp,
      correo: entity.correo,
      aceptoPoliticaDatosEn: entity.aceptoPoliticaDatosEn ? entity.aceptoPoliticaDatosEn.toISOString() : null,
      creadoEn: entity.creadoEn.toISOString(),
      actualizadoEn: entity.actualizadoEn.toISOString()
    };
  }
}
