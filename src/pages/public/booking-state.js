/**
 * SmartBarber - Booking State Store
 * Integrado con la capa de servicios (src/services/).
 * Desacoplado: Cero fetch() directo en la página.
 */

import { serviciosService, barberosService, citasService } from '../../services/index.js';

const STORAGE_KEY = 'smartbarber_booking_state';

class BookingStateStore {
  constructor() {
    this.servicesCatalog = [];
    this.barbersCatalog = [];
    this.isInitialized = false;
    this.state = this.loadState();
    this.init();
  }

  async init() {
    try {
      const [srvRes, barbRes] = await Promise.all([
        serviciosService.getServicios(),
        barberosService.getBarberos()
      ]);

      if (srvRes?.ok && Array.isArray(srvRes.data) && srvRes.data.length > 0) {
        this.servicesCatalog = srvRes.data;
        const validIds = this.servicesCatalog.map(s => s.id);
        const hasValid = this.state.selectedServiceIds.some(id => validIds.includes(id));
        if (!hasValid && this.servicesCatalog[0]) {
          this.state.selectedServiceIds = [this.servicesCatalog[0].id];
          this.save();
        }
      }
      if (barbRes?.ok && Array.isArray(barbRes.data)) {
        this.barbersCatalog = [
          {
            id: 'any',
            nombre: 'Cualquier barbero disponible',
            especialidad: 'Asignación automática más ágil',
            experiencia: 'Primer sillón disponible',
            foto: 'https://images.unsplash.com/photo-1585747860715-2ba37e788b70?w=120&auto=format&fit=crop&q=80'
          },
          ...barbRes.data
        ];
      }
      this.isInitialized = true;
    } catch (_) {
      this.isInitialized = true;
    }
  }

  loadState() {
    try {
      const stored = sessionStorage.getItem(STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (_) {}
    return this.getInitialState();
  }

  getInitialState() {
    const today = new Date().toISOString().split('T')[0];
    return {
      currentStep: 1,
      selectedServiceIds: [],
      selectedBarberId: 'any',
      selectedDate: today,
      selectedTime: '10:00',
      customer: {
        nombre: '',
        telefono: '',
        email: '',
        notas: '',
        ley1581: false
      },
      confirmedBooking: null
    };
  }

  save() {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
    } catch (_) {}
  }

  setStep(step) {
    this.state.currentStep = Math.max(1, Math.min(5, step));
    this.save();
  }

  toggleService(serviceId) {
    const idx = this.state.selectedServiceIds.indexOf(serviceId);
    if (idx > -1) {
      if (this.state.selectedServiceIds.length > 1) {
        this.state.selectedServiceIds.splice(idx, 1);
      }
    } else {
      this.state.selectedServiceIds.push(serviceId);
    }
    this.save();
  }

  setBarber(barberId) {
    this.state.selectedBarberId = barberId;
    this.save();
  }

  setDateTime(date, time) {
    this.state.selectedDate = date;
    this.state.selectedTime = time;
    this.save();
  }

  setCustomerData(data) {
    this.state.customer = { ...this.state.customer, ...data };
    this.save();
  }

  async confirmBooking() {
    const barber = this.getSelectedBarber();
    const services = this.getSelectedServices();
    const serviceNames = services.map(s => s.nombre).join(' + ');

    // Llamada delegada a través de citasService
    const result = await citasService.crearCita({
      barberoId: barber?.id === 'any' ? null : barber?.id,
      fecha: this.state.selectedDate,
      horaInicio: this.state.selectedTime,
      nombreCliente: this.state.customer.nombre,
      telefono: this.state.customer.telefono,
      correo: this.state.customer.email,
      servicioIds: this.state.selectedServiceIds,
      notasCliente: this.state.customer.notas
    });

    this.state.confirmedBooking = {
      codigo: result.data.codigo || result.data.codigoReserva,
      fecha: this.state.selectedDate,
      hora: this.state.selectedTime,
      servicios: services,
      barbero: barber || { nombre: result.data.barberName || 'Barbero Asignado' },
      cliente: { ...this.state.customer },
      totalCOP: this.getTotalPrice(),
      duracionMinutos: this.getTotalDuration(),
      creadoEn: new Date().toISOString()
    };

    this.state.currentStep = 5;
    this.save();
    return this.state.confirmedBooking;
  }

  reset() {
    this.state = this.getInitialState();
    this.save();
  }

  getSelectedServices() {
    return this.servicesCatalog.filter(s => this.state.selectedServiceIds.includes(s.id));
  }

  getSelectedBarber() {
    return this.barbersCatalog.find(b => b.id === this.state.selectedBarberId) || this.barbersCatalog[0];
  }

  getTotalPrice() {
    return this.getSelectedServices().reduce((sum, s) => sum + s.precio, 0);
  }

  getTotalDuration() {
    return this.getSelectedServices().reduce((sum, s) => sum + s.duracionMinutos, 0);
  }

  getTotalBlocks() {
    return Math.ceil(this.getTotalDuration() / 30);
  }
}

export const bookingStore = new BookingStateStore();
