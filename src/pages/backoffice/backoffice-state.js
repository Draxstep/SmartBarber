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
import { getTodayBogota } from '../../utils/formatters.js';
import { Capabilities, can, normalizeRole } from '../../utils/access-control.js';

class BackofficeStateStore {
  constructor() {
    this.currentRole = 'administrador'; // 'administrador' | 'barbero'
    this.activeBarber = null;
    this.barbers = [];
    this.appointments = [];
    this.products = [];
    this.services = [];
    this.inventorySearchQuery = '';
    this.inventoryStatusFilter = 'all';
    this.isInitialized = false;
    this.initPromise = null;

    this.selectedDate = getTodayBogota();
  }

  /**
   * Inicializa el estado del Backoffice de forma perezosa e idempotente,
   * ejecutándose únicamente cuando existe una sesión autenticada.
   */
  async ensureInitialized(force = false) {
    if (!authService.isAuthenticated()) {
      return;
    }
    if (this.isInitialized && !force) {
      return;
    }
    if (!this.initPromise || force) {
      this.initPromise = this.init().finally(() => {
        this.initPromise = null;
      });
    }
    await this.initPromise;
  }

  async init() {
    const user = authService.getCurrentUser();
    if (!user || !authService.isAuthenticated()) {
      return;
    }

    this.currentRole = normalizeRole(user.rol) || 'barbero';
    if (user.barberoId) {
      this.activeBarber = {
        id: user.barberoId,
        name: user.nombreCompleto || 'Barbero',
        chair: 'Sillón 1',
        chairIndex: 0,
        comisionPorcentaje: 50
      };
    } else {
      this.activeBarber = null;
    }

    await this.loadAgendaData();
    this.isInitialized = true;
  }

  reset() {
    this.currentRole = 'administrador';
    this.activeBarber = null;
    this.barbers = [];
    this.appointments = [];
    this.products = [];
    this.services = [];
    this.inventorySearchQuery = '';
    this.inventoryStatusFilter = 'all';
    this.selectedDate = getTodayBogota();
    this.isInitialized = false;
    this.initPromise = null;
  }

  async loadAgendaData(fecha = null) {
    if (!authService.isAuthenticated()) {
      return [];
    }

    const user = authService.getCurrentUser();
    const targetDate = fecha || this.selectedDate || getTodayBogota();
    this.selectedDate = targetDate;

    const canListBarbers = can(Capabilities.BARBERS_LIST_READ, user);
    const canViewAlerts = can(Capabilities.INVENTORY_ALERTS_VIEW, user);
    const canManageOwnBarber = can(Capabilities.BARBER_PROFILE_MANAGE_OWN, user);

    try {
      const [barbRes, citasRes, invRes, srvRes, miPerfilRes] = await Promise.all([
        canListBarbers && this.barbers.length === 0
          ? barberosService.getBarberos()
          : Promise.resolve({ ok: true, data: this.barbers }),
        citasService.getCitasDelDia(targetDate),
        canViewAlerts && this.products.length === 0
          ? inventarioService.getProductos()
          : Promise.resolve({ ok: true, data: this.products }),
        this.services.length === 0
          ? serviciosService.getServicios({ activo: true }).catch(() => ({ ok: false, data: [] }))
          : Promise.resolve({ ok: true, data: this.services }),
        !canListBarbers && canManageOwnBarber && !this.activeBarber?.sillonLoaded
          ? barberosService.getMiPerfil().catch(() => ({ ok: false }))
          : Promise.resolve({ ok: false })
      ]);

      if (canListBarbers && barbRes?.ok && Array.isArray(barbRes.data) && this.barbers.length === 0) {
        this.barbers = barbRes.data.map((b, idx) => ({
          id: b.id,
          name: b.nombre,
          chair: b.sillon || `Sillón ${idx + 1}`,
          chairIndex: idx,
          comisionPorcentaje: Number(b.porcentajeComision ?? b.comisionPorcentaje ?? 50)
        }));
        if (user?.barberoId) {
          const own = this.barbers.find(b => b.id === user.barberoId);
          if (own) this.activeBarber = own;
        }
      }

      if (miPerfilRes?.ok && miPerfilRes.data?.barbero && user?.barberoId) {
        const b = miPerfilRes.data.barbero;
        this.activeBarber = {
          id: b.barberoId || user.barberoId,
          name: b.nombrePublico || b.nombreCompleto || user.nombreCompleto || 'Barbero',
          chair: b.sillon || 'Sillón 1',
          chairIndex: 0,
          comisionPorcentaje: Number(b.porcentajeComision ?? 50),
          sillonLoaded: true
        };
      }

      if (citasRes?.ok && Array.isArray(citasRes.data)) {
        this.appointments = citasRes.data;
      }

      if (canViewAlerts && invRes?.ok && Array.isArray(invRes.data) && this.products.length === 0) {
        this.products = invRes.data;
      }

      if (srvRes?.ok && Array.isArray(srvRes.data) && this.services.length === 0) {
        this.services = srvRes.data.filter(s => s.activo !== false);
      }
    } catch (err) {
      console.warn('⚠️ Error al cargar agenda:', err.message);
    }
    return this.appointments;
  }

  setRole(role) {
    this.currentRole = normalizeRole(role) || 'barbero';
  }

  getRole() {
    const user = authService.getCurrentUser();
    return normalizeRole(user?.rol || this.currentRole || 'administrador') || 'administrador';
  }

  getVisibleBarbers() {
    const user = authService.getCurrentUser();
    if (!can(Capabilities.APPOINTMENTS_VIEW_ALL, user)) {
      return this.activeBarber ? [this.activeBarber] : [];
    }
    return this.barbers;
  }

  getVisibleAppointments() {
    const user = authService.getCurrentUser();
    if (!can(Capabilities.APPOINTMENTS_VIEW_ALL, user) && user?.barberoId) {
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

  async addWalkinCut({ barberId = null, chairIndex = 0, clientName = 'Cliente Mostrador', serviceId = null, serviceName = 'Corte Clásico', price = 25000, durationMinutes = 30, paymentMethod = 'efectivo', timeStart = '10:00' }) {
    const user = authService.getCurrentUser();
    const canAssignAny = can(Capabilities.CUTS_ASSIGN_ANY_BARBER, user);

    let barber = this.activeBarber;
    if (canAssignAny) {
      barber = (barberId ? this.barbers.find(b => b.id === barberId) : null)
        || this.barbers[chairIndex]
        || this.barbers[0]
        || this.activeBarber;
    }

    // Resolver servicioId si no viene
    let finalServicioId = serviceId || null;
    try {
      const catalog = this.services.length > 0 ? this.services : (await serviciosService.getServicios({ activo: true })).data;
      if (!finalServicioId && Array.isArray(catalog)) {
        const found = catalog.find(s => s.nombre.toLowerCase().includes(serviceName.toLowerCase()) || s.id === serviceName);
        finalServicioId = found?.id || catalog[0]?.id;
      }
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
    const barberCommissionPct = Number(activeBarb?.comisionPorcentaje ?? 50);
    const comisionRate = barberCommissionPct / 100;
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
      lowStockCount: lowStock.length,
      outOfStockCount: outOfStock.length,
      barberCommissionPct,
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
