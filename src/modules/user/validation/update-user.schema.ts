import { z } from 'zod';
import { isUuid } from '@/modules/shared/uuid';
import { requiredText } from '@/modules/shared/validation/fields';

export const PASSWORD_MIN_LENGTH = 8;

/** Required email, trimmed and lower-cased (better-auth looks users up by the lower-cased email). */
export const requiredEmailField = z
  .string({ message: 'El email es obligatorio.' })
  .trim()
  .min(1, 'El email es obligatorio.')
  .max(255, 'El email no puede superar 255 caracteres.')
  .refine((v) => v === '' || z.email().safeParse(v).success, { message: 'El email no es válido.' })
  .transform((v) => v.toLowerCase());

/** Optional password from a form: `''` / missing → `null`. Never trimmed. */
export const optionalPasswordField = z
  .string()
  .optional()
  .transform((v) => (v ? v : null));

/** Optional role id from the picker: `''` / missing → `null`. Company ownership is checked by the service. */
export const optionalRoleIdField = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v ? v : null))
  .refine((v) => v === null || isUuid(v), { message: 'El rol seleccionado no es válido.' });

/** Password rules shared by Crear (required for new users) and Actualizar (optional). */
export function checkPassword(
  data: { password: string | null; passwordConfirmation: string | null },
  ctx: z.RefinementCtx,
  required: boolean,
): void {
  if (!data.password) {
    if (required) ctx.addIssue({ code: 'custom', path: ['password'], message: 'La contraseña es obligatoria.' });
    return;
  }
  if (data.password.length < PASSWORD_MIN_LENGTH) {
    ctx.addIssue({
      code: 'custom',
      path: ['password'],
      message: `La contraseña debe tener al menos ${PASSWORD_MIN_LENGTH} caracteres.`,
    });
  }
  if (data.password.length > 255) {
    ctx.addIssue({ code: 'custom', path: ['password'], message: 'La contraseña no puede superar 255 caracteres.' });
  }
  if (data.password !== data.passwordConfirmation) {
    ctx.addIssue({ code: 'custom', path: ['password'], message: 'La confirmación de la contraseña no coincide.' });
  }
}

/** Actualizar: global user data + optional new password + role in the current company. */
export const updateUserSchema = z
  .object({
    name: requiredText('El nombre', 255),
    email: requiredEmailField,
    password: optionalPasswordField,
    passwordConfirmation: optionalPasswordField,
    roleId: optionalRoleIdField,
  })
  .superRefine((data, ctx) => checkPassword(data, ctx, false));

export type UpdateUserInput = z.infer<typeof updateUserSchema>;
