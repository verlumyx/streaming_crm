import { z } from 'zod';

export const PASSWORD_MIN_LENGTH = 8;

/**
 * Contraseña (port of `PasswordValidationRules`). The change itself runs through
 * `authClient.changePassword`, which verifies the current password; this schema is
 * the client-side shape check before calling it.
 */
export const changePasswordSchema = z
  .object({
    currentPassword: z.string({ message: 'La contraseña actual es obligatoria.' }).min(1, 'La contraseña actual es obligatoria.'),
    password: z
      .string({ message: 'La nueva contraseña es obligatoria.' })
      .min(1, 'La nueva contraseña es obligatoria.')
      .min(PASSWORD_MIN_LENGTH, `La contraseña debe tener al menos ${PASSWORD_MIN_LENGTH} caracteres.`),
    passwordConfirmation: z.string().optional().default(''),
  })
  .superRefine((data, ctx) => {
    if (data.password !== data.passwordConfirmation) {
      ctx.addIssue({ code: 'custom', path: ['password'], message: 'La confirmación de la contraseña no coincide.' });
    }
  });

export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
