import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '@/db/client';
import { initialActionState, type ActionState } from '@/modules/shared/actions/action-state';
import { uuidv7 } from '@/modules/shared/uuid';
import type { ClaimRow } from '@/modules/claim/models/claim.model';
import { CLAIM_PERMISSIONS } from '@/modules/claim/permissions';
import ClaimsPage from '@/app/[companyId]/claims/page';
import ClaimCreatePage from '@/app/[companyId]/claims/create/page';
import ClaimShowPage from '@/app/[companyId]/claims/[id]/page';
import ClaimEditPage from '@/app/[companyId]/claims/[id]/edit/page';
import { createClaimAction, updateClaimAction, updateStatusClaimAction } from '@/app/[companyId]/claims/actions';
import { resetDb } from '../../../helpers/reset-db';
import { expectRedirect, setSessionUser } from '../../../helpers/session-mock';
import { assignRoleWithPermissions, createUserWithCompany } from '../../../helpers/company-context';
import { createClient } from '../../../factories/client.factory';
import { createClaim } from '../../../factories/claim.factory';
import { formData } from '../../../helpers/form-data';
import { allClaims, FORBIDDEN_MESSAGE, forbiddenUrl, reloadClaim } from './claim-test-utils';
import type { ClaimContext } from './claim-test-utils';

const ALL = Object.values(CLAIM_PERMISSIONS);
const allBut = (permission: string) => ALL.filter((p) => p !== permission);

type Fixture = { ctx: ClaimContext; claim: ClaimRow };
type Entry = { permission: string; kind: 'page' | 'action'; run: (f: Fixture) => Promise<unknown> };

const values = (clientId: string) => ({ clientId, subject: 'Asunto', description: 'Descripción', channel: 'whatsapp' });

const ENTRIES: Record<string, Entry> = {
  'Listar (page)': {
    permission: CLAIM_PERMISSIONS.LIST,
    kind: 'page',
    run: ({ ctx }) =>
      ClaimsPage({ params: Promise.resolve({ companyId: ctx.company.id }), searchParams: Promise.resolve({}) }),
  },
  'Crear (page)': {
    permission: CLAIM_PERMISSIONS.CREATE,
    kind: 'page',
    run: ({ ctx }) =>
      ClaimCreatePage({ params: Promise.resolve({ companyId: ctx.company.id }), searchParams: Promise.resolve({}) }),
  },
  'Ver (page)': {
    permission: CLAIM_PERMISSIONS.SHOW,
    kind: 'page',
    run: ({ ctx, claim }) => ClaimShowPage({ params: Promise.resolve({ companyId: ctx.company.id, id: claim.id }) }),
  },
  'Editar (page)': {
    permission: CLAIM_PERMISSIONS.UPDATE,
    kind: 'page',
    run: ({ ctx, claim }) => ClaimEditPage({ params: Promise.resolve({ companyId: ctx.company.id, id: claim.id }) }),
  },
  'Crear (action)': {
    permission: CLAIM_PERMISSIONS.CREATE,
    kind: 'action',
    run: ({ ctx }) =>
      createClaimAction(ctx.company.id, initialActionState, formData({ id: uuidv7(), ...values(ctx.client.id) })),
  },
  'Actualizar (action)': {
    permission: CLAIM_PERMISSIONS.UPDATE,
    kind: 'action',
    run: ({ ctx, claim }) =>
      updateClaimAction(ctx.company.id, claim.id, initialActionState, formData(values(ctx.client.id))),
  },
  'Actualizar Estado (action)': {
    permission: CLAIM_PERMISSIONS.UPDATE_STATUS,
    kind: 'action',
    run: ({ ctx, claim }) =>
      updateStatusClaimAction(ctx.company.id, claim.id, 'show', initialActionState, formData({ status: 'resolved' })),
  },
};

async function fixture(permissions: string[]): Promise<Fixture> {
  const { user, company } = await createUserWithCompany(db);
  const client = await createClient(db, { companyId: company.id });
  const claim = await createClaim(db, client, { subject: 'Original' });
  await assignRoleWithPermissions(db, user.id, company.id, permissions);
  setSessionUser(user);
  return { ctx: { user, company, client }, claim };
}

async function expectNothingChanged({ claim }: Fixture) {
  expect(await reloadClaim(claim.id)).toMatchObject({ status: 'open', subject: 'Original' });
  expect(await allClaims()).toHaveLength(1);
}

describe('Matriz de permisos de reclamos', () => {
  beforeEach(resetDb);

  it.each(Object.entries(ENTRIES))('%s requires exactly its own permission', async (_name, entry) => {
    const f = await fixture(allBut(entry.permission));

    if (entry.kind === 'page') {
      await expectRedirect(entry.run(f), forbiddenUrl(f.ctx.company.id));
    } else {
      expect((await entry.run(f)) as ActionState).toMatchObject({ status: 'error', message: FORBIDDEN_MESSAGE });
      await expectNothingChanged(f);
    }
  });

  it.each(Object.entries(ENTRIES))('%s works with only its permission', async (_name, entry) => {
    const f = await fixture([entry.permission]);

    if (entry.kind === 'page') await expect(entry.run(f)).resolves.toBeDefined();
    else await expectRedirect(entry.run(f), `/${f.ctx.company.id}/claims`);
  });

  it('a user whose role has no permissions is denied everywhere', async () => {
    const f = await fixture([]);

    for (const entry of Object.values(ENTRIES)) {
      if (entry.kind === 'page') await expectRedirect(entry.run(f), forbiddenUrl(f.ctx.company.id));
      else expect(((await entry.run(f)) as ActionState).status).toBe('error');
    }
    await expectNothingChanged(f);
  });
});
