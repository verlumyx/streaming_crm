import type { z } from 'zod';
import { renewSaleSchema } from './renew-sale.schema';
import { uuidList } from './sale-fields';

/** Reactivar: same fields as Renovar plus optional replacement profiles (`formData.getAll('profileIds')`). */
export const reactivateSaleSchema = renewSaleSchema.extend({
  profileIds: uuidList('Uno o más perfiles no son válidos.').default([]),
});

export type ReactivateSaleInput = z.infer<typeof reactivateSaleSchema>;
