import { z } from 'zod';
import { isUuid } from '@/modules/shared/uuid';
import { optionalText, requiredUuid } from '@/modules/shared/validation/fields';
import {
  checkPassword,
  optionalPasswordField,
  optionalRoleIdField,
  requiredEmailField,
} from './update-user.schema';

/**
 * Crear (step 2 of the invite flow). With `existingUserId` only a membership is added, so name and
 * password are ignored; otherwise both are required. Email uniqueness is a business rule (service).
 */
export const createUserSchema = z
  .object({
    id: requiredUuid(),
    existingUserId: z
      .string()
      .trim()
      .optional()
      .transform((v) => (v ? v : null))
      .refine((v) => v === null || isUuid(v), { message: 'El usuario existente no es válido.' }),
    email: requiredEmailField,
    name: optionalText('El nombre', 255),
    password: optionalPasswordField,
    passwordConfirmation: optionalPasswordField,
    roleId: optionalRoleIdField,
  })
  .superRefine((data, ctx) => {
    if (data.existingUserId) return;
    if (!data.name) ctx.addIssue({ code: 'custom', path: ['name'], message: 'El nombre es obligatorio.' });
    checkPassword(data, ctx, true);
  })
  .transform((data) =>
    data.existingUserId ? { ...data, name: null, password: null, passwordConfirmation: null } : data,
  );

export type CreateUserInput = z.infer<typeof createUserSchema>;
