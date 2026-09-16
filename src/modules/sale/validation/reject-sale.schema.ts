import { z } from 'zod';
import { requiredText } from '@/modules/shared/validation/fields';

/** Rechazar (the payment of a pending sale was not verified). */
export const rejectSaleSchema = z.object({
  rejectionReason: requiredText('El motivo', 255),
});

export type RejectSaleInput = z.infer<typeof rejectSaleSchema>;
