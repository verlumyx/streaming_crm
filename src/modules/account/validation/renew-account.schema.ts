import { z } from 'zod';
import { optionalText, requiredUuid } from '@/modules/shared/validation/fields';
import { requiredAmount, requiredIsoDate } from './account-fields';

/** Registrar renovación. "Strictly after the current next renewal" is checked by the service. */
export const renewAccountSchema = z.object({
  id: requiredUuid(),
  amount: requiredAmount('El monto'),
  nextRenewal: requiredIsoDate('La nueva fecha de vencimiento'),
  notes: optionalText('La nota'),
});

export type RenewAccountInput = z.infer<typeof renewAccountSchema>;
