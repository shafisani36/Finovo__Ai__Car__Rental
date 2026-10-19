export class ApiError extends Error {
  public readonly status: number;
  public readonly code: string;
  public readonly details?: unknown;
  public readonly correlationId?: string;
  public readonly timestamp: string;

  constructor(
    message: string,
    status: number = 500,
    code: string = 'INTERNAL_ERROR',
    details?: unknown,
    correlationId?: string
  ) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
    this.correlationId = correlationId;
    this.timestamp = new Date().toISOString();
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class ValidationError extends ApiError {
  constructor(message: string = 'Validation failed', details?: unknown, correlationId?: string) {
    super(message, 400, 'VALIDATION_ERROR', details, correlationId);
    this.name = 'ValidationError';
  }
}

export class AuthenticationError extends ApiError {
  constructor(message: string = 'Authentication required', details?: unknown, correlationId?: string) {
    super(message, 401, 'UNAUTHENTICATED', details, correlationId);
    this.name = 'AuthenticationError';
  }
}

export class ForbiddenError extends ApiError {
  constructor(message: string = 'Access denied', details?: unknown, correlationId?: string) {
    super(message, 403, 'FORBIDDEN', details, correlationId);
    this.name = 'ForbiddenError';
  }
}

export class NotFoundError extends ApiError {
  constructor(message: string = 'Requested resource not found', details?: unknown, correlationId?: string) {
    super(message, 404, 'NOT_FOUND', details, correlationId);
    this.name = 'NotFoundError';
  }
}

export class ConflictError extends ApiError {
  constructor(message: string = 'Resource conflict or concurrency collision', details?: unknown, correlationId?: string) {
    super(message, 409, 'CONFLICT', details, correlationId);
    this.name = 'ConflictError';
  }
}

export class NetworkError extends ApiError {
  constructor(message: string = 'Network failure or server is unreachable', details?: unknown) {
    super(message, 0, 'NETWORK_ERROR', details);
    this.name = 'NetworkError';
  }
}

export class TimeoutError extends ApiError {
  constructor(message: string = 'Request timed out after waiting for server response') {
    super(message, 408, 'REQUEST_TIMEOUT');
    this.name = 'TimeoutError';
  }
}

/**
 * Normalizes any error or rejected promise into a typed ApiError instance
 */
export function normalizeApiError(error: unknown): ApiError {
  if (error instanceof ApiError) {
    return error;
  }

  if (error instanceof DOMException && error.name === 'AbortError') {
    return new TimeoutError();
  }

  if (error instanceof TypeError && error.message.includes('fetch')) {
    return new NetworkError(error.message);
  }

  if (error && typeof error === 'object') {
    const errObj = error as { message?: string; status?: number; code?: string; details?: unknown; correlationId?: string };
    const status = errObj.status || 500;
    const message = errObj.message || (error instanceof Error ? error.message : 'An unexpected server error occurred');
    const code = errObj.code || (status === 400 ? 'VALIDATION_ERROR' : status === 401 ? 'UNAUTHENTICATED' : status === 403 ? 'FORBIDDEN' : status === 404 ? 'NOT_FOUND' : status === 409 ? 'CONFLICT' : 'SERVER_ERROR');

    switch (status) {
      case 400:
        return new ValidationError(message, errObj.details, errObj.correlationId);
      case 401:
        return new AuthenticationError(message, errObj.details, errObj.correlationId);
      case 403:
        return new ForbiddenError(message, errObj.details, errObj.correlationId);
      case 404:
        return new NotFoundError(message, errObj.details, errObj.correlationId);
      case 409:
        return new ConflictError(message, errObj.details, errObj.correlationId);
      default:
        return new ApiError(message, status, code, errObj.details, errObj.correlationId);
    }
  }

  return new ApiError('An unexpected server error occurred', 500, 'UNKNOWN_ERROR', error);
}
