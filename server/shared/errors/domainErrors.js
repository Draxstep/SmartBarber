/**
 * @file domainErrors.js
 * @description Jerarquía de excepciones de dominio para aislar errores internos de BD y lógica de negocio.
 */

export class DomainError extends Error {
  /**
   * @param {string} message
   * @param {string} [code='DOMAIN_ERROR']
   * @param {number} [statusCode=400]
   * @param {object} [details=null]
   */
  constructor(message, code = 'DOMAIN_ERROR', statusCode = 400, details = null) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class NotFoundError extends DomainError {
  constructor(resource, identifier) {
    super(
      `El recurso '${resource}' con identificador '${identifier}' no fue encontrado.`,
      'NOT_FOUND',
      404,
      { resource, identifier }
    );
  }
}

export class ConflictError extends DomainError {
  constructor(message, details = null) {
    super(message, 'CONFLICT', 409, details);
  }
}

export class UniqueConstraintViolationError extends ConflictError {
  constructor(field, value, message = null) {
    super(
      message || `Ya existe un registro con el valor '${value}' en el campo '${field}'.`,
      { field, value }
    );
    this.code = 'UNIQUE_VIOLATION';
  }
}

export class ForeignKeyViolationError extends ConflictError {
  constructor(relation, message = null, details = null) {
    super(
      message || `Violación de integridad referencial en la relación '${relation}'. Registro asociado no existe o está protegido contra eliminación.`,
      details
    );
    this.code = 'FOREIGN_KEY_VIOLATION';
  }
}

export class ExclusionViolationError extends ConflictError {
  constructor(message = 'Conflicto de disponibilidad: el barbero o recurso ya se encuentra ocupado en ese rango de tiempo.', details = null) {
    super(message, details);
    this.code = 'EXCLUSION_VIOLATION';
  }
}

export class ValidationError extends DomainError {
  constructor(message, details = null) {
    super(message, 'VALIDATION_ERROR', 422, details);
  }
}

export class ConcurrencyError extends DomainError {
  constructor(message = 'Conflicto de concurrencia al intentar modificar el registro simultáneamente.', details = null) {
    super(message, 'CONCURRENCY_ERROR', 409, details);
  }
}

export class InsufficientStockError extends DomainError {
  constructor(productoId, stockActual, cantidadRequerida) {
    super(
      `Stock insuficiente para el producto ${productoId}. Stock actual: ${stockActual}, solicitado: ${cantidadRequerida}.`,
      'INSUFFICIENT_STOCK',
      422,
      { productoId, stockActual, cantidadRequerida }
    );
  }
}

export class ImmutableRecordError extends DomainError {
  constructor(tableName, operation) {
    super(
      `Operación '${operation}' no permitida sobre la tabla inmutable '${tableName}'.`,
      'IMMUTABLE_RECORD_VIOLATION',
      403,
      { tableName, operation }
    );
  }
}

export class DatabaseConnectionError extends DomainError {
  constructor(message, details = null) {
    super(message, 'DATABASE_CONNECTION_ERROR', 503, details);
  }
}
