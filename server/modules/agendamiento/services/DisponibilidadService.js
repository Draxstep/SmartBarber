/**
 * @file DisponibilidadService.js
 * @description Motor de cálculo y validación de bloques horarios discretos de 30 minutos (CU-025, RF-AGE-04, RN-01 a RN-04).
 */
import { getDatabasePool } from '../../../shared/database/connection.js';
import { SedePgRepository } from '../../sedes/repositories/SedePgRepository.js';
import { BarberoPgRepository } from '../../barberos/repositories/BarberoPgRepository.js';
import { ValidationError } from '../../../shared/errors/domainErrors.js';

export class DisponibilidadService {
  constructor(pool = null, sedeRepo = null, barberoRepo = null) {
    this.pool = pool || getDatabasePool();
    this.sedeRepo = sedeRepo || new SedePgRepository();
    this.barberoRepo = barberoRepo || new BarberoPgRepository();
  }

  /**
   * Convierte 'HH:MM:SS' o 'HH:MM' a minutos desde las 00:00
   */
  timeToMinutes(timeStr) {
    if (!timeStr) return 0;
    const parts = timeStr.split(':');
    return parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
  }

  /**
   * Convierte minutos desde las 00:00 a formato 'HH:MM'
   */
  minutesToTime(totalMinutes) {
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
  }

  /**
   * Obtiene el día de la semana ISO (1=Lunes, 7=Domingo) para una fecha YYYY-MM-DD
   */
  getDiaSemanaIso(fechaStr) {
    const [year, month, day] = fechaStr.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    const dayOfWeek = date.getDay(); // 0=Domingo
    return dayOfWeek === 0 ? 7 : dayOfWeek;
  }

  /**
   * Calcula los horarios de inicio disponibles para una fecha y duración dada.
   */
  async calcularDisponibilidad({
    sedeId = null,
    fecha,
    duracionBloques = 1,
    barberoId = null
  }) {
    // 1. Validar ventana temporal (RN-03)
    const sede = sedeId ? await this.sedeRepo.findById(sedeId) : await this.sedeRepo.findPrincipal();
    const diasMax = sede?.diasMaxAnticipacion || 30;
    const minAnticipacionMin = sede?.minutosMinAnticipacion || 30;

    // Fecha actual en hora de Colombia (UTC-5)
    const nowUtc = new Date();
    const nowBogota = new Date(nowUtc.getTime() - 5 * 60 * 60 * 1000);
    const todayStr = nowBogota.toISOString().slice(0, 10);
    const currentMinutesToday = nowBogota.getUTCHours() * 60 + nowBogota.getUTCMinutes();

    if (fecha < todayStr) {
      throw new ValidationError('No es posible consultar ni agendar citas en fechas pasadas.');
    }

    const maxDate = new Date(nowBogota);
    maxDate.setDate(maxDate.getDate() + diasMax);
    const maxDateStr = maxDate.toISOString().slice(0, 10);

    if (fecha > maxDateStr) {
      throw new ValidationError(`La fecha solicitada supera la ventana máxima de ${diasMax} días permitidos.`);
    }

    const duracionMinutos = duracionBloques * 30;
    const diaSemana = this.getDiaSemanaIso(fecha);

    // 2. Determinar barberos a evaluar
    let barberos = [];
    if (barberoId && barberoId !== 'cualquiera') {
      const b = await this.barberoRepo.findById(barberoId);
      if (b && b.estado === 'activo') barberos.push(b);
    } else {
      barberos = await this.barberoRepo.findBySede(sede.sedeId, { activosSolo: true });
    }

    if (barberos.length === 0) {
      return {
        fecha,
        duracionBloques,
        horariosDisponibles: [],
        porBarbero: {}
      };
    }

    const disponibilidadPorBarbero = {};
    const todosHorariosSet = new Set();

    for (const barbero of barberos) {
      const slotsLibres = await this.calcularSlotsParaBarbero({
        barberoId: barbero.barberoId,
        fecha,
        diaSemana,
        duracionMinutos,
        isToday: fecha === todayStr,
        currentMinutesToday,
        minAnticipacionMin
      });

      disponibilidadPorBarbero[barbero.barberoId] = slotsLibres;
      for (const slot of slotsLibres) {
        todosHorariosSet.add(slot);
      }
    }

    // Ordenar cronológicamente los horarios disponibles
    const horariosDisponibles = Array.from(todosHorariosSet).sort();

    return {
      fecha,
      duracionBloques,
      duracionMinutos,
      horariosDisponibles,
      porBarbero: disponibilidadPorBarbero
    };
  }

  /**
   * Evalúa disponibilidad para un barbero individual en una fecha específica.
   */
  async calcularSlotsParaBarbero({
    barberoId,
    fecha,
    diaSemana,
    duracionMinutos,
    isToday,
    currentMinutesToday,
    minAnticipacionMin
  }) {
    // A. Consultar turnos laborales
    const horarios = await this.barberoRepo.getHorariosByBarbero(barberoId);
    const franjasDia = horarios.filter((h) => h.diaSemana === diaSemana && !h.esDescanso);

    if (franjasDia.length === 0) {
      return []; // Día de descanso o sin horario configurado
    }

    // B. Consultar citas activas del día
    const citasRes = await this.pool.query(
      `SELECT hora_inicio, hora_fin 
       FROM citas 
       WHERE barbero_id = $1 AND fecha = $2 AND estado IN ('pendiente', 'confirmada')`,
      [barberoId, fecha]
    );

    const citasRangos = citasRes.rows.map((r) => ({
      inicio: this.timeToMinutes(r.hora_inicio),
      fin: this.timeToMinutes(r.hora_fin)
    }));

    // C. Consultar bloqueos puntuales
    const bloqueosRes = await this.pool.query(
      `SELECT dia_completo, hora_inicio, hora_fin 
       FROM bloqueos_horarios 
       WHERE barbero_id = $1 AND fecha = $2 AND activo = true`,
      [barberoId, fecha]
    );

    if (bloqueosRes.rows.some((b) => b.dia_completo)) {
      return []; // Día completo bloqueado
    }

    const bloqueosRangos = bloqueosRes.rows.map((b) => ({
      inicio: this.timeToMinutes(b.hora_inicio),
      fin: this.timeToMinutes(b.hora_fin)
    }));

    const slotsValidos = [];

    // D. Probar cada bloque de 30 minutos dentro de cada franja laboral
    for (const franja of franjasDia) {
      const franjaInicioMin = this.timeToMinutes(franja.horaInicio);
      const franjaFinMin = this.timeToMinutes(franja.horaFin);

      // El último inicio posible debe permitir completar la duración dentro de la franja
      for (let inicioMin = franjaInicioMin; inicioMin + duracionMinutos <= franjaFinMin; inicioMin += 30) {
        const finMin = inicioMin + duracionMinutos;

        // Validar antelación mínima si es hoy (RN-03)
        if (isToday && inicioMin < currentMinutesToday + minAnticipacionMin) {
          continue;
        }

        // Validar solapamiento con citas existentes (RN-01)
        const solapaCita = citasRangos.some((c) => inicioMin < c.fin && finMin > c.inicio);
        if (solapaCita) continue;

        // Validar solapamiento con bloqueos puntuales
        const solapaBloqueo = bloqueosRangos.some((b) => inicioMin < b.fin && finMin > b.inicio);
        if (solapaBloqueo) continue;

        slotsValidos.push(this.minutesToTime(inicioMin));
      }
    }

    return slotsValidos;
  }
}
