import { z } from 'zod';
import { requiredText } from '@/modules/shared/validation/fields';

/** Hidden field bots tend to fill. A non-empty value is silently accepted and discarded. */
export const LEAD_HONEYPOT_FIELD = 'website';

/** Public contact form. The phone arrives already joined (`+58 4121234567`). */
export const createLeadSchema = z.object({
  name: requiredText('El nombre', 255),
  email: z
    .string({ message: 'El correo es obligatorio.' })
    .trim()
    .min(1, 'El correo es obligatorio.')
    .max(255, 'El correo no puede superar 255 caracteres.')
    .refine((v) => v === '' || z.email().safeParse(v).success, { message: 'Ingresa un correo válido.' }),
  phone: requiredText('El teléfono', 30),
});

export type CreateLeadInput = z.infer<typeof createLeadSchema>;
