import { z } from 'zod';
import { optionalText, requiredText } from '@/modules/shared/validation/fields';
import { checkboxFlag, optionalAmount } from './sale-fields';

/** Expulsar. `refundAmount` is required only when `createRefund` is checked. */
export const cancelSaleSchema = z
  .object({
    cancellationReason: requiredText('El motivo', 255),
    createRefund: checkboxFlag(),
    refundAmount: optionalAmount('El monto a reembolsar', 0.01, '0,01'),
    refundReason: optionalText('La razón del reembolso', 255),
  })
  .superRefine((value, ctx) => {
    if (value.createRefund && value.refundAmount === null) {
      ctx.addIssue({ code: 'custom', path: ['refundAmount'], message: 'El monto a reembolsar es obligatorio.' });
    }
  });

export type CancelSaleInput = z.infer<typeof cancelSaleSchema>;
