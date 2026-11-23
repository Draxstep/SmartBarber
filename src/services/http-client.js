/**
 * SmartBarber - Cliente HTTP & Manejo Centralizado de Errores
 * Soporte dual: Solicitudes REST contra VITE_API_URL y Mocks con latencia simulada.
 * Cumplimiento con RNF-09, RNF-10 y especificaciones de diseño.
 */

// Clases de Error Tipadas para la Aplicación
export class HttpError extends Error {
  constructor(status, code, message, details = null) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export class ConflictError extends HttpError {
  constructor(message = 'El horario seleccionado acaba de ser reservado por otro cliente. Por favor elige otro bloque.', details = null) {
    super(409, 'CONFLICT', message, details);
    this.name = 'ConflictError';
  }
}

export class ValidationError extends HttpError {
  constructor(message = 'Datos de solicitud inválidos.', details = null) {
    super(400, 'VALIDATION_ERROR', message, details);
    this.name = 'ValidationError';
  }
}

export class UnauthorizedError extends HttpError {
  constructor(message = 'Credenciales inválidas o sesión expirada.', details = null) {
    super(401, 'UNAUTHORIZED', message, details);
    this.name = 'UnauthorizedError';
  }
}

export class ForbiddenError extends HttpError {
  constructor(message = 'No tienes permisos suficientes para realizar esta acción.', details = null) {
    super(403, 'FORBIDDEN', message, details);
    this.name = 'ForbiddenError';
  }
}

export class RateLimitError extends HttpError {
  constructor(message = 'Demasiadas solicitudes. Por favor espera unos momentos antes de reintentar.', details = null) {
    super(429, 'RATE_LIMIT_EXCEEDED', message, details);
    this.name = 'RateLimitError';
  }
}

export class NetworkError extends HttpError {
  constructor(message = 'Error de conectividad de red o tiempo de espera agotado.') {
    super(0, 'NETWORK_ERROR', message);
    this.name = 'NetworkError';
  }
}

/**
 * Simula latencia de red móvil realista (150ms a 350ms) para pruebas con Mocks.
 * @param {number} [minMs]
 * @param {number} [maxMs]
 * @returns {Promise<void>}
 */
export async function simulateNetworkDelay(minMs = 150, maxMs = 350) {
  const delay = Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;
  return new Promise(resolve => setTimeout(resolve, delay));
}

class HttpClient {
  constructor() {
    this.baseURL = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_URL) || '/api/v1';
    this.timeoutMs = 10000;
  }

  getToken() {
    try {
      return localStorage.getItem('smartbarber_token');
    } catch (_) {
      return null;
    }
  }

  setToken(token) {
    try {
      if (token) {
        localStorage.setItem('smartbarber_token', token);
      } else {
        localStorage.removeItem('smartbarber_token');
      }
    } catch (_) {}
  }

  getHeaders(customHeaders = {}) {
    const headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...customHeaders
    };

    const token = this.getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    return headers;
  }

  async request(endpoint, options = {}) {
    const url = endpoint.startsWith('http') ? endpoint : `${this.baseURL}${endpoint}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers: this.getHeaders(options.headers)
      });

      clearTimeout(timeoutId);

      const contentType = response.headers.get('content-type') || '';
      let data = null;
      if (contentType.includes('application/json')) {
        data = await response.json();
      } else {
        data = await response.text();
      }

      if (!response.ok) {
        this.handleErrorResponse(response.status, data);
      }

      if (data && typeof data === 'object') {
        if (data.ok === undefined && data.success !== undefined) {
          data.ok = data.success;
        }
      }

      return data;
    } catch (err) {
      clearTimeout(timeoutId);

      if (err instanceof HttpError) {
        throw err;
      }
      if (err.name === 'AbortError') {
        throw new NetworkError('La solicitud superó el tiempo límite de 10 segundos.');
      }
      throw new NetworkError(err.message || 'No fue posible comunicarse con el servidor.');
    }
  }

  handleErrorResponse(status, data) {
    const errCode = data?.error?.code || 'ERROR';
    const message = data?.error?.message || 'Error en la solicitud.';
    const details = data?.error?.details || null;

    switch (status) {
      case 400:
        throw new ValidationError(message, details);
      case 401:
        this.setToken(null);
        throw new UnauthorizedError(message, details);
      case 403:
        throw new ForbiddenError(message, details);
      case 409:
        throw new ConflictError(message, details);
      case 429:
        throw new RateLimitError(message, details);
      default:
        throw new HttpError(status, errCode, message, details);
    }
  }

  get(endpoint, headers = {}) {
    return this.request(endpoint, { method: 'GET', headers });
  }

  post(endpoint, body = {}, headers = {}) {
    return this.request(endpoint, {
      method: 'POST',
      body: JSON.stringify(body),
      headers
    });
  }

  put(endpoint, body = {}, headers = {}) {
    return this.request(endpoint, {
      method: 'PUT',
      body: JSON.stringify(body),
      headers
    });
  }

  patch(endpoint, body = {}, headers = {}) {
    return this.request(endpoint, {
      method: 'PATCH',
      body: JSON.stringify(body),
      headers
    });
  }

  delete(endpoint, headers = {}) {
    return this.request(endpoint, { method: 'DELETE', headers });
  }
}

export const httpClient = new HttpClient();
