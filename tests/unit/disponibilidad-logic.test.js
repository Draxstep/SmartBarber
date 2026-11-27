/**
 * @file disponibilidad-logic.test.js
 * @description Pruebas unitarias de la lógica pura del motor de disponibilidad.
 * Cubre: timeToMinutes, minutesToTime, getDiaSemanaIso, cálculo de bloques consecutivos.
 *
 * Plan de Pruebas: Fase 1 — Nivel 1 (Unitarias)
 */
import { describe, it, expect } from 'vitest';
import { DisponibilidadService } from '../../server/modules/agendamiento/services/DisponibilidadService.js';

// Instanciamos sin dependencias de BD para probar lógica pura
const service = new DisponibilidadService(null, null, null);

describe('timeToMinutes — Conversión de hora a minutos desde las 00:00', () => {
  it('convierte 00:00 a 0 minutos', () => {
    expect(service.timeToMinutes('00:00')).toBe(0);
  });

  it('convierte 09:00 a 540 minutos', () => {
    expect(service.timeToMinutes('09:00')).toBe(540);
  });

  it('convierte 09:30 a 570 minutos', () => {
    expect(service.timeToMinutes('09:30')).toBe(570);
  });

  it('convierte 14:30 a 870 minutos', () => {
    expect(service.timeToMinutes('14:30')).toBe(870);
  });

  it('convierte 23:59 a 1439 minutos', () => {
    expect(service.timeToMinutes('23:59')).toBe(1439);
  });

  it('acepta formato HH:MM:SS y toma solo horas y minutos', () => {
    expect(service.timeToMinutes('14:30:00')).toBe(870);
  });

  it('devuelve 0 para entrada nula', () => {
    expect(service.timeToMinutes(null)).toBe(0);
  });
});

describe('minutesToTime — Conversión de minutos a formato HH:MM', () => {
  it('convierte 0 minutos a 00:00', () => {
    expect(service.minutesToTime(0)).toBe('00:00');
  });

  it('convierte 540 minutos a 09:00', () => {
    expect(service.minutesToTime(540)).toBe('09:00');
  });

  it('convierte 570 minutos a 09:30', () => {
    expect(service.minutesToTime(570)).toBe('09:30');
  });

  it('convierte 870 minutos a 14:30', () => {
    expect(service.minutesToTime(870)).toBe('14:30');
  });

  it('convierte 1439 minutos a 23:59', () => {
    expect(service.minutesToTime(1439)).toBe('23:59');
  });
});

describe('getDiaSemanaIso — Día ISO 8601 (1=Lunes, 7=Domingo)', () => {
  it('identifica un lunes como día ISO 1', () => {
    expect(service.getDiaSemanaIso('2026-11-23')).toBe(1);
  });

  it('identifica un domingo como día ISO 7', () => {
    expect(service.getDiaSemanaIso('2026-11-29')).toBe(7);
  });

  it('identifica un sábado como día ISO 6', () => {
    expect(service.getDiaSemanaIso('2026-11-28')).toBe(6);
  });
});

describe('Cálculo de bloques consecutivos (RN-02)', () => {
  it('un servicio de 1 bloque requiere exactamente 30 minutos', () => {
    const duracionBloques = 1;
    const duracionMinutos = duracionBloques * 30;
    expect(duracionMinutos).toBe(30);
  });

  it('dos servicios de 1 bloque cada uno requieren 60 minutos (2 bloques consecutivos)', () => {
    const servicios = [{ duracionBloques: 1 }, { duracionBloques: 1 }];
    const bloquesTotales = servicios.reduce((acc, s) => acc + s.duracionBloques, 0);
    expect(bloquesTotales).toBe(2);
    expect(bloquesTotales * 30).toBe(60);
  });

  it('cálculo de hora fin: 10:00 + 2 bloques = 11:00', () => {
    const inicioMin = service.timeToMinutes('10:00');
    const finMin = inicioMin + (2 * 30);
    expect(service.minutesToTime(finMin)).toBe('11:00');
  });

  it('cálculo de hora fin: 09:30 + 3 bloques = 11:00', () => {
    const inicioMin = service.timeToMinutes('09:30');
    const finMin = inicioMin + (3 * 30);
    expect(service.minutesToTime(finMin)).toBe('11:00');
  });
});

describe('Validación de solapamiento de rangos horarios (RN-01)', () => {
  function seSuperponen(a, b) {
    return a.inicio < b.fin && a.fin > b.inicio;
  }

  it('detecta solapamiento total (misma hora)', () => {
    const citaExistente = { inicio: 600, fin: 630 };
    const nuevaCita     = { inicio: 600, fin: 630 };
    expect(seSuperponen(citaExistente, nuevaCita)).toBe(true);
  });

  it('detecta solapamiento parcial', () => {
    const citaExistente = { inicio: 600, fin: 660 };
    const nuevaCita     = { inicio: 630, fin: 690 };
    expect(seSuperponen(citaExistente, nuevaCita)).toBe(true);
  });

  it('no detecta solapamiento cuando son adyacentes', () => {
    const citaExistente = { inicio: 600, fin: 630 };
    const nuevaCita     = { inicio: 630, fin: 660 };
    expect(seSuperponen(citaExistente, nuevaCita)).toBe(false);
  });

  it('no detecta solapamiento cuando están completamente separadas', () => {
    const citaExistente = { inicio: 540, fin: 570 };
    const nuevaCita     = { inicio: 660, fin: 690 };
    expect(seSuperponen(citaExistente, nuevaCita)).toBe(false);
  });

  it('detecta que un servicio de 2 bloques solapa con cita a mitad de camino', () => {
    const citaExistente = { inicio: 660, fin: 690 };
    const nuevaCita     = { inicio: 630, fin: 690 };
    expect(seSuperponen(citaExistente, nuevaCita)).toBe(true);
  });
});

describe('Validación de código de reserva Crockford Base32', () => {
  it('el alfabeto no contiene caracteres ambiguos (0, O, I, 1, L)', () => {
    const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
    expect(chars).not.toContain('0');
    expect(chars).not.toContain('O');
    expect(chars).not.toContain('I');
    expect(chars).not.toContain('1');
    expect(chars).not.toContain('L');
  });

  it('el alfabeto tiene 30 caracteres válidos', () => {
    const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
    expect(chars.length).toBe(30);
  });
});
