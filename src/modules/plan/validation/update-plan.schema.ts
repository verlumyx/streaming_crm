import { z } from 'zod';
import { PLAN_CAPACITIES, PLAN_DURATIONS } from '../models/plan.model';
import { requiredText, requiredUuid } from '@/modules/shared/validation/fields';

/** `''` / whitespace from a form → `undefined`, so a blank number reports "obligatorio". */
const blankToUndefined = (value: unknown) => (typeof value === 'string' && value.trim() === '' ? undefined : value);

const requiredNumber = (label: string) =>
  z.coerce.number({ message: `${label} es obligatorio.` }).refine(Number.isFinite, `${label} no es válido.`);

/**
 * Actualizar. Also the base of the create schema.
 * That the service belongs to the company is a business rule (service → `PlanInvalidServiceException`).
 * Upper bounds match the `numeric(10,2)` / `numeric(5,2)` columns.
 */
export const updatePlanSchema = z.object({
  serviceId: requiredUuid('Selecciona un servicio válido.'),
  name: requiredText('El nombre', 150),
  capacity: z.enum(PLAN_CAPACITIES, { message: 'La capacidad no es válida.' }),
  durationDays: z.preprocess(
    blankToUndefined,
    requiredNumber('La duración').pipe(
      z
        .number()
        .refine((days) => (PLAN_DURATIONS as readonly number[]).includes(days), 'La duración debe ser 1, 3, 7, 15 o 30 días.'),
    ),
  ),
  salePrice: z.preprocess(
    blankToUndefined,
    requiredNumber('El precio de venta').pipe(
      z
        .number()
        .min(0, 'El precio de venta no puede ser negativo.')
        .max(99_999_999.99, 'El precio de venta es demasiado alto.'),
    ),
  ),
  roiTargetPct: z.preprocess(
    blankToUndefined,
    requiredNumber('La meta de ROI').pipe(
      z.number().min(0, 'La meta de ROI no puede ser negativa.').max(999.99, 'La meta de ROI no puede superar 999,99%.'),
    ),
  ),
});

export type UpdatePlanInput = z.infer<typeof updatePlanSchema>;
