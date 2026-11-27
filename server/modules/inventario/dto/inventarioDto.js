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
  sedeId: z.string().uuid('ID de sede inválido').optional(),
  sku: z.string().trim().max(50).nullable().optional(),
  nombre: z.string().trim().min(2, 'El nombre debe tener al menos 2 caracteres').max(100),
  categoria: z.string().trim().min(2, 'La categoría debe tener al menos 2 caracteres').max(60),
  precioVentaCop: z.number().int().positive('El precio de venta debe ser positivo en COP'),
  costoUnitarioCop: z.number().int().nonnegative().nullable().optional(),
  stockInicial: z.number().int().nonnegative().default(0),
  stockMinimo: z.number().int().nonnegative().default(0),
  estado: z.enum([EstadoRegistro.ACTIVO, EstadoRegistro.INACTIVO]).default(EstadoRegistro.ACTIVO)
});

export const updateProductoSchema = z.object({
  sku: z.string().trim().max(50).nullable().optional(),
  nombre: z.string().trim().min(2).max(100).optional(),
  categoria: z.string().trim().min(2).max(60).optional(),
  precioVentaCop: z.number().int().positive().optional(),
  costoUnitarioCop: z.number().int().nonnegative().nullable().optional(),
  stockMinimo: z.number().int().nonnegative().optional(),
  estado: z.enum([EstadoRegistro.ACTIVO, EstadoRegistro.INACTIVO]).optional()
});

export const entradaInventarioSchema = z.object({
  cantidad: z.number().int().positive('La cantidad de entrada debe ser un número entero mayor a cero (RF-INV-02)'),
  motivo: z.enum(['compra_reposicion', 'ajuste_positivo']).default('compra_reposicion'),
  costoUnitarioCop: z.number().int().nonnegative().nullable().optional(),
  observacion: z.string().trim().max(200).nullable().optional()
});

export const salidaInventarioSchema = z.object({
  cantidad: z.number().int().positive('La cantidad de salida debe ser un número entero mayor a cero (RF-INV-03)'),
  tipo: z.enum([
    SubtipoMovimientoInventario.VENTA_PUBLICO,
    'venta_al_publico',
    SubtipoMovimientoInventario.CONSUMO_INTERNO,
    SubtipoMovimientoInventario.AJUSTE_NEGATIVO
  ]).transform((val) => (val === 'venta_al_publico' ? SubtipoMovimientoInventario.VENTA_PUBLICO : val)),
  metodoPago: z.enum([
    MetodoPago.EFECTIVO,
    MetodoPago.TRANSFERENCIA_BANCARIA,
    MetodoPago.TARJETA_DEBITO_CREDITO,
    MetodoPago.NEQUI,
    MetodoPago.DAVIPLATA
  ]).nullable().optional(),
  registroCorteId: z.string().uuid().nullable().optional(),
  observacion: z.string().trim().max(200).nullable().optional()
}).refine(
  (data) => {
    // RF-INV-03: Si el tipo es venta al público, el método de pago es obligatorio
    if (data.tipo === SubtipoMovimientoInventario.VENTA_PUBLICO) {
      return data.metodoPago !== null && data.metodoPago !== undefined;
    }
    return true;
  },
  {
    message: 'Para salidas por venta al público es obligatorio seleccionar el método de pago.',
    path: ['metodoPago']
  }
);
