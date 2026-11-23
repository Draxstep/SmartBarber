/**
 * @file enums.test.js
 * @description Pruebas unitarias de las enumeraciones de dominio compartidas (isomórficas).
 * Garantiza integridad de los valores de negocio utilizados por el servidor y la PWA.
 *
 * Plan de Pruebas: Fase 1 — Nivel 1 (Unitarias)
 */
import { describe, it, expect } from 'vitest';
import {
  EstadoCita,
  EstadoCorte,
  MetodoPago,
  RolUsuario,
  OrigenCorte,
  TipoMovimientoInventario,
  SubtipoMovimientoInventario,
  EstadoNotificacion
} from '../../shared/contracts/enums.js';

describe('EstadoCita — Máquina de estados de citas (RN-07)', () => {
  it('contiene los 5 estados válidos del ciclo de vida', () => {
    expect(EstadoCita.PENDIENTE).toBe('pendiente');
    expect(EstadoCita.CONFIRMADA).toBe('confirmada');
    expect(EstadoCita.COMPLETADA).toBe('completada');
    expect(EstadoCita.CANCELADA).toBe('cancelada');
    expect(EstadoCita.NO_ASISTIO).toBe('no_asistio');
  });

  it('es inmutable (Object.freeze)', () => {
    expect(() => { EstadoCita.NUEVO = 'nuevo'; }).toThrow();
  });

  it('identifica estados terminales correctamente', () => {
    const terminales = ['completada', 'cancelada', 'no_asistio'];
    expect(terminales).toContain(EstadoCita.COMPLETADA);
    expect(terminales).toContain(EstadoCita.CANCELADA);
    expect(terminales).toContain(EstadoCita.NO_ASISTIO);
    expect(terminales).not.toContain(EstadoCita.PENDIENTE);
    expect(terminales).not.toContain(EstadoCita.CONFIRMADA);
  });
});

describe('MetodoPago — Métodos de pago aceptados en Colombia', () => {
  it('contiene los 5 métodos de pago del mercado colombiano', () => {
    expect(Object.keys(MetodoPago)).toHaveLength(5);
    expect(MetodoPago.EFECTIVO).toBe('efectivo');
    expect(MetodoPago.NEQUI).toBe('nequi');
    expect(MetodoPago.DAVIPLATA).toBe('daviplata');
    expect(MetodoPago.TRANSFERENCIA_BANCARIA).toBe('transferencia_bancaria');
    expect(MetodoPago.TARJETA_DEBITO_CREDITO).toBe('tarjeta_debito_credito');
  });
});

describe('RolUsuario — Roles RBAC del sistema', () => {
  it('define exactamente 2 roles internos (sin cliente público)', () => {
    expect(Object.keys(RolUsuario)).toHaveLength(2);
    expect(RolUsuario.ADMINISTRADOR).toBe('administrador');
    expect(RolUsuario.BARBERO).toBe('barbero');
  });
});

describe('OrigenCorte — Canal de origen de atención en caja', () => {
  it('distingue entre cita agendada y walk-in', () => {
    expect(OrigenCorte.CITA).toBe('cita');
    expect(OrigenCorte.WALK_IN).toBe('walk_in');
  });
});

describe('SubtipoMovimientoInventario — Kardex (RF-INV-02, RF-INV-03)', () => {
  it('contiene los 6 subtipos de movimiento de inventario', () => {
    expect(Object.keys(SubtipoMovimientoInventario)).toHaveLength(6);
    expect(SubtipoMovimientoInventario.INVENTARIO_INICIAL).toBe('inventario_inicial');
    expect(SubtipoMovimientoInventario.COMPRA_REPOSICION).toBe('compra_reposicion');
    expect(SubtipoMovimientoInventario.VENTA_PUBLICO).toBe('venta_publico');
    expect(SubtipoMovimientoInventario.CONSUMO_INTERNO).toBe('consumo_interno');
  });
});

describe('EstadoNotificacion — Cola Outbox de correos', () => {
  it('contiene los 3 estados del flujo transaccional', () => {
    expect(EstadoNotificacion.PENDIENTE).toBe('pendiente');
    expect(EstadoNotificacion.ENVIADA).toBe('enviada');
    expect(EstadoNotificacion.FALLIDA).toBe('fallida');
  });
});
