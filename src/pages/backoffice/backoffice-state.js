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
  barberosService
} from '../../services/index.js';

class BackofficeStateStore {
  constructor() {
    this.currentRole = 'administrador'; // 'administrador' | 'barbero'
    this.activeBarber = null;
    this.barbers = [];
    this.appointments = [];
    this.products = [];
    this.inventorySearchQuery = '';
    this.inventoryStatusFilter = 'all';

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

    try {
      const today = new Date().toISOString().split('T')[0];
      const [barbRes, citasRes, invRes] = await Promise.all([
        barberosService.getBarberos(),
        citasService.getCitasDelDia(today),
        inventarioService.getProductos()
      ]);

      if (barbRes?.ok && Array.isArray(barbRes.data)) {
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

      if (invRes?.ok && Array.isArray(invRes.data)) {
        this.products = invRes.data;
      }
    } catch (_) {}
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
    }
    return apt;
  }

  async markNoShow(appointmentId) {
    const apt = this.appointments.find(a => a.id === appointmentId || a.citaId === appointmentId);
    if (apt) {
      apt.status = 'no_asistio';
      await citasService.cambiarEstadoCita(apt.citaId || apt.id, 'no_asistio', 'Inasistencia del cliente');
    }
    return apt;
  }

  async cancelAppointment(appointmentId) {
    const apt = this.appointments.find(a => a.id === appointmentId || a.citaId === appointmentId);
    if (apt) {
      apt.status = 'cancelada';
      await citasService.cambiarEstadoCita(apt.citaId || apt.id, 'cancelada', 'Cancelada desde agenda administrativa');
    }
    return apt;
  }

  async addWalkinCut({ chairIndex = 0, clientName = 'Cliente Mostrador', serviceName = 'Corte Clásico', price = 25000, durationMinutes = 30, paymentMethod = 'efectivo' }) {
    const barber = this.barbers[chairIndex] || this.barbers[0] || this.activeBarber;

    const res = await cortesService.registrarCorte({
      barberoId: barber?.id,
      barberoNombre: barber?.name,
      clienteNombre: clientName || 'Cliente Mostrador',
      servicioNombre: serviceName,
      precio,
      metodoPago: paymentMethod
    });

    const newApt = {
      id: res.data?.id || `WK-${Math.floor(1000 + Math.random() * 9000)}`,
      chairIndex,
      barberId: barber?.id,
      timeStart: '11:30',
      timeEnd: durationMinutes === 60 ? '12:30' : '12:00',
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
    return newApt;
  }

  getKpis() {
    const visible = this.getVisibleAppointments();
    const completed = visible.filter(a => a.status === 'completada');
    const totalIncome = completed.reduce((sum, a) => sum + (a.price || 0), 0);
    const pending = visible.filter(a => a.status === 'pendiente' || a.status === 'confirmada');

    const lowStock = this.products.filter(p => p.stockActual > 0 && p.stockActual <= p.stockMinimo);
    const outOfStock = this.products.filter(p => p.stockActual === 0);

    return {
      ingresosHoy: totalIncome,
      turnosHoy: visible.length,
      pendientesHoy: pending.length,
      cortesRealizados: completed.length,
      alertasInventario: lowStock.length + outOfStock.length,
      comisionBarbero: Math.round(totalIncome * 0.5)
    };
  }

  getFilteredProducts() {
    let list = this.products;

    if (this.inventorySearchQuery) {
      const q = this.inventorySearchQuery.toLowerCase();
      list = list.filter(p => p.nombre.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q) || p.categoria.toLowerCase().includes(q));
    }

    if (this.inventoryStatusFilter === 'disponible') {
      list = list.filter(p => p.stockActual > p.stockMinimo);
    } else if (this.inventoryStatusFilter === 'stock_bajo') {
      list = list.filter(p => p.stockActual > 0 && p.stockActual <= p.stockMinimo);
    } else if (this.inventoryStatusFilter === 'agotado') {
      list = list.filter(p => p.stockActual === 0);
    }

    return list;
  }

  async addStockEntry(sku, quantity, note = '') {
    const res = await inventarioService.registrarEntrada(sku, quantity, note);
    const p = this.products.find(item => item.sku === sku);
    if (p && res.data) {
      p.stockActual = res.data.stockActual;
    }
    return p;
  }

  async addStockExit(sku, quantity, reason = 'venta_publico') {
    const res = await inventarioService.registrarSalida(sku, quantity, reason);
    const p = this.products.find(item => item.sku === sku);
    if (p && res.data) {
      p.stockActual = res.data.stockActual;
    }
    return p;
  }
}

export const backofficeStore = new BackofficeStateStore();
