export class DatabaseError extends Error {
  code: string;

  constructor(message: string, code: string) {
    super(message);
    this.name = 'DatabaseError';
    this.code = code;
  }
}

export class ValidationError extends Error {
  field?: string;

  constructor(message: string, field?: string) {
    super(message);
    this.name = 'ValidationError';
    this.field = field;
  }
}

export class AuthenticationError extends Error {
  constructor(message: string = 'Authentication required') {
    super(message);
    this.name = 'AuthenticationError';
  }
}

export class AuthorizationError extends Error {
  constructor(message: string = 'Access denied') {
    super(message);
    this.name = 'AuthorizationError';
  }
}

export class NotFoundError extends Error {
  resource: string;

  constructor(resource: string, id?: string | number) {
    const message = id ? `${resource} with id ${id} not found` : `${resource} not found`;
    super(message);
    this.name = 'NotFoundError';
    this.resource = resource;
  }
}

export interface ApiErrorResponse {
  error: string;
  code?: string;
  field?: string;
  details?: unknown;
}

export function isErrorWithMessage(error: unknown): error is { message: string } {
  return (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    typeof (error as { message: unknown }).message === 'string'
  );
}

export function isErrorWithCode(error: unknown): error is { code: string } {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    typeof (error as { code: unknown }).code === 'string'
  );
}

export function getErrorMessage(error: unknown): string {
  if (isErrorWithMessage(error)) {
    return error.message;
  }
  return 'Unknown error occurred';
}

export function getErrorCode(error: unknown): string | undefined {
  if (isErrorWithCode(error)) {
    return error.code;
  }
  return undefined;
}
