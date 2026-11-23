/**
 * @file load-disponibilidad.js
 * @description Prueba de carga del endpoint de disponibilidad (GET /api/public/disponibilidad).
 * SLA exigido: p95 < 500 ms (RNF-02)
 *
 * Ejecución: k6 run tests/performance/load-disponibilidad.js
 *
 * Plan de Pruebas: Fase 3 — Nivel 4 (Rendimiento k6)
 */
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

const errorRate = new Rate('errors');
const disponibilidadDuration = new Trend('disponibilidad_duration', true);

export const options = {
  scenarios: {
    carga_normal: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '30s', target: 15 },
        { duration: '2m', target: 15 },
        { duration: '30s', target: 0 },
      ],
      gracefulRampDown: '10s',
    },
  },
  thresholds: {
    'disponibilidad_duration': ['p(95)<500'],
    'errors': ['rate<0.01'],
    'http_req_duration': ['p(95)<1000'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3001';

function getFechaFutura(diasAdelante) {
  const fecha = new Date();
  fecha.setDate(fecha.getDate() + diasAdelante);
  return fecha.toISOString().slice(0, 10);
}

export default function () {
  const diasAdelante = Math.floor(Math.random() * 14) + 1;
  const fecha = getFechaFutura(diasAdelante);
  const bloques = Math.floor(Math.random() * 3) + 1;

  const url = `${BASE_URL}/api/public/disponibilidad?fecha=${fecha}&bloques_totales=${bloques}&barbero_id=cualquiera`;

  const res = http.get(url, {
    tags: { endpoint: 'disponibilidad' },
  });

  disponibilidadDuration.add(res.timings.duration);

  const passed = check(res, {
    'status es 200': (r) => r.status === 200,
    'respuesta es JSON': (r) => {
      try { JSON.parse(r.body); return true; } catch { return false; }
    },
    'tiempo < 500ms (SLA RNF-02)': (r) => r.timings.duration < 500,
  });

  errorRate.add(!passed);

  sleep(Math.random() * 2 + 0.5);
}
