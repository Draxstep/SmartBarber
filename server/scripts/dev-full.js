/**
 * @file dev-full.js
 * @description Orquestador multiplataforma para desarrollo local simultáneo (Backend Express :3001 + Frontend Vite :5173).
 */
import { spawn } from 'child_process';

const npmCmd = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const children = [];
let shuttingDown = false;

function startProcess(label, scriptName) {
  const child = spawn(npmCmd, ['run', scriptName], {
    stdio: 'inherit',
    shell: process.platform === 'win32'
  });

  child.on('exit', (code, signal) => {
    if (!shuttingDown && code !== 0) {
      console.error(`\n[${label}] finalizó inesperadamente (code=${code}, signal=${signal}). Cerrando entorno...`);
      shutdown(code || 1);
    }
  });

  children.push(child);
  return child;
}

function shutdown(exitCode = 0) {
  if (shuttingDown) return;
  shuttingDown = true;

  for (const child of children) {
    if (!child.killed) {
      child.kill('SIGTERM');
    }
  }
  setTimeout(() => process.exit(exitCode), 250).unref();
}

process.on('SIGINT', () => shutdown(0));
process.on('SIGTERM', () => shutdown(0));

console.log('🚀 Iniciando entorno local completo: Backend (:3001) + Frontend Vite (:5173)...');
startProcess('backend', 'dev:server');
startProcess('frontend', 'dev');
