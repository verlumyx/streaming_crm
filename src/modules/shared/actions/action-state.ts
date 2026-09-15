import { ConflictError, DomainError, ForbiddenError, ValidationError } from '@/modules/shared/exceptions/domain-error';

export type ActionState = {
  status: 'idle' | 'error' | 'conflict';
  message?: string;
  fieldErrors?: Record<string, string[] | undefined>;
  details?: Record<string, unknown>;
};

export const initialActionState: ActionState = { status: 'idle' };

/**
 * Maps expected failures to a serializable state. Unknown errors are rethrown on purpose
 * so the Next.js error boundary surfaces them instead of hiding a bug behind a toast.
 */
export function toActionError(error: unknown): ActionState {
  if (error instanceof ForbiddenError) {
    return { status: 'error', message: error.message };
  }
  if (error instanceof ValidationError) {
    return { status: 'error', message: error.message, fieldErrors: { [error.field]: [error.message] } };
  }
  if (error instanceof ConflictError) {
    return { status: 'conflict', message: error.message, details: error.details };
  }
  if (error instanceof DomainError) {
    return { status: 'error', message: error.message };
  }
  throw error;
}

/** Zod `flatten().fieldErrors` → ActionState. */
export function toFieldErrors(fieldErrors: Record<string, string[] | undefined>): ActionState {
  return { status: 'error', fieldErrors, message: 'Revisa los campos del formulario.' };
}
