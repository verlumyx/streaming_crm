import { z } from 'zod';
import { optionalText } from '@/modules/shared/validation/fields';
import { refundAmount } from './refund-fields';

/** Actualizar: amount and reason only (never the id nor the sale). */
export const updateRefundSchema = z.object({
  amount: refundAmount(),
  reason: optionalText('La razón', 255),
});

export type UpdateRefundInput = z.infer<typeof updateRefundSchema>;
