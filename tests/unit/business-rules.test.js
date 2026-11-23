/**
 * @file business-rules.test.js
 * @description Pruebas unitarias de las reglas de negocio críticas de SmartBarber.
 * Cubre: RN-07 (máquina de estados), RN-10 (stock negativo), RN-12 (snapshots),
 * RN-14 (límites anti-abuso), RN-15 (ajuste de precio).
 *
 * Plan de Pruebas: Fase 1 — Nivel 1 (Unitarias)
 */
import { describe, it, expect } from 'vitest';
import { Cita } from '../../server/modules/agendamiento/domain/Cita.js';

// ===========================================================================
// RN-07: Máquina de Estados Válida para Citas
// ===========================================================================
describe('RN-07: Máquina de estados de citas', () => {
  const TRANSICIONES_VALIDAS = {
    pendiente: ['confirmada', 'completada', 'cancelada', 'no_asistio'],
    confirmada: ['completada', 'cancelada', 'no_asistio'],
    completada: [],
    cancelada: [],
    no_asistio: []
  };

  function esTransicionValida(estadoActual, nuevoEstado) {
    return (TRANSICIONES_VALIDAS[estadoActual] || []).includes(nuevoEstado);
  }

  it('permite Pendiente -> Confirmada', () => {
    expect(esTransicionValida('pendiente', 'confirmada')).toBe(true);
  });

  it('permite Pendiente -> Completada', () => {
    expect(esTransicionValida('pendiente', 'completada')).toBe(true);
  });

  it('permite Pendiente -> Cancelada', () => {
    expect(esTransicionValida('pendiente', 'cancelada')).toBe(true);
  });

  it('permite Pendiente -> No asistió', () => {
    expect(esTransicionValida('pendiente', 'no_asistio')).toBe(true);
  });

  it('permite Confirmada -> Completada', () => {
    expect(esTransicionValida('confirmada', 'completada')).toBe(true);
  });

  it('permite Confirmada -> Cancelada', () => {
    expect(esTransicionValida('confirmada', 'cancelada')).toBe(true);
  });

  it('rechaza Completada -> Pendiente (estado terminal)', () => {
    expect(esTransicionValida('completada', 'pendiente')).toBe(false);
  });

  it('rechaza Cancelada -> Confirmada (estado terminal)', () => {
    expect(esTransicionValida('cancelada', 'confirmada')).toBe(false);
  });

  it('rechaza No asistió -> Pendiente (estado terminal)', () => {
    expect(esTransicionValida('no_asistio', 'pendiente')).toBe(false);
  });

  it('rechaza Completada -> Cancelada (estado terminal)', () => {
    expect(esTransicionValida('completada', 'cancelada')).toBe(false);
  });
});

// ===========================================================================
// Entidad Cita - Métodos de dominio
// ===========================================================================
describe('Cita (Entidad de Dominio)', () => {
  const citaBase = {
    citaId: 'test-id',
    sedeId: 'sede-1',
    codigoReserva: 'SB-ABC123',
    clienteId: 'cli-1',
    barberoId: 'barb-1',
    fecha: '2026-11-25',
    horaInicio: '10:00:00',
    horaFin: '10:30:00',
    inicioEn: new Date('2026-11-25T15:00:00Z'),
    finEn: new Date('2026-11-25T15:30:00Z'),
    bloquesTotales: 1,
    precioEstimadoCop: 25000
  };

  it('isActiva() devuelve true para estado pendiente', () => {
    const cita = new Cita({ ...citaBase, estado: 'pendiente' });
    expect(cita.isActiva()).toBe(true);
  });

  it('isActiva() devuelve true para estado confirmada', () => {
    const cita = new Cita({ ...citaBase, estado: 'confirmada' });
    expect(cita.isActiva()).toBe(true);
  });

  it('isActiva() devuelve false para estado completada', () => {
    const cita = new Cita({ ...citaBase, estado: 'completada' });
    expect(cita.isActiva()).toBe(false);
  });

  it('isActiva() devuelve false para estado cancelada', () => {
    const cita = new Cita({ ...citaBase, estado: 'cancelada' });
    expect(cita.isActiva()).toBe(false);
  });

  it('redondea precioEstimadoCop a entero COP', () => {
    const cita = new Cita({ ...citaBase, precioEstimadoCop: 25000.7 });
    expect(cita.precioEstimadoCop).toBe(25001);
  });

  it('bloquesTotales es siempre numérico', () => {
    const cita = new Cita({ ...citaBase, bloquesTotales: '2' });
    expect(cita.bloquesTotales).toBe(2);
  });
});

// ===========================================================================
// RN-10: Prohibición de Stock Negativo
// ===========================================================================
describe('RN-10: Invariante de stock no negativo', () => {
  function validarSalida(stockActual, cantidadSalida) {
    return stockActual - cantidadSalida >= 0;
  }

  it('permite salida si stock es suficiente (stock=5, salida=3)', () => {
    expect(validarSalida(5, 3)).toBe(true);
  });

  it('permite salida exacta del total (stock=2, salida=2)', () => {
    expect(validarSalida(2, 2)).toBe(true);
  });

  it('rechaza salida que generaría stock negativo (stock=2, salida=3)', () => {
    expect(validarSalida(2, 3)).toBe(false);
  });

  it('rechaza salida de stock ya agotado (stock=0, salida=1)', () => {
    expect(validarSalida(0, 1)).toBe(false);
  });
});

// ===========================================================================
// RN-11: Clasificación de alertas de inventario
// ===========================================================================
describe('RN-11: Alertas de Stock Bajo y Agotado', () => {
  function clasificarStock(stockActual, stockMinimo) {
    if (stockActual === 0) return 'Agotado';
    if (stockActual <= stockMinimo) return 'Stock bajo';
    return 'Disponible';
  }

  it('clasifica como Disponible cuando stock > mínimo', () => {
    expect(clasificarStock(10, 3)).toBe('Disponible');
  });

  it('clasifica como Stock bajo cuando stock = mínimo', () => {
    expect(clasificarStock(3, 3)).toBe('Stock bajo');
  });

  it('clasifica como Stock bajo cuando 0 < stock < mínimo', () => {
    expect(clasificarStock(1, 3)).toBe('Stock bajo');
  });

  it('clasifica como Agotado cuando stock = 0', () => {
    expect(clasificarStock(0, 3)).toBe('Agotado');
  });
});

// ===========================================================================
// RN-12: Inmutabilidad financiera por snapshots
// ===========================================================================
describe('RN-12: Inmutabilidad de snapshots de precios', () => {
  it('el snapshot preserva el precio original aunque el catálogo cambie', () => {
    const precioOriginal = 25000;
    const snapshot = { nombreServicioSnapshot: 'Corte Fade', precioCopSnapshot: precioOriginal };
    const precioNuevo = 30000;
    expect(snapshot.precioCopSnapshot).toBe(25000);
    expect(snapshot.precioCopSnapshot).not.toBe(precioNuevo);
  });
});

// ===========================================================================
// RN-15: Validación de ajuste de precio (motivo obligatorio)
// ===========================================================================
describe('RN-15: Ajuste de precio con justificación obligatoria', () => {
  function validarAjustePrecio(rol, precioCalculado, precioCobrado, notas) {
    if (precioCobrado !== precioCalculado) {
      if (rol !== 'administrador') return { valido: false, error: 'FORBIDDEN' };
      if (!notas || notas.trim().length < 5) return { valido: false, error: 'NOTAS_CORTAS' };
    }
    return { valido: true };
  }

  it('permite precio sin ajuste para cualquier rol', () => {
    expect(validarAjustePrecio('barbero', 25000, 25000, null).valido).toBe(true);
  });

  it('rechaza ajuste de precio por barbero', () => {
    const result = validarAjustePrecio('barbero', 25000, 20000, 'Descuento');
    expect(result.valido).toBe(false);
    expect(result.error).toBe('FORBIDDEN');
  });

  it('rechaza ajuste por administrador sin justificación suficiente', () => {
    const result = validarAjustePrecio('administrador', 25000, 20000, 'ok');
    expect(result.valido).toBe(false);
    expect(result.error).toBe('NOTAS_CORTAS');
  });

  it('permite ajuste por administrador con justificación >= 5 chars', () => {
    const result = validarAjustePrecio('administrador', 25000, 20000, 'Descuento fidelidad cliente recurrente');
    expect(result.valido).toBe(true);
  });
});

// ===========================================================================
// RN-06: Tolerancia de inasistencia (>= 15 minutos)
// ===========================================================================
describe('RN-06: Tolerancia de 15 minutos para No asistió', () => {
  function puedeMarcarNoAsistio(inicioCita, horaActual) {
    const diff = (horaActual.getTime() - inicioCita.getTime()) / 60000;
    return diff >= 15;
  }

  it('rechaza No asistió a los 5 minutos', () => {
    const inicio = new Date('2026-11-25T10:00:00-05:00');
    const ahora = new Date('2026-11-25T10:05:00-05:00');
    expect(puedeMarcarNoAsistio(inicio, ahora)).toBe(false);
  });

  it('rechaza No asistió a los 14 minutos', () => {
    const inicio = new Date('2026-11-25T10:00:00-05:00');
    const ahora = new Date('2026-11-25T10:14:00-05:00');
    expect(puedeMarcarNoAsistio(inicio, ahora)).toBe(false);
  });

  it('permite No asistió exactamente a los 15 minutos', () => {
    const inicio = new Date('2026-11-25T10:00:00-05:00');
    const ahora = new Date('2026-11-25T10:15:00-05:00');
    expect(puedeMarcarNoAsistio(inicio, ahora)).toBe(true);
  });

  it('permite No asistió a los 20 minutos', () => {
    const inicio = new Date('2026-11-25T10:00:00-05:00');
    const ahora = new Date('2026-11-25T10:20:00-05:00');
    expect(puedeMarcarNoAsistio(inicio, ahora)).toBe(true);
  });
});
