import { z } from 'zod';
import { requiredText, requiredUuid } from '@/modules/shared/validation/fields';
import { CLAIM_DESCRIPTION_MAX, claimChannel, claimClientId } from './claim-fields';

/** Crear. Que el cliente pertenezca a la empresa lo verifica el servicio. */
export const createClaimSchema = z.object({
  id: requiredUuid(),
  clientId: claimClientId(),
  subject: requiredText('El asunto', 150),
  description: requiredText('La descripción', CLAIM_DESCRIPTION_MAX),
  channel: claimChannel(),
});

export type CreateClaimInput = z.infer<typeof createClaimSchema>;
