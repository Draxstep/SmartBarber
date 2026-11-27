/**
 * @file sync-outbox-burst.js
 * @description Prueba de ráfaga de sincronización Outbox.
 * Simula 5 instancias del Backoffice enviando operaciones acumuladas offline.
 *
 * Ejecución: k6 run tests/performance/sync-outbox-burst.js
 *
 * Plan de Pruebas: Fase 3 — Nivel 4 (Rendimiento k6)
 */
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

const errorRate = new Rate('errors');

export const options = {
  scenarios: {
    rafaga_outbox: {
      executor: 'per-vu-iterations',
      vus: 5,
      iterations: 3,
      maxDuration: '1m',
    },
  },
  thresholds: {
    'errors': ['rate<0.05'],
    'http_req_duration': ['p(95)<2000'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3001';

export default function () {
  const payload = JSON.stringify({
    idCambio: `test-${__VU}-${__ITER}-${Date.now()}`,
    tipo: 'walk_in',
    datos: {
      servicioIds: [],
      metodoPago: 'efectivo',
      notas: 'Prueba de carga outbox sync'
    },
    creadoEn: new Date().toISOString()
  });

  const params = {
    headers: {
      'Content-Type': 'application/json',
    },
  };

  const res = http.post(`${BASE_URL}/api/v1/sync/outbox`, payload, params);

  const passed = check(res, {
    'sync no da error 500': (r) => r.status !== 500,
    'sync responde en tiempo': (r) => r.timings.duration < 2000,
  });

  errorRate.add(!passed);

  sleep(0.5);
}
