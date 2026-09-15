import { z } from 'zod';
import { optionalText, requiredUuid } from '@/modules/shared/validation/fields';
import { refundAmount } from './refund-fields';

/** Crear. Whether the sale belongs to the company and admits a refund is checked by the service. */
export const createRefundSchema = z.object({
  id: requiredUuid(),
  saleId: z
    .string({ message: 'La venta es obligatoria.' })
    .trim()
    .min(1, 'La venta es obligatoria.')
    .pipe(z.uuid({ message: 'La venta no existe.' })),
  amount: refundAmount(),
  reason: optionalText('La razón', 255),
});

export type CreateRefundInput = z.infer<typeof createRefundSchema>;
