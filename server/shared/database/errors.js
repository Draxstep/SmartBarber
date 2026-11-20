/**
 * @file errors.js
 * @description Mapeador de errores nativos de PostgreSQL a excepciones tipadas de dominio.
 */
import {
  UniqueConstraintViolationError,
  ForeignKeyViolationError,
  ExclusionViolationError,
  ValidationError,
  ConcurrencyError,
  ImmutableRecordError,
  DatabaseConnectionError,
  DomainError
} from '../errors/domainErrors.js';

/**
 * Traduce un error nativo de PostgreSQL o de conexión a un error de dominio tipado
 * @param {Error} error
 * @param {string} [contextMessage='Operación en base de datos fallida']
 * @returns {DomainError}
 */
export function mapDatabaseError(error, contextMessage = 'Operación en base de datos fallida') {
  if (error instanceof DomainError) {
    return error;
  }

  const code = error.code;
  const detail = error.detail || '';
  const message = error.message || '';

  // 23505: unique_violation
  if (code === '23505') {
    const match = detail.match(/Key \((.+?)\)=\((.+?)\) already exists/);
    const field = match ? match[1] : error.constraint || 'campo_unico';
    const value = match ? match[2] : 'desconocido';
    return new UniqueConstraintViolationError(field, value, `Violación de unicidad: ${detail || message}`);
  }

  // 23503: foreign_key_violation
  if (code === '23503') {
    return new ForeignKeyViolationError(
      error.table || 'entidad_asociada',
      `Restricción de llave foránea violada en ${error.constraint || error.table}: ${detail || message}`,
      { constraint: error.constraint, detail }
    );
  }

  // 23502: not_null_violation
  if (code === '23502') {
    return new ValidationError(
      `Campo obligatorio no puede ser nulo: columna '${error.column || 'desconocida'}' en '${error.table || 'tabla'}'.`,
      { column: error.column, table: error.table }
    );
  }

  // 23514: check_violation
  if (code === '23514') {
    return new ValidationError(
      `Restricción de validación (CHECK) falló en '${error.constraint || 'tabla'}': ${message}`,
      { constraint: error.constraint, table: error.table }
    );
  }

  // 23P01: exclusion_violation (Solapamiento de rangos GiST en citas u horarios)
  if (code === '23P01') {
    return new ExclusionViolationError(
      'Conflicto de agenda (Exclusión GiST): El barbero ya tiene una cita o bloqueo activo que se solapa con el bloque horario solicitado.',
      { constraint: error.constraint, detail }
    );
  }

  // P0001: raise_exception (Triggers de inmutabilidad u otras validaciones PL/pgSQL)
  if (code === 'P0001') {
    if (message.includes('inmutable') || message.includes('Operación no permitida')) {
      return new ImmutableRecordError(error.table || 'kardex_o_historial', 'MODIFICACIÓN');
    }
    return new ValidationError(`Regla de negocio infringida: ${message}`);
  }

  // 40001 (serialization_failure) o 40P01 (deadlock_detected)
  if (code === '40001' || code === '40P01') {
    return new ConcurrencyError(
      `Conflicto de concurrencia detectado (${code}): reintente la transacción.`,
      { code, detail }
    );
  }

  // Errores de red o conexión
  if (code === 'ECONNREFUSED' || code === 'ETIMEDOUT' || code === '57P01' || code === '08006') {
    return new DatabaseConnectionError(
      `Fallo de conexión con la base de datos PostgreSQL: ${message}`,
      { code }
    );
  }

  // Fallback
  return new DomainError(
    `${contextMessage}: ${message}`,
    'DATABASE_ERROR',
    500,
    { originalCode: code, detail }
  );
}
