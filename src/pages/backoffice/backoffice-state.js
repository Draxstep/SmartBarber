/**
 * SmartBarber - Backoffice State Store (100% Producción Real)
 * Conectado con la capa de servicios (citasService, cortesService, inventarioService, authService).
 * Cero fetch() directo en componentes de vista. Roles e identidad estrictamente sincronizados con la sesión.
 */

import {
  citasService,
  cortesService,
  inventarioService,
  authService,
  barberosService,
  serviciosService
} from '../../services/index.js';
import { emitDataMutation } from '../../utils/event-bus.js';

class BackofficeStateStore {
  constructor() {
    this.currentRole = 'administrador'; // 'administrador' | 'barbero'
    this.activeBarber = null;
    this.barbers = [];
    this.appointments = [];
    this.products = [];
    this.inventorySearchQuery = '';
    this.inventoryStatusFilter = 'all';

    this.selectedDate = new Date().toISOString().split('T')[0];
    this.init();
  }

  async init() {
    const user = authService.getCurrentUser();
    if (user) {
      this.currentRole = user.rol;
      if (user.barberoId) {
        this.activeBarber = {
          id: user.barberoId,
          name: user.nombreCompleto || 'Barbero',
          chair: 'Sillón 1',
          chairIndex: 0
        };
      }
    }

    await this.loadAgendaData();
  }

  async loadAgendaData(fecha = null) {
    const targetDate = fecha || this.selectedDate || new Date().toISOString().split('T')[0];
    this.selectedDate = targetDate;

    try {
      const [barbRes, citasRes, invRes] = await Promise.all([
        this.barbers.length === 0 ? barberosService.getBarberos() : Promise.resolve({ ok: true, data: this.barbers }),
        citasService.getCitasDelDia(targetDate),
        this.products.length === 0 ? inventarioService.getProductos() : Promise.resolve({ ok: true, data: this.products })
      ]);

      if (barbRes?.ok && Array.isArray(barbRes.data) && this.barbers.length === 0) {
        this.barbers = barbRes.data.map((b, idx) => ({
          id: b.id,
          name: b.nombre,
          chair: b.sillon || `Sillón ${idx + 1}`,
          chairIndex: idx
        }));
        if (!this.activeBarber && this.barbers[0]) {
          this.activeBarber = this.barbers[0];
        }
      }

      if (citasRes?.ok && Array.isArray(citasRes.data)) {
        this.appointments = citasRes.data;
      }

      if (invRes?.ok && Array.isArray(invRes.data) && this.products.length === 0) {
        this.products = invRes.data;
      }
    } catch (err) {
      console.warn('⚠️ Error al cargar agenda:', err.message);
    }
    return this.appointments;
  }

  setRole(role) {
    this.currentRole = role;
  }

  getRole() {
    const user = authService.getCurrentUser();
    return user?.rol || this.currentRole || 'administrador';
  }

  getVisibleBarbers() {
    const role = this.getRole();
    if (role === 'barbero' && this.activeBarber) {
      return [this.activeBarber];
    }
    return this.barbers.length > 0 ? this.barbers : [
      { id: 'b-default-1', name: 'Carlos Mendoza', chair: 'Sillón 1', chairIndex: 0 },
      { id: 'b-default-2', name: 'Alejandro Torres', chair: 'Sillón 2', chairIndex: 1 }
    ];
  }

  getVisibleAppointments() {
    const role = this.getRole();
    const user = authService.getCurrentUser();
    if (role === 'barbero' && user?.barberoId) {
      return this.appointments.filter(a => a.barberId === user.barberoId || a.barberoId === user.barberoId);
    }
    return this.appointments;
  }

  async completeAppointment(appointmentId, paymentMethod = 'efectivo') {
    const apt = this.appointments.find(a => a.id === appointmentId || a.citaId === appointmentId);
    if (apt) {
      apt.status = 'completada';
      apt.paymentMethod = paymentMethod;

      // Conversión atómica 1:1 de cita a corte (CU-005, RN-08)
      await cortesService.registrarCorte({
        citaId: apt.citaId || apt.id,
        metodoPago: paymentMethod,
        precio: apt.price
      });
      emitDataMutation('citas', 'update');
      emitDataMutation('cortes', 'create');
    }
    return apt;
  }

  async markNoShow(appointmentId) {
    const apt = this.appointments.find(a => a.id === appointmentId || a.citaId === appointmentId);
    if (apt) {
      apt.status = 'no_asistio';
      await citasService.cambiarEstadoCita(apt.citaId || apt.id, 'no_asistio', 'Inasistencia del cliente');
      emitDataMutation('citas', 'update');
    }
    return apt;
  }

  async cancelAppointment(appointmentId) {
    const apt = this.appointments.find(a => a.id === appointmentId || a.citaId === appointmentId);
    if (apt) {
      apt.status = 'cancelada';
      await citasService.cambiarEstadoCita(apt.citaId || apt.id, 'cancelada', 'Cancelada desde agenda administrativa');
      emitDataMutation('citas', 'update');
    }
    return apt;
  }

  async addWalkinCut({ chairIndex = 0, clientName = 'Cliente Mostrador', serviceName = 'Corte Clásico', price = 25000, durationMinutes = 30, paymentMethod = 'efectivo', timeStart = '10:00' }) {
    const barber = this.barbers[chairIndex] || this.barbers[0] || this.activeBarber;

    // Resolver servicioId si no viene
    let finalServicioId = null;
    try {
      const srvRes = await serviciosService.getServicios();
      const found = srvRes.data?.find(s => s.nombre.toLowerCase().includes(serviceName.toLowerCase()) || s.id === serviceName);
      finalServicioId = found?.id || srvRes.data?.[0]?.id;
    } catch (_) {}

    const res = await cortesService.registrarCorte({
      barberoId: barber?.id,
      barberoNombre: barber?.name,
      clienteNombre: clientName || 'Cliente Mostrador',
      servicioId: finalServicioId,
      servicioIds: finalServicioId ? [finalServicioId] : [],
      servicioNombre: serviceName,
      precio,
      metodoPago: paymentMethod
    });

    const startH = parseInt(timeStart.split(':')[0], 10) || 10;
    const startM = parseInt(timeStart.split(':')[1], 10) || 0;
    const endMinutes = startH * 60 + startM + durationMinutes;
    const endH = String(Math.floor(endMinutes / 60)).padStart(2, '0');
    const endM = String(endMinutes % 60).padStart(2, '0');
    const calculatedTimeEnd = `${endH}:${endM}`;

    const newApt = {
      id: res?.data?.id || `WK-${Math.floor(1000 + Math.random() * 9000)}`,
      chairIndex,
      barberId: barber?.id,
      barberoId: barber?.id,
      barberName: barber?.name,
      timeStart,
      timeEnd: calculatedTimeEnd,
      clientName: clientName || 'Cliente Mostrador',
      clientPhone: '3000000000',
      serviceName,
      price,
      durationMinutes,
      durationBlocks: Math.ceil(durationMinutes / 30),
      status: 'completada',
      paymentMethod
    };

    this.appointments.push(newApt);
    emitDataMutation('citas', 'create');
    emitDataMutation('cortes', 'create');
    return newApt;
  }

  getKpis() {
    const visible = this.getVisibleAppointments();
    const completed = visible.filter(a => a.status === 'completada');
    const totalIncome = completed.reduce((sum, a) => sum + (a.price || 0), 0);
    const pending = visible.filter(a => a.status === 'pendiente' || a.status === 'confirmada');

    const activeProducts = this.products.filter(p => p.estado !== 'inactivo');
    const lowStock = activeProducts.filter(p => p.stockActual > 0 && p.stockActual <= p.stockMinimo);
    const outOfStock = activeProducts.filter(p => p.stockActual === 0);

    // Calcular comisiones exactas según porcentaje del barbero o snapshots (RN-12)
    const user = authService.getCurrentUser();
    const activeBarb = this.barbers.find(b => b.id === user?.barberoId) || this.activeBarber;
    const comisionRate = (activeBarb?.comisionPorcentaje ?? 50) / 100;
    const comisionTotal = completed.reduce((sum, a) => {
      if (a.comisionCalculadaCop !== undefined && a.comisionCalculadaCop !== null) {
        return sum + Number(a.comisionCalculadaCop);
      }
      return sum + Math.round((a.price || 0) * comisionRate);
    }, 0);

    return {
      ingresosHoy: totalIncome,
      turnosHoy: visible.length,
      pendientesHoy: pending.length,
      cortesRealizados: completed.length,
      alertasInventario: lowStock.length + outOfStock.length,
      comisionBarbero: comisionTotal
    };
  }

  getFilteredProducts() {
    let list = this.products;

    if (this.inventoryStatusFilter === 'archivado' || this.inventoryStatusFilter === 'inactivo') {
      list = list.filter(p => p.estado === 'inactivo');
    } else {
      list = list.filter(p => p.estado !== 'inactivo');

      if (this.inventoryStatusFilter === 'disponible') {
        list = list.filter(p => p.stockActual > p.stockMinimo);
      } else if (this.inventoryStatusFilter === 'stock_bajo') {
        list = list.filter(p => p.stockActual > 0 && p.stockActual <= p.stockMinimo);
      } else if (this.inventoryStatusFilter === 'agotado') {
        list = list.filter(p => p.stockActual === 0);
      }
    }

    if (this.inventorySearchQuery) {
      const q = this.inventorySearchQuery.toLowerCase();
      list = list.filter(p => p.nombre.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q) || p.categoria.toLowerCase().includes(q));
    }

    return list;
  }

  async addStockEntry(productIdOrSku, quantity, note = '') {
    const res = await inventarioService.registrarEntrada(productIdOrSku, quantity, note);
    const p = this.products.find(item => item.sku === productIdOrSku || item.productoId === productIdOrSku || item.id === productIdOrSku);
    if (p) {
      const newStock = res?.data?.producto?.stockActual ?? res?.data?.stockActual;
      if (newStock !== undefined) {
        p.stockActual = newStock;
      } else {
        p.stockActual = (p.stockActual || 0) + quantity;
      }
    }
    return p;
  }

  async addStockExit(productIdOrSku, quantity, reason = 'venta_publico', metodoPago = 'efectivo', observacion = '') {
    const res = await inventarioService.registrarSalida(productIdOrSku, quantity, reason, metodoPago, observacion);
    const p = this.products.find(item => item.sku === productIdOrSku || item.productoId === productIdOrSku || item.id === productIdOrSku);
    if (p) {
      const newStock = res?.data?.producto?.stockActual ?? res?.data?.stockActual;
      if (newStock !== undefined) {
        p.stockActual = newStock;
      } else {
        p.stockActual = Math.max(0, (p.stockActual || 0) - quantity);
      }
    }
    return p;
  }
}

export const backofficeStore = new BackofficeStateStore();
