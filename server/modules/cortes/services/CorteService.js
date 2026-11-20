/**
 * @file CorteService.js
 * @description Servicio de aplicación para registro de cortes, caja y operaciones de atención (CU-004 a CU-008).
 */
import { RegistroCorte } from '../domain/RegistroCorte.js';
import { RegistroCortePgRepository } from '../repositories/RegistroCortePgRepository.js';
import { CitaPgRepository } from '../../agendamiento/repositories/CitaPgRepository.js';
import { BarberoPgRepository } from '../../barberos/repositories/BarberoPgRepository.js';
import { ServicioPgRepository } from '../../servicios/repositories/ServicioPgRepository.js';
import { runTransaction } from '../../../shared/database/transaction.js';
import {
  NotFoundError,
  ValidationError,
  ConflictError,
  ForbiddenError
} from '../../../shared/errors/domainErrors.js';

export class CorteService {
  constructor(
    corteRepo = null,
    citaRepo = null,
    barberoRepo = null,
    servicioRepo = null
  ) {
    this.corteRepo = corteRepo || new RegistroCortePgRepository();
    this.citaRepo = citaRepo || new CitaPgRepository();
    this.barberoRepo = barberoRepo || new BarberoPgRepository();
    this.servicioRepo = servicioRepo || new ServicioPgRepository();
  }

  /**
   * Registro operativo de corte sin cita (Walk-in) (CU-004, RF-COR-01, RN-09, RN-12, RN-15).
   */
  async registrarWalkIn(dto, user) {
    // 1. Determinar barbero asignado según rol (Barbero no puede cambiar su barberoId)
    let barberoId = dto.barberoId;
    if (user.rol === 'barbero') {
      barberoId = user.barberoId;
    }

    if (!barberoId) {
      throw new ValidationError('Debe especificar el barbero que prestó el servicio.');
    }

    const barbero = await this.barberoRepo.findById(barberoId);
    if (!barbero || barbero.estado !== 'activo') {
      throw new ValidationError('El barbero seleccionado no existe o se encuentra inactivo.');
    }

    // 2. Obtener servicios y calcular precio base
    const servicios = await this.servicioRepo.findByIds(dto.servicioIds);
    if (servicios.length === 0) {
      throw new ValidationError('Debe seleccionar al menos un servicio activo.');
    }

    const precioCalculadoCop = servicios.reduce((acc, s) => acc + s.precioCop, 0);

    // 3. Ajuste de precio manual (RN-15: solo Administrador con justificación >= 5 caracteres)
    let precioCobradoCop = precioCalculadoCop;
    if (dto.precioCobradoCop !== undefined && dto.precioCobradoCop !== null) {
      if (user.rol !== 'administrador' && dto.precioCobradoCop !== precioCalculadoCop) {
        throw new ForbiddenError(
          'Solo el Administrador tiene autorización para modificar manualmente el precio cobrado (RN-15).'
        );
      }
      if (dto.precioCobradoCop !== precioCalculadoCop) {
        if (!dto.notas || dto.notas.trim().length < 5) {
          throw new ValidationError(
            'Todo ajuste manual de precio exige una justificación de al menos 5 caracteres en las notas (RN-15).'
          );
        }
      }
      precioCobradoCop = dto.precioCobradoCop;
    }

    // 4. Calcular comisión referencial con snapshot vigente del barbero (RN-12)
    const porcentajeComisionSnapshot = Number(barbero.porcentajeComision) || 0;
    const comisionCalculadaCop = Math.round((precioCobradoCop * porcentajeComisionSnapshot) / 100);

    const nuevoCorte = new RegistroCorte({
      sedeId: user.sedeId,
      citaId: null,
      barberoId,
      clienteId: null,
      nombreClienteReferencial: dto.nombreCliente || null,
      origen: 'walk_in',
      fechaHoraAtencion: new Date(),
      precioCalculadoCop,
      precioCobradoCop,
      metodoPago: dto.metodoPago,
      porcentajeComisionSnapshot,
      comisionCalculadaCop,
      notas: dto.notas || null,
      estado: 'activo',
      registradoPorUsuarioId: user.id
    });

    const serviciosSnapshots = servicios.map((s) => ({
      servicioId: s.servicioId,
      nombreServicioSnapshot: s.nombre,
      precioCopSnapshot: s.precioCop
    }));

    return await this.corteRepo.createWithServices(nuevoCorte, serviciosSnapshots);
  }

  /**
   * Conversión atómica 1:1 de Cita agendada a Registro de Corte (CU-005, RF-COR-02, RN-07, RN-08).
   */
  async convertirCitaACorte(citaId, dto, user) {
    return await runTransaction(async (client) => {
      // 1. Validar existencia y estado de la cita
      const cita = await this.citaRepo.findById(citaId, { client });
      if (!cita) {
        throw new NotFoundError('Cita', citaId);
      }

      if (user.rol === 'barbero' && cita.barberoId !== user.barberoId) {
        throw new ForbiddenError('Solo puede liquidar y completar citas asignadas a su perfil.');
      }

      if (['cancelada', 'no_asistio', 'completada'].includes(cita.estado)) {
        throw new ConflictError(
          `La cita no puede liquidarse porque ya se encuentra en estado '${cita.estado}'.`
        );
      }

      // Validar que no exista un corte activo ya vinculado (RN-08: 1:1)
      const corteExistente = await this.corteRepo.findByCitaId(citaId, { client });
      if (corteExistente) {
        throw new ConflictError('Ya existe un registro de corte completado para esta cita (RN-08).');
      }

      // 2. Determinar servicios aplicados (permite añadir o modificar servicios antes del cierre)
      let serviciosSnapshots = [];
      let precioCalculadoCop = 0;

      if (dto.servicioIds && dto.servicioIds.length > 0) {
        const servs = await this.servicioRepo.findByIds(dto.servicioIds, { client });
        serviciosSnapshots = servs.map((s) => ({
          servicioId: s.servicioId,
          nombreServicioSnapshot: s.nombre,
          precioCopSnapshot: s.precioCop
        }));
        precioCalculadoCop = servs.reduce((acc, s) => acc + s.precioCop, 0);
      } else {
        serviciosSnapshots = cita.servicios.map((s) => ({
          servicioId: s.servicioId,
          nombreServicioSnapshot: s.nombreServicioSnapshot,
          precioCopSnapshot: s.precioCopSnapshot
        }));
        precioCalculadoCop = cita.precioEstimadoCop;
      }

      // 3. Ajuste manual de precio por Administrador (RN-15)
      let precioCobradoCop = precioCalculadoCop;
      if (dto.precioCobradoCop !== undefined && dto.precioCobradoCop !== null) {
        if (user.rol !== 'administrador' && dto.precioCobradoCop !== precioCalculadoCop) {
          throw new ForbiddenError('Solo el Administrador puede ajustar manualmente el precio de la cita.');
        }
        if (dto.precioCobradoCop !== precioCalculadoCop) {
          if (!dto.notas || dto.notas.trim().length < 5) {
            throw new ValidationError(
              'El ajuste manual de precio exige una justificación de al menos 5 caracteres en las notas (RN-15).'
            );
          }
        }
        precioCobradoCop = dto.precioCobradoCop;
      }

      // 4. Calcular comisión del barbero
      const barbero = await this.barberoRepo.findById(cita.barberoId, { client });
      const porcentajeComisionSnapshot = Number(barbero?.porcentajeComision) || 0;
      const comisionCalculadaCop = Math.round((precioCobradoCop * porcentajeComisionSnapshot) / 100);

      const nuevoCorte = new RegistroCorte({
        sedeId: cita.sedeId,
        citaId,
        barberoId: cita.barberoId,
        clienteId: cita.clienteId,
        nombreClienteReferencial: null,
        origen: 'cita',
        fechaHoraAtencion: new Date(),
        precioCalculadoCop,
        precioCobradoCop,
        metodoPago: dto.metodoPago,
        porcentajeComisionSnapshot,
        comisionCalculadaCop,
        notas: dto.notas || null,
        estado: 'activo',
        registradoPorUsuarioId: user.id
      });

      // 5. Crear el corte con sus servicios
      const corteCreado = await this.corteRepo.createWithServices(nuevoCorte, serviciosSnapshots, { client });

      // 6. Actualizar cita a COMPLETADA dentro de la misma transacción (RN-07, RN-08)
      await this.citaRepo.updateEstado(
        citaId,
        {
          nuevoEstado: 'completada',
          observacion: `Corte registrado exitosamente con ID ${corteCreado.registroCorteId}`,
          cambiadoPorUsuarioId: user.id
        },
        { client }
      );

      return corteCreado;
    });
  }

  /**
   * Consulta filtrada del historial de cortes con scoping RBAC (CU-006, RF-COR-03).
   */
  async getHistorial({ sedeId, fechaInicio, fechaFin, barberoId = null, estado = null }, user) {
    let finalBarberoId = barberoId;
    if (user.rol === 'barbero') {
      finalBarberoId = user.barberoId; // RBAC 'P'
    }

    return await this.corteRepo.findHistorialDiario({
      sedeId,
      fechaInicio,
      fechaFin,
      barberoId: finalBarberoId,
      estado
    });
  }

  /**
   * Resumen de ingresos por día y por barbero (CU-007, RF-COR-04).
   */
  async getResumenIngresos({ sedeId, fechaInicio, fechaFin, barberoId = null }, user) {
    let finalBarberoId = barberoId;
    if (user.rol === 'barbero') {
      finalBarberoId = user.barberoId; // Barbero solo ve sus ingresos
    }

    // Validar rango máximo de 90 días (RF-COR-04)
    const diffDays = Math.ceil(
      (new Date(fechaFin).getTime() - new Date(fechaInicio).getTime()) / (1000 * 60 * 60 * 24)
    );
    if (diffDays > 90) {
      throw new ValidationError('El rango máximo de consulta para resúmenes de ingresos es de 90 días.');
    }

    return await this.corteRepo.getResumenIngresos({
      sedeId,
      fechaInicio,
      fechaFin,
      barberoId: finalBarberoId
    });
  }

  /**
   * Anulación auditada de un registro de corte (CU-008, RF-COR-05).
   */
  async anularCorte(corteId, { motivoAnulacion, revertirEstadoCita = false }, user) {
    if (user.rol !== 'administrador') {
      throw new ForbiddenError('Solo el Administrador tiene autorización para anular registros de corte (RF-COR-05).');
    }

    if (!motivoAnulacion || motivoAnulacion.trim().length < 10) {
      throw new ValidationError('El motivo de anulación debe contener al menos 10 caracteres.');
    }

    return await runTransaction(async (client) => {
      const corte = await this.corteRepo.findById(corteId, { client });
      if (!corte) {
        throw new NotFoundError('RegistroCorte', corteId);
      }

      if (corte.estado === 'anulado') {
        throw new ConflictError('El registro de corte ya se encuentra anulado.');
      }

      const anulado = await this.corteRepo.anular(
        corteId,
        {
          motivoAnulacion,
          anuladoPorUsuarioId: user.id
        },
        { client }
      );

      // Reversión opcional del estado de la cita si el corte provenía de una cita (RF-COR-05)
      if (revertirEstadoCita && corte.citaId) {
        await this.citaRepo.updateEstado(
          corte.citaId,
          {
            nuevoEstado: 'confirmada',
            observacion: `Reversión por anulación de corte: ${motivoAnulacion}`,
            cambiadoPorUsuarioId: user.id
          },
          { client }
        );
      }

      return anulado;
    });
  }
}
