import { z } from 'zod';
import { requiredEmailField } from './update-user.schema';

/** Step 1 of the create flow: only the email. */
export const checkUserEmailSchema = z.object({ email: requiredEmailField });

export type CheckUserEmailInput = z.infer<typeof checkUserEmailSchema>;
