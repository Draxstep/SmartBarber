/**
 * @file enums.js
 * @description Enumeraciones de dominio compartidas de forma isomórfica entre el servidor
 * y la PWA cliente. Libres al 100% de dependencias de Node.js o bases de datos.
 */

/**
 * Estado lógico de registros del sistema
 * @readonly
 * @enum {string}
 */
export const EstadoRegistro = Object.freeze({
  ACTIVO: 'activo',
  INACTIVO: 'inactivo'
});

/**
 * Roles de usuario para control de acceso (RBAC)
 * @readonly
 * @enum {string}
 */
export const RolUsuario = Object.freeze({
  ADMINISTRADOR: 'administrador',
  BARBERO: 'barbero'
});

/**
 * Estados del ciclo de vida de una cita de agendamiento
 * @readonly
 * @enum {string}
 */
export const EstadoCita = Object.freeze({
  PENDIENTE: 'pendiente',
  CONFIRMADA: 'confirmada',
  COMPLETADA: 'completada',
  CANCELADA: 'cancelada',
  NO_ASISTIO: 'no_asistio'
});

/**
 * Canal de origen de creación de una cita
 * @readonly
 * @enum {string}
 */
export const OrigenCita = Object.freeze({
  LANDING: 'landing',
  BACKOFFICE: 'backoffice'
});

/**
 * Origen de una atención registrada en caja
 * @readonly
 * @enum {string}
 */
export const OrigenCorte = Object.freeze({
  CITA: 'cita',
  WALK_IN: 'walk_in'
});

/**
 * Estado contable de un registro de corte en caja
 * @readonly
 * @enum {string}
 */
export const EstadoCorte = Object.freeze({
  ACTIVO: 'activo',
  ANULADO: 'anulado'
});

/**
 * Métodos de pago aceptados en caja y venta de productos
 * @readonly
 * @enum {string}
 */
export const MetodoPago = Object.freeze({
  EFECTIVO: 'efectivo',
  TRANSFERENCIA_BANCARIA: 'transferencia_bancaria',
  TARJETA_DEBITO_CREDITO: 'tarjeta_debito_credito',
  NEQUI: 'nequi',
  DAVIPLATA: 'daviplata'
});

/**
 * Dirección general de flujo en el Kardex de inventario
 * @readonly
 * @enum {string}
 */
export const TipoMovimientoInventario = Object.freeze({
  ENTRADA: 'entrada',
  SALIDA: 'salida'
});

/**
 * Subclasificación operativa de movimientos de inventario
 * @readonly
 * @enum {string}
 */
export const SubtipoMovimientoInventario = Object.freeze({
  INVENTARIO_INICIAL: 'inventario_inicial',
  COMPRA_REPOSICION: 'compra_reposicion',
  AJUSTE_POSITIVO: 'ajuste_positivo',
  VENTA_PUBLICO: 'venta_publico',
  CONSUMO_INTERNO: 'consumo_interno',
  AJUSTE_NEGATIVO: 'ajuste_negativo'
});

/**
 * Estado de entrega de notificaciones en cola Outbox
 * @readonly
 * @enum {string}
 */
export const EstadoNotificacion = Object.freeze({
  PENDIENTE: 'pendiente',
  ENVIADA: 'enviada',
  FALLIDA: 'fallida'
});
