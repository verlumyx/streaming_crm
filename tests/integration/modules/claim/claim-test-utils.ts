import { asc, eq } from 'drizzle-orm';
import { db } from '@/db/client';
import { initialActionState } from '@/modules/shared/actions/action-state';
import { uuidv7 } from '@/modules/shared/uuid';
import { claims, type ClaimRow } from '@/modules/claim/models/claim.model';
import type { ClientRow } from '@/modules/client/models/client.model';
import type { CompanyRow } from '@/modules/company/models/company.model';
import type { UserRow } from '@/db/auth-schema';
import { createClaimAction, updateClaimAction, updateStatusClaimAction } from '@/app/[companyId]/claims/actions';
import { setSessionUser } from '../../../helpers/session-mock';
import { createUserWithCompany } from '../../../helpers/company-context';
import { createClient } from '../../../factories/client.factory';
import { formData } from '../../../helpers/form-data';

export const forbiddenUrl = (companyId: string) => `/${companyId}/dashboard?error=forbidden`;
export const FORBIDDEN_MESSAGE = 'No tienes permiso para acceder a esta sección.';
export const CLOSED_MESSAGE = 'El reclamo está cerrado y ya no puede modificarse.';

export type ClaimContext = { user: UserRow; company: CompanyRow; client: ClientRow };

/** Usuario admin + empresa + un cliente, con la sesión iniciada. */
export async function claimContext(): Promise<ClaimContext> {
  const { user, company } = await createUserWithCompany(db);
  const client = await createClient(db, { companyId: company.id });
  setSessionUser(user);
  return { user, company, client };
}

type Values = Record<string, string | number | null | undefined>;

export const submitCreate = (companyId: string, values: Values) =>
  createClaimAction(companyId, initialActionState, formData({ id: uuidv7(), ...values }));

export const submitUpdate = (companyId: string, id: string, values: Values) =>
  updateClaimAction(companyId, id, initialActionState, formData(values));

export const submitStatus = (companyId: string, id: string, values: Values, from: 'list' | 'show' = 'show') =>
  updateStatusClaimAction(companyId, id, from, initialActionState, formData(values));

export async function reloadClaim(id: string): Promise<ClaimRow> {
  const [row] = await db.select().from(claims).where(eq(claims.id, id));
  return row;
}

export const allClaims = () => db.select().from(claims).orderBy(asc(claims.code));
