import type { PasswordFormErrors } from '../ui/types/Settings';

/** Shape of the `error` returned by every better-auth client call. */
export type AuthClientErrorLike = { code?: string | undefined; message?: string | undefined; status: number };

export const RATE_LIMIT_MESSAGE = 'Demasiados intentos. Intenta de nuevo en un minuto.';

const MESSAGES_BY_CODE: Record<string, string> = {
  INVALID_PASSWORD: 'La contraseña es incorrecta.',
  PASSWORD_TOO_SHORT: 'La contraseña debe tener al menos 8 caracteres.',
  PASSWORD_TOO_LONG: 'La contraseña es demasiado larga.',
  CREDENTIAL_ACCOUNT_NOT_FOUND: 'Tu cuenta no tiene una contraseña configurada.',
  INVALID_CODE: 'El código no es válido.',
  OTP_HAS_EXPIRED: 'El código ha expirado. Genera uno nuevo en tu app.',
  TOO_MANY_ATTEMPTS_REQUEST_NEW_CODE: 'Demasiados intentos. Genera un código nuevo.',
  TOTP_ALREADY_ENABLED: 'La autenticación de dos factores ya está activada.',
  TOTP_NOT_ENABLED: 'La autenticación de dos factores no está configurada.',
  TWO_FACTOR_NOT_ENABLED: 'La autenticación de dos factores no está activada.',
  EMAIL_ALREADY_VERIFIED: 'Tu correo ya está verificado.',
  EMAIL_MISMATCH: 'Recarga la página e intenta de nuevo.',
  VERIFICATION_EMAIL_NOT_ENABLED: 'La verificación por correo no está disponible.',
  SESSION_EXPIRED: 'Tu sesión ha expirado. Inicia sesión de nuevo.',
};

/** Maps a better-auth client error to Spanish copy; unknown codes fall back to `fallback`. */
export function settingsAuthErrorMessage(error: AuthClientErrorLike | null | undefined, fallback: string): string {
  if (!error) return fallback;
  if (error.status === 429) return RATE_LIMIT_MESSAGE;
  if (error.code && MESSAGES_BY_CODE[error.code]) return MESSAGES_BY_CODE[error.code];
  return fallback;
}

/** `authClient.changePassword` error → field errors of the password form. */
export function changePasswordErrors(error: AuthClientErrorLike): PasswordFormErrors {
  if (error.status === 429) return { form: RATE_LIMIT_MESSAGE };

  switch (error.code) {
    case 'INVALID_PASSWORD':
      return { currentPassword: 'La contraseña actual es incorrecta.' };
    case 'PASSWORD_TOO_SHORT':
    case 'PASSWORD_TOO_LONG':
      return { password: settingsAuthErrorMessage(error, '') };
    default:
      return { form: settingsAuthErrorMessage(error, 'No pudimos actualizar la contraseña. Intenta de nuevo.') };
  }
}
