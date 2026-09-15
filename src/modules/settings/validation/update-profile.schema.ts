import { z } from 'zod';
import { requiredText } from '@/modules/shared/validation/fields';

/** Perfil (port of `ProfileValidationRules`). Uniqueness is a business rule checked by the service. */
export const updateProfileSchema = z.object({
  name: requiredText('El nombre', 255),
  email: z
    .string({ message: 'El correo es obligatorio.' })
    .trim()
    .min(1, 'El correo es obligatorio.')
    .max(255, 'El correo no puede superar 255 caracteres.')
    .pipe(z.email({ message: 'El correo no es válido.' }))
    // better-auth looks users up by lower-cased email, so it is stored that way.
    .transform((v) => v.toLowerCase()),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
