import { z } from 'zod';
import { requiredText } from '@/modules/shared/validation/fields';
import { CLAIM_DESCRIPTION_MAX, claimChannel, claimClientId } from './claim-fields';

/** Actualizar: datos del reclamo (nunca el id, el estado ni las notas de resolución). */
export const updateClaimSchema = z.object({
  clientId: claimClientId(),
  subject: requiredText('El asunto', 150),
  description: requiredText('La descripción', CLAIM_DESCRIPTION_MAX),
  channel: claimChannel(),
});

export type UpdateClaimInput = z.infer<typeof updateClaimSchema>;
