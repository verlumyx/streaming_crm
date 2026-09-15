/** Shape of the `error` object returned by every better-auth client call. */
export interface AuthClientError {
  code?: string | undefined;
  message?: string | undefined;
  status: number;
  statusText: string;
}

const MESSAGES_BY_CODE: Record<string, string> = {
  INVALID_EMAIL_OR_PASSWORD: 'Credenciales incorrectas.',
  INVALID_EMAIL: 'Ingresa un correo válido.',
  INVALID_PASSWORD: 'Credenciales incorrectas.',
  USER_NOT_FOUND: 'Credenciales incorrectas.',
  EMAIL_NOT_VERIFIED: 'Debes verificar tu correo antes de entrar.',
  BANNED_USER: 'Tu cuenta está suspendida. Contacta a soporte.',
  PASSWORD_TOO_SHORT: 'La contraseña debe tener al menos 8 caracteres.',
  PASSWORD_TOO_LONG: 'La contraseña es demasiado larga.',
  INVALID_TOKEN: 'El enlace no es válido o ha expirado. Solicita uno nuevo.',
  INVALID_CODE: 'El código no es válido.',
  INVALID_BACKUP_CODE: 'El código de recuperación no es válido.',
  OTP_HAS_EXPIRED: 'El código ha expirado. Genera uno nuevo en tu app.',
  TOO_MANY_ATTEMPTS_REQUEST_NEW_CODE: 'Demasiados intentos. Genera un código nuevo.',
  ACCOUNT_TEMPORARILY_LOCKED: 'La cuenta está bloqueada temporalmente. Intenta más tarde.',
  TWO_FACTOR_NOT_ENABLED: 'La verificación en dos pasos no está activa para esta cuenta.',
  VERIFICATION_EMAIL_NOT_ENABLED: 'La verificación por correo no está disponible.',
};

export const RATE_LIMIT_MESSAGE = 'Demasiados intentos. Intenta de nuevo en un minuto.';

/** Maps a better-auth client error to Spanish copy; unknown codes fall back to `fallback`. */
export function authErrorMessage(error: AuthClientError | null | undefined, fallback: string): string {
  if (!error) return fallback;
  if (error.status === 429) return RATE_LIMIT_MESSAGE;
  if (error.code && MESSAGES_BY_CODE[error.code]) return MESSAGES_BY_CODE[error.code];
  return fallback;
}
