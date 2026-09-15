import { z } from 'zod';
import { optionalText, requiredUuid } from '@/modules/shared/validation/fields';
import { requiredIsoDate, uuidList } from './sale-fields';

/**
 * Crear. `profileIds` arrives as `formData.getAll('profileIds')`.
 * Client status, plan/profile coherence and availability are business rules (service).
 */
export const createSaleSchema = z.object({
  id: requiredUuid(),
  clientId: requiredUuid('Selecciona un cliente.'),
  planId: requiredUuid('Selecciona un plan.'),
  startDate: requiredIsoDate('La fecha de inicio'),
  profileIds: uuidList('Uno o más perfiles no son válidos.').min(1, 'Selecciona al menos un perfil.'),
  notes: optionalText('La nota'),
});

export type CreateSaleInput = z.infer<typeof createSaleSchema>;
