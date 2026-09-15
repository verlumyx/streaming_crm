import { z } from 'zod';
import { TRANSACTION_CATEGORIES, type TransactionCategory } from '@/modules/transaction/models/transaction.model';
import { optionalText, requiredUuid } from '@/modules/shared/validation/fields';
import { parseJsonField } from '@/modules/shared/validation/issues';

const toNumber = (v: unknown) => (v === '' || v === null || v === undefined ? undefined : Number(v));

const lineSchema = z.object({
  category: z
    .string({ message: 'La categoría de la línea es obligatoria.' })
    .min(1, 'La categoría de la línea es obligatoria.')
    .refine((v) => (TRANSACTION_CATEGORIES as readonly string[]).includes(v), 'La categoría de la línea no es válida.')
    .transform((v) => v as TransactionCategory),
  amount: z.preprocess(
    toNumber,
    z
      .number({ message: 'El monto de la línea es obligatorio.' })
      .finite('El monto de la línea es obligatorio.')
      .min(0, 'El monto de la línea no puede ser negativo.'),
  ),
  description: optionalText('La descripción de la línea', 255).nullable(),
});

/**
 * Crear: header + one or more lines. The line type (income/expense) is derived from the category on the server.
 * Lines travel as a JSON string in a hidden input.
 */
export const createManualTransactionSchema = z.object({
  id: requiredUuid(),
  date: z.string({ message: 'La fecha es obligatoria.' }).min(1, 'La fecha es obligatoria.').pipe(z.iso.date({ message: 'La fecha no es válida.' })),
  paymentMethod: z
    .string({ message: 'El método de pago es obligatorio.' })
    .trim()
    .min(1, 'El método de pago es obligatorio.')
    .max(30, 'El método de pago no puede superar 30 caracteres.'),
  // The ledger stores ISO 4217 codes (3 chars); the original allowed 10 and could fail on approval.
  currency: z
    .string({ message: 'La moneda es obligatoria.' })
    .trim()
    .length(3, 'La moneda debe ser un código de 3 letras.')
    .transform((v) => v.toUpperCase()),
  reference: optionalText('La referencia', 100),
  description: optionalText('La descripción'),
  notes: optionalText('Las notas'),
  lines: z.preprocess(
    parseJsonField,
    z.array(lineSchema, { message: 'Debe registrar al menos una línea.' }).min(1, 'Debe registrar al menos una línea.'),
  ),
});

export type CreateManualTransactionInput = z.infer<typeof createManualTransactionSchema>;
