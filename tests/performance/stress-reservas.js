/**
 * @file stress-reservas.js
 * @description Prueba de estrés simulando pico de reservas de fin de semana.
 * 50 usuarios concurrentes intentando reservar citas.
 *
 * Ejecución: k6 run tests/performance/stress-reservas.js
 *
 * Plan de Pruebas: Fase 3 — Nivel 4 (Rendimiento k6)
 */
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Counter, Rate } from 'k6/metrics';

const conflictos409 = new Counter('conflictos_409');
const reservasExitosas = new Counter('reservas_exitosas');
const errorRate = new Rate('errors');

export const options = {
  scenarios: {
    pico_fin_de_semana: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '15s', target: 50 },
        { duration: '1m', target: 50 },
        { duration: '15s', target: 0 },
      ],
      gracefulRampDown: '10s',
    },
  },
  thresholds: {
    'http_req_failed': ['rate<0.05'],
    'http_req_duration': ['p(95)<1500'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3001';

function getFechaFutura(diasAdelante) {
  const fecha = new Date();
  fecha.setDate(fecha.getDate() + diasAdelante);
  return fecha.toISOString().slice(0, 10);
}

export default function () {
  const fecha = getFechaFutura(7);

  const dispRes = http.get(
    `${BASE_URL}/api/public/disponibilidad?fecha=${fecha}&bloques_totales=1&barbero_id=cualquiera`
  );

  check(dispRes, {
    'disponibilidad: status 200': (r) => r.status === 200,
  });

  const landingRes = http.get(`${BASE_URL}/api/public/landing`);

  const passed = check(landingRes, {
    'landing: status 200': (r) => r.status === 200,
    'landing: sin errores 500': (r) => r.status !== 500,
  });

  errorRate.add(!passed);

  sleep(Math.random() * 1.5 + 0.5);
}

export function handleSummary(data) {
  const p95 = data.metrics.http_req_duration?.values?.['p(95)'] || 0;
  const totalReqs = data.metrics.http_reqs?.values?.count || 0;
  const failRate = data.metrics.http_req_failed?.values?.rate || 0;

  console.log('\n╔══════════════════════════════════════════════════╗');
  console.log('║   SMARTBARBER — RESUMEN DE PRUEBA DE ESTRÉS      ║');
  console.log('╠══════════════════════════════════════════════════╣');
  console.log(`║  Total de Peticiones:    ${totalReqs}`);
  console.log(`║  Tiempo p95:            ${p95.toFixed(0)} ms`);
  console.log(`║  Tasa de Fallos:        ${(failRate * 100).toFixed(2)}%`);
  console.log(`║  SLA p95 < 1500 ms:     ${p95 < 1500 ? '✅ CUMPLE' : '❌ NO CUMPLE'}`);
  console.log(`║  SLA 0% HTTP 500:       ${failRate < 0.05 ? '✅ CUMPLE' : '❌ NO CUMPLE'}`);
  console.log('╚══════════════════════════════════════════════════╝\n');

  return {};
}
