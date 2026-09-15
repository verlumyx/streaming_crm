/** Base class for every expected business failure. Actions map it to an error state; pages may map subclasses to 404. */
export class DomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DomainError';
  }
}

export class NotFoundError extends DomainError {
  constructor(message = 'El recurso solicitado no existe.') {
    super(message);
    this.name = 'NotFoundError';
  }
}

/** Business-rule failure bound to a form field (e.g. an email already in use). Actions map it to `fieldErrors`. */
export class ValidationError extends DomainError {
  readonly field: string;

  constructor(field: string, message: string) {
    super(message);
    this.name = 'ValidationError';
    this.field = field;
  }
}

export class ForbiddenError extends DomainError {
  readonly action: string;

  constructor(action: string, message = 'No tienes permiso para acceder a esta sección.') {
    super(message);
    this.name = 'ForbiddenError';
    this.action = action;
  }
}

export class ConflictError extends DomainError {
  readonly details: Record<string, unknown>;

  constructor(message: string, details: Record<string, unknown> = {}) {
    super(message);
    this.name = 'ConflictError';
    this.details = details;
  }
}
