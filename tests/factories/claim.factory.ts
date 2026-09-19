import type { DbExecutor } from '@/modules/shared/infrastructure/db-executor';
import { formatSequentialCode } from '@/modules/shared/infrastructure/sequential-code';
import { uuidv7 } from '@/modules/shared/uuid';
import { claims, CLAIM_CODE_PREFIX, type ClaimRow, type NewClaimRow } from '@/modules/claim/models/claim.model';
import type { ClientRow } from '@/modules/client/models/client.model';
import { defined } from './utils';

let sequence = 0;

/** Un reclamo de `client`. Por defecto: abierto, canal whatsapp, código `REC5000NN`. */
export async function createClaim(
  db: DbExecutor,
  client: ClientRow,
  overrides: Partial<Omit<NewClaimRow, 'clientId' | 'companyId'>> = {},
): Promise<ClaimRow> {
  sequence++;
  const resolved = overrides.status === 'resolved' || overrides.status === 'closed';
  const [row] = await db
    .insert(claims)
    .values({
      id: uuidv7(),
      companyId: client.companyId,
      code: formatSequentialCode(CLAIM_CODE_PREFIX, 500000 + sequence),
      clientId: client.id,
      subject: `Reclamo de prueba ${sequence}`,
      description: 'El cliente reporta un problema con su cuenta.',
      channel: 'whatsapp',
      status: 'open',
      resolvedAt: resolved ? new Date() : null,
      ...defined(overrides),
    })
    .returning();
  return row;
}
