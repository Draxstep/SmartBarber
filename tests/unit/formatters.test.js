/**
 * @file formatters.test.js
 * @description Pruebas unitarias del módulo de formateo de SmartBarber.
 * Cubre: Moneda COP (enteros sin decimales), bloques de 30 min, zona horaria America/Bogota,
 * formato 12h y códigos de reserva SB-XXXXXX.
 *
 * Plan de Pruebas: Fase 1 — Nivel 1 (Unitarias)
 */
import { describe, it, expect } from 'vitest';
import {
  formatCOP,
  formatDurationBlocks,
  formatTime12h,
  formatBookingCode
} from '../../src/utils/formatters.js';

// ===========================================================================
// TC-UNIT-FMT: Formateador de Moneda COP ($ XX.XXX COP)
// ===========================================================================
describe('formatCOP — Formato de Pesos Colombianos (RNF-08)', () => {
  it('formatea un precio estándar de servicio en COP enteros', () => {
    expect(formatCOP(25000)).toBe('$ 25.000 COP');
  });

  it('formatea precios altos con separador de miles correcto', () => {
    expect(formatCOP(1500000)).toBe('$ 1.500.000 COP');
  });

  it('formatea el valor cero como "$ 0 COP"', () => {
    expect(formatCOP(0)).toBe('$ 0 COP');
  });

  it('redondea decimales a entero (COP no tiene centavos)', () => {
    expect(formatCOP(25000.75)).toBe('$ 25.001 COP');
    expect(formatCOP(24999.49)).toBe('$ 24.999 COP');
  });

  it('acepta strings numéricos y los parsea correctamente', () => {
    expect(formatCOP('30000')).toBe('$ 30.000 COP');
  });

  it('devuelve "$ 0 COP" para valores no numéricos', () => {
    expect(formatCOP('abc')).toBe('$ 0 COP');
    expect(formatCOP(null)).toBe('$ 0 COP');
    expect(formatCOP(undefined)).toBe('$ 0 COP');
  });

  it('formatea la suma de Corte Fade ($25.000) + Barba ($15.000) = $40.000 COP', () => {
    const corteFade = 25000;
    const barba = 15000;
    expect(formatCOP(corteFade + barba)).toBe('$ 40.000 COP');
  });
});

// ===========================================================================
// TC-UNIT-BLQ: Duración en Bloques de 30 Minutos (RN-02)
// ===========================================================================
describe('formatDurationBlocks — Duración en bloques de 30 min (RN-02)', () => {
  it('1 bloque = 30 min', () => {
    expect(formatDurationBlocks(30)).toBe('30 min (1 bloque)');
  });

  it('2 bloques = 60 min', () => {
    expect(formatDurationBlocks(60)).toBe('60 min (2 bloques)');
  });

  it('3 bloques = 90 min', () => {
    expect(formatDurationBlocks(90)).toBe('90 min (3 bloques)');
  });

  it('6 bloques = 180 min (máximo permitido)', () => {
    expect(formatDurationBlocks(180)).toBe('180 min (6 bloques)');
  });

  it('usa singular "bloque" para 1 y plural "bloques" para más de 1', () => {
    expect(formatDurationBlocks(30)).toContain('1 bloque)');
    expect(formatDurationBlocks(60)).toContain('2 bloques)');
  });

  it('redondea hacia arriba los minutos parciales', () => {
    expect(formatDurationBlocks(45)).toBe('45 min (2 bloques)');
  });

  it('devuelve "0 min (0 bloques)" para entrada nula o cero', () => {
    expect(formatDurationBlocks(0)).toBe('0 min (0 bloques)');
    expect(formatDurationBlocks(null)).toBe('0 min (0 bloques)');
  });
});

// ===========================================================================
// TC-UNIT-12H: Formato de Hora 12h AM/PM
// ===========================================================================
describe('formatTime12h — Formato de hora AM/PM para agenda', () => {
  it('formatea 09:00 como "09:00 AM"', () => {
    expect(formatTime12h('09:00')).toBe('09:00 AM');
  });

  it('formatea 09:30 como "09:30 AM"', () => {
    expect(formatTime12h('09:30')).toBe('09:30 AM');
  });

  it('formatea mediodía 12:00 como "12:00 PM"', () => {
    expect(formatTime12h('12:00')).toBe('12:00 PM');
  });

  it('formatea 14:30 como "02:30 PM"', () => {
    expect(formatTime12h('14:30')).toBe('02:30 PM');
  });

  it('formatea medianoche 00:00 como "12:00 AM"', () => {
    expect(formatTime12h('00:00')).toBe('12:00 AM');
  });

  it('acepta formato con segundos (HH:MM:SS)', () => {
    expect(formatTime12h('14:30:00')).toBe('02:30 PM');
  });

  it('devuelve string vacío para entrada nula', () => {
    expect(formatTime12h(null)).toBe('');
    expect(formatTime12h('')).toBe('');
  });
});

// ===========================================================================
// TC-UNIT-COD: Código de Reserva SB-XXXXXX
// ===========================================================================
describe('formatBookingCode — Código de reserva SB-XXXXXX (RF-AGE-06)', () => {
  it('añade el prefijo SB- si no lo tiene', () => {
    expect(formatBookingCode('ABC123')).toBe('SB-ABC123');
  });

  it('no duplica el prefijo SB- si ya existe', () => {
    expect(formatBookingCode('SB-ABC123')).toBe('SB-ABC123');
  });

  it('convierte a mayúsculas', () => {
    expect(formatBookingCode('sb-abc123')).toBe('SB-ABC123');
  });

  it('devuelve SB-000000 para entrada nula o vacía', () => {
    expect(formatBookingCode(null)).toBe('SB-000000');
    expect(formatBookingCode('')).toBe('SB-000000');
  });
});
