/**
 * @file CitaService.js
 * @description Servicio de aplicación para agendamiento público, gestión de citas y ciclo de vida (CU-021 a CU-024).
 */
import { Cita } from '../domain/Cita.js';
import { Cliente } from '../../clientes/domain/Cliente.js';
import { CitaPgRepository } from '../repositories/CitaPgRepository.js';
import { ClientePgRepository } from '../../clientes/repositories/ClientePgRepository.js';
import { ServicioPgRepository } from '../../servicios/repositories/ServicioPgRepository.js';
import { BarberoPgRepository } from '../../barberos/repositories/BarberoPgRepository.js';
import { SedePgRepository } from '../../sedes/repositories/SedePgRepository.js';
import { DisponibilidadService } from './DisponibilidadService.js';
import { EmailService } from './EmailService.js';
import {
  NotFoundError,
  ValidationError,
  ConflictError,
  ForbiddenError
} from '../../../shared/errors/domainErrors.js';

export class CitaService {
  constructor(
    citaRepo = null,
    clienteRepo = null,
    servicioRepo = null,
    barberoRepo = null,
    sedeRepo = null,
    disponibilidadService = null,
    emailService = null
  ) {
    this.citaRepo = citaRepo || new CitaPgRepository();
    this.clienteRepo = clienteRepo || new ClientePgRepository();
    this.servicioRepo = servicioRepo || new ServicioPgRepository();
    this.barberoRepo = barberoRepo || new BarberoPgRepository();
    this.sedeRepo = sedeRepo || new SedePgRepository();
    this.disponibilidadService = disponibilidadService || new DisponibilidadService();
    this.emailService = emailService || new EmailService();
  }

  /**
   * Genera un código de reserva único con alfabeto Crockford Base32 (SB-XXXXXX)
   */
  generarCodigoReserva() {
    const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
    let code = 'SB-';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }

  /**
   * Agendamiento en línea desde la Landing Page (CU-021, RF-AGE-02 a 06).
   */
  async crearReservaPublica(dto) {
    // 1. Detección anti-bots por trampa honeypot (RNF-11)
    if (dto._hp && dto._hp.length > 0) {
      return { codigoReserva: 'SB-OKBOT0', estado: 'pendiente' };
    }

    const sede = dto.sedeId ? await this.sedeRepo.findById(dto.sedeId) : await this.sedeRepo.findPrincipal();
    if (!sede) throw new NotFoundError('Sede', 'principal');

    // 2. Cargar y validar servicios seleccionados
    const servicios = await this.servicioRepo.findByIds(dto.servicioIds);
    if (servicios.length === 0) {
      throw new ValidationError('Debe seleccionar al menos un servicio válido del catálogo.');
    }

    const bloquesTotales = servicios.reduce((acc, s) => acc + s.duracionBloques, 0);
    const precioEstimadoCop = servicios.reduce((acc, s) => acc + s.precioCop, 0);
    const duracionMinutos = bloquesTotales * 30;

    // Calcular hora de fin
    const inicioMin = this.disponibilidadService.timeToMinutes(dto.horaInicio);
    const finMin = inicioMin + duracionMinutos;
    const horaFin = this.disponibilidadService.minutesToTime(finMin);

    // Fechas ISO UTC (Bogotá = UTC-5)
    const inicioEn = `${dto.fecha}T${dto.horaInicio.slice(0, 5)}:00-05:00`;
    const finEn = `${dto.fecha}T${horaFin}:00-05:00`;

    // 3. Crear o actualizar cliente (sin contraseña, RN-14)
    const clienteEntity = new Cliente({
      sedeId: sede.sedeId,
      nombreCompleto: dto.cliente.nombreCompleto,
      telefonoWhatsapp: dto.cliente.telefono,
      correo: dto.cliente.correo.toLowerCase().trim(),
      aceptoPoliticaDatosEn: new Date()
    });
    const clientePersistido = await this.clienteRepo.upsert(clienteEntity);

    // 4. Validar límites anti-abuso de citas (RN-14)
    const citasMismoDia = await this.citaRepo.countCitasActivasClienteFecha(
      clientePersistido.clienteId,
      dto.fecha
    );
    if (citasMismoDia >= 2) {
      throw new ValidationError(
        'Ha superado el límite de 2 citas activas para una misma fecha. Si requiere atención adicional por favor contáctenos.'
      );
    }

    const citasFuturas = await this.citaRepo.countCitasFuturasActivasCliente(clientePersistido.clienteId);
    if (citasFuturas >= 3) {
      throw new ValidationError(
        'Ha alcanzado el límite máximo de 3 citas futuras activas en el sistema.'
      );
    }

    // 5. Asignación de barbero (específico o "Cualquier barbero disponible" RN-04)
    let barberoFinalId = dto.barberoId;
    let barberoAsignadoAutomaticamente = false;

    if (!barberoFinalId || barberoFinalId === 'cualquiera') {
      const disp = await this.disponibilidadService.calcularDisponibilidad({
        sedeId: sede.sedeId,
        fecha: dto.fecha,
        duracionBloques: bloquesTotales,
        barberoId: null
      });

      // Filtrar barberos que tengan el slot disponible
      const barberosCandidatos = Object.entries(disp.porBarbero)
        .filter(([_, slots]) => slots.includes(dto.horaInicio.slice(0, 5)))
        .map(([id]) => id);

      if (barberosCandidatos.length === 0) {
        throw new ConflictError(
          'El horario seleccionado acaba de ser ocupado. Por favor elija otro horario disponible.'
        );
      }

      // Balanceo de carga (RN-04): priorizar al de menor cantidad de bloques en el día
      const barberosConCarga = [];
      for (const bId of barberosCandidatos) {
        const barberoObj = await this.barberoRepo.findById(bId);
        const citasExistentes = await this.citaRepo.findAgenda({
          sedeId: sede.sedeId,
          fecha: dto.fecha,
          barberoId: bId
        });
        const cargaBloques = citasExistentes
          .filter((c) => ['pendiente', 'confirmada'].includes(c.estado))
          .reduce((sum, c) => sum + (c.bloquesTotales || 1), 0);

        barberosConCarga.push({
          id: bId,
          nombre: barberoObj.nombreCompleto,
          carga: cargaBloques
        });
      }

      // Ordenar por menor carga, desempate por nombre alfabético
      barberosConCarga.sort((a, b) => a.carga - b.carga || a.nombre.localeCompare(b.nombre));
      barberoFinalId = barberosConCarga[0].id;
      barberoAsignadoAutomaticamente = true;
    }

    const barberoAsignado = await this.barberoRepo.findById(barberoFinalId);
    if (!barberoAsignado || barberoAsignado.estado !== 'activo') {
      throw new ValidationError('El barbero asignado no se encuentra disponible.');
    }

    // 6. Generar código de reserva y armar entidades
    const codigoReserva = this.generarCodigoReserva();
    const estadoInicial = sede.estadoInicialCita || 'pendiente';

    const nuevaCita = new Cita({
      sedeId: sede.sedeId,
      clienteId: clientePersistido.clienteId,
      barberoId: barberoFinalId,
      barberoAsignadoAutomaticamente,
      codigoReserva,
      fecha: dto.fecha,
      horaInicio: `${dto.horaInicio.slice(0, 5)}:00`,
      horaFin: `${horaFin}:00`,
      inicioEn: new Date(inicioEn),
      finEn: new Date(finEn),
      bloquesTotales,
      precioEstimadoCop,
      estado: estadoInicial,
      notasCliente: dto.notasCliente || null,
      origen: 'landing'
    });

    const serviciosSnapshots = servicios.map((s) => ({
      servicioId: s.servicioId,
      nombreServicioSnapshot: s.nombre,
      precioCopSnapshot: s.precioCop,
      duracionBloquesSnapshot: s.duracionBloques
    }));

    // 7. Persistir en transacción atómica (con índice GiST contra solapamiento)
    const citaGuardada = await this.citaRepo.createWithServices(nuevaCita, serviciosSnapshots);

    // 8. Despacho asíncrono de correo de confirmación (RF-AGE-06)
    this.emailService
      .enviarConfirmacionReserva({
        correoDestino: clientePersistido.correo,
        nombreCliente: clientePersistido.nombreCompleto,
        codigoReserva,
        fecha: dto.fecha,
        horaInicio: dto.horaInicio.slice(0, 5),
        horaFin,
        barberoNombre: barberoAsignado.nombreCompleto,
        servicios: serviciosSnapshots,
        precioTotalCop: precioEstimadoCop,
        direccionSede: sede.direccionFisica
      })
      .catch((err) => console.error('Error al despachar notificación de confirmación:', err));

    return {
      citaId: citaGuardada.citaId,
      codigoReserva: citaGuardada.codigoReserva,
      estado: citaGuardada.estado,
      fecha: citaGuardada.fecha,
      horaInicio: dto.horaInicio.slice(0, 5),
      horaFin,
      barbero: {
        id: barberoAsignado.barberoId,
        nombre: barberoAsignado.nombreCompleto,
        asignadoAutomaticamente: barberoAsignadoAutomaticamente
      },
      servicios: serviciosSnapshots,
      precioEstimadoCop,
      cliente: {
        nombre: clientePersistido.nombreCompleto,
        correo: clientePersistido.correo,
        telefono: clientePersistido.telefonoWhatsapp
      }
    };
  }

  /**
   * Registro manual de cita desde el Backoffice (CU-024, RF-AGE-09).
   */
  async crearCitaManual(dto, usuarioId) {
    const sede = dto.sedeId ? await this.sedeRepo.findById(dto.sedeId) : await this.sedeRepo.findPrincipal();

    const servicios = await this.servicioRepo.findByIds(dto.servicioIds);
    if (servicios.length === 0) {
      throw new ValidationError('Debe seleccionar al menos un servicio.');
    }

    const bloquesTotales = servicios.reduce((acc, s) => acc + s.duracionBloques, 0);
    const precioEstimadoCop = servicios.reduce((acc, s) => acc + s.precioCop, 0);
    const duracionMinutos = bloquesTotales * 30;

    const inicioMin = this.disponibilidadService.timeToMinutes(dto.horaInicio);
    const finMin = inicioMin + duracionMinutos;
    const horaFin = this.disponibilidadService.minutesToTime(finMin);

    const inicioEn = `${dto.fecha}T${dto.horaInicio.slice(0, 5)}:00-05:00`;
    const finEn = `${dto.fecha}T${horaFin}:00-05:00`;

    // Cliente
    const correoCliente = dto.cliente.correo || `${dto.cliente.telefono}@smartbarber.local`;
    const clienteEntity = new Cliente({
      sedeId: sede.sedeId,
      nombreCompleto: dto.cliente.nombreCompleto,
      telefonoWhatsapp: dto.cliente.telefono,
      correo: correoCliente.toLowerCase().trim(),
      aceptoPoliticaDatosEn: new Date()
    });
    const clientePersistido = await this.clienteRepo.upsert(clienteEntity);

    const codigoReserva = this.generarCodigoReserva();
    const nuevaCita = new Cita({
      sedeId: sede.sedeId,
      clienteId: clientePersistido.clienteId,
      barberoId: dto.barberoId,
      barberoAsignadoAutomaticamente: false,
      codigoReserva,
      fecha: dto.fecha,
      horaInicio: `${dto.horaInicio.slice(0, 5)}:00`,
      horaFin: `${horaFin}:00`,
      inicioEn: new Date(inicioEn),
      finEn: new Date(finEn),
      bloquesTotales,
      precioEstimadoCop,
      estado: 'confirmada', // Creación manual nace confirmada (RF-AGE-09)
      notasCliente: dto.notasCliente || null,
      origen: 'backoffice',
      creadoPorUsuarioId: usuarioId
    });

    const serviciosSnapshots = servicios.map((s) => ({
      servicioId: s.servicioId,
      nombreServicioSnapshot: s.nombre,
      precioCopSnapshot: s.precioCop,
      duracionBloquesSnapshot: s.duracionBloques
    }));

    return await this.citaRepo.createWithServices(nuevaCita, serviciosSnapshots);
  }

  /**
   * Consulta de la agenda para el Backoffice (CU-022, RF-AGE-08).
   */
  async getAgenda({ sedeId, fecha, barberoId = null, user }) {
    // Si el usuario autenticado es un barbero, se fuerza el filtro a su propia agenda (RBAC 'P')
    let barberoFilter = barberoId;
    if (user.rol === 'barbero') {
      barberoFilter = user.barberoId;
    }

    const citas = await this.citaRepo.findAgenda({
      sedeId,
      fecha,
      barberoId: barberoFilter
    });

    // También enriquecer con los bloqueos puntuales del día
    let bloqueos = [];
    if (barberoFilter) {
      bloqueos = await this.barberoRepo.getBloqueosByFecha(barberoFilter, fecha);
    }

    return {
      fecha,
      barberoId: barberoFilter,
      totalCitas: citas.length,
      citas,
      bloqueos
    };
  }

  /**
   * Transición de estado de cita en el Backoffice (CU-023, RF-AGE-07, RN-06, RN-07).
   */
  async cambiarEstado(citaId, { nuevoEstado, observacion, motivoCancelacion }, user) {
    const cita = await this.citaRepo.findById(citaId);
    if (!cita) {
      throw new NotFoundError('Cita', citaId);
    }

    // Control de permisos RBAC
    if (user.rol === 'barbero' && cita.barberoId !== user.barberoId) {
      throw new ForbiddenError('Solo puede gestionar citas asignadas a su perfil.');
    }

    // Validación de máquina de estados (RN-07)
    const estadoActual = cita.estado;
    if (['completada', 'cancelada', 'no_asistio'].includes(estadoActual)) {
      throw new ValidationError(
        `La cita se encuentra en estado terminal '${estadoActual}' y no admite transiciones directas.`
      );
    }

    // Regla de inasistencia (RN-06: deben haber transcurrido al menos 15 minutos desde inicio)
    if (nuevoEstado === 'no_asistio') {
      const now = new Date();
      const citaInicio = new Date(cita.inicioEn);
      const minutosTranscurridos = (now.getTime() - citaInicio.getTime()) / 60000;

      if (minutosTranscurridos < 15) {
        throw new ValidationError(
          `Solo es posible marcar 'No asistió' una vez transcurridos al menos 15 minutos tras la hora de inicio programada (han transcurrido ${Math.max(0, Math.floor(minutosTranscurridos))} min).`
        );
      }
    }

    return await this.citaRepo.updateEstado(citaId, {
      nuevoEstado,
      observacion,
      motivoCancelacion,
      cambiadoPorUsuarioId: user.id
    });
  }
}
