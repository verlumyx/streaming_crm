'use server';

import { redirect } from 'next/navigation';
import { z } from 'zod';
import { db } from '@/db/client';
import { toActionError, toFieldErrors, type ActionState } from '@/modules/shared/actions/action-state';
import { createLeadContainer } from '@/modules/lead/container';
import { leadRoutes } from '@/modules/lead/routes';
import { createLeadSchema, LEAD_HONEYPOT_FIELD } from '@/modules/lead/validation/create-lead.schema';
import { CreateLeadCommand } from '@/modules/lead/commands/create-lead.command';

/**
 * Public contact form (no session, no company, no permission).
 * Success redirects back to the contact page in its "sent" state (POST → redirect → GET, like the original).
 * A filled honeypot gets the exact same response but nothing is stored.
 */
export async function createLeadAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const isBot = String(formData.get(LEAD_HONEYPOT_FIELD) ?? '').trim() !== '';

  if (!isBot) {
    try {
      const parsed = createLeadSchema.safeParse(Object.fromEntries(formData));
      if (!parsed.success) return toFieldErrors(z.flattenError(parsed.error).fieldErrors);

      await createLeadContainer(db).createService.execute(CreateLeadCommand.fromInput(parsed.data));
    } catch (error) {
      return toActionError(error);
    }
  }

  redirect(leadRoutes.contact({ sent: 1 }));
}
