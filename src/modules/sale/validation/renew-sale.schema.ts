import { z } from 'zod';
import { optionalText, requiredUuid } from '@/modules/shared/validation/fields';
import { optionalAmount, optionalInteger } from './sale-fields';

/** Renovar. Empty duration / price → the sale snapshot is used. `id` is the renewal id (UUID v7 from the client). */
export const renewSaleSchema = z.object({
  id: requiredUuid(),
  durationDays: optionalInteger('La duración', 1),
  price: optionalAmount('El precio', 0),
  notes: optionalText('La nota'),
});

export type RenewSaleInput = z.infer<typeof renewSaleSchema>;
