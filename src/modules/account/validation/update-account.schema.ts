import { z } from 'zod';
import { optionalText } from '@/modules/shared/validation/fields';
import { ACCOUNT_STATUSES, PROFILE_STATUSES } from '../models/account.model';
import {
  jsonArray,
  optionalPassword,
  profileNumber,
  profileText,
  requiredAccountEmail,
  requiredAmount,
  requiredIsoDate,
} from './account-fields';

const updateProfileLine = z.object({
  number: profileNumber,
  pin: profileText('El PIN', 10),
  status: z.preprocess(
    (v) => (v === '' || v === null ? undefined : v),
    z.enum(PROFILE_STATUSES, { message: 'El estado del perfil no es válido.' }).optional(),
  ),
  notes: profileText('La nota del perfil'),
});

/**
 * Actualizar. The service is immutable (not accepted here). Blank password keeps the current one.
 * "Profile belongs to the account" and status transitions are checked by the service.
 */
export const updateAccountSchema = z
  .object({
    email: requiredAccountEmail,
    password: optionalPassword,
    cost: requiredAmount('El costo'),
    purchaseDate: requiredIsoDate('La fecha de compra'),
    nextRenewal: requiredIsoDate('La próxima renovación'),
    status: z.enum(ACCOUNT_STATUSES, { message: 'El estado no es válido.' }),
    notes: optionalText('La nota'),
    profiles: jsonArray(updateProfileLine),
  })
  .superRefine((data, ctx) => {
    if (data.nextRenewal < data.purchaseDate) {
      ctx.addIssue({
        code: 'custom',
        path: ['nextRenewal'],
        message: 'La próxima renovación no puede ser anterior a la fecha de compra.',
      });
    }
  });

export type UpdateAccountInput = z.infer<typeof updateAccountSchema>;
