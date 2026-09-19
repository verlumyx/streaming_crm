import { z } from 'zod';
import { CLAIM_STATUSES } from '../models/claim.model';
import { claimResolutionNotes } from './claim-fields';

/** Actualizar Estado. Las notas son opcionales y sólo se guardan si vienen en el formulario. */
export const updateStatusClaimSchema = z.object({
  status: z.enum(CLAIM_STATUSES, { message: 'El estado no es válido.' }),
  resolutionNotes: claimResolutionNotes(),
});

export type UpdateStatusClaimInput = z.infer<typeof updateStatusClaimSchema>;
