/**
 * @file inventarioDto.js
 * @description Esquemas de validación y DTOs para el módulo de Inventario y Kardex.
 */
import { z } from 'zod';
import {
  EstadoRegistro,
  TipoMovimientoInventario,
  SubtipoMovimientoInventario,
  MetodoPago
} from '../../../../shared/contracts/enums.js';

export const createProductoSchema = z.object({
  sedeId: z.string().uuid('ID de sede inválido'),
  sku: z.string().trim().max(50).nullable().optional(),
  nombre: z.string().trim().min(2, 'El nombre debe tener al menos 2 caracteres').max(100),
  categoria: z.string().trim().min(2, 'La categoría debe tener al menos 2 caracteres').max(60),
  precioVentaCop: z.number().int().positive('El precio de venta debe ser positivo en COP'),
  costoUnitarioCop: z.number().int().nonnegative().nullable().optional(),
  stockMinimo: z.number().int().nonnegative().default(0),
  estado: z.enum([EstadoRegistro.ACTIVO, EstadoRegistro.INACTIVO]).default(EstadoRegistro.ACTIVO)
});

export const updateProductoSchema = createProductoSchema.partial();

export const registrarMovimientoSchema = z.object({
  sedeId: z.string().uuid('ID de sede inválido'),
  productoId: z.string().uuid('ID de producto inválido'),
  tipo: z.enum([TipoMovimientoInventario.ENTRADA, TipoMovimientoInventario.SALIDA]),
  subtipo: z.enum([
    SubtipoMovimientoInventario.INVENTARIO_INICIAL,
    SubtipoMovimientoInventario.COMPRA_REPOSICION,
    SubtipoMovimientoInventario.AJUSTE_POSITIVO,
    SubtipoMovimientoInventario.VENTA_PUBLICO,
    SubtipoMovimientoInventario.CONSUMO_INTERNO,
    SubtipoMovimientoInventario.AJUSTE_NEGATIVO
  ]),
  cantidad: z.number().int().positive('La cantidad debe ser un entero positivo mayor a cero'),
  costoUnitarioCop: z.number().int().nonnegative().nullable().optional(),
  precioUnitarioCop: z.number().int().positive().nullable().optional(),
  metodoPago: z.enum([
    MetodoPago.EFECTIVO,
    MetodoPago.TRANSFERENCIA_BANCARIA,
    MetodoPago.TARJETA_DEBITO_CREDITO,
    MetodoPago.NEQUI,
    MetodoPago.DAVIPLATA
  ]).nullable().optional(),
  registroCorteId: z.string().uuid().nullable().optional(),
  observacion: z.string().trim().max(200).nullable().optional(),
  usuarioId: z.string().uuid('ID de usuario operador inválido')
}).refine(
  (data) => {
    // Si es venta al público, método de pago y precio unitario son obligatorios
    if (data.subtipo === SubtipoMovimientoInventario.VENTA_PUBLICO) {
      return data.metodoPago !== null && data.precioUnitarioCop !== null;
    }
    return true;
  },
  {
    message: 'Las ventas al público exigen método de pago y precio unitario (RF-INV-03)',
    path: ['metodoPago']
  }
);
