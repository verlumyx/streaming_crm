import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { db } from '@/db/client';
import { initialActionState } from '@/modules/shared/actions/action-state';
import { uuidv7 } from '@/modules/shared/uuid';
import { ACCOUNT_PERMISSIONS } from '@/modules/account/permissions';
import AccountsPage from '@/app/[companyId]/accounts/page';
import AccountCreatePage from '@/app/[companyId]/accounts/create/page';
import AccountShowPage from '@/app/[companyId]/accounts/[id]/page';
import AccountEditPage from '@/app/[companyId]/accounts/[id]/edit/page';
import {
  createAccountAction,
  renewAccountAction,
  revealAccountCredentialsAction,
  updateAccountAction,
} from '@/app/[companyId]/accounts/actions';
import { resetDb } from '../../../helpers/reset-db';
import { expectRedirect, setSessionUser } from '../../../helpers/session-mock';
import { assignRoleWithPermissions } from '../../../helpers/company-context';
import { formData } from '../../../helpers/form-data';
import { createPayload, makeAccountContext, persistAccount, updatePayload, type AccountContext } from './account-context';

const ALL = Object.values(ACCOUNT_PERMISSIONS);

type Entry = {
  name: string;
  permission: string;
  kind: 'page' | 'action';
  run: (ctx: AccountContext, accountId: string) => Promise<unknown>;
};

const ENTRIES: Entry[] = [
  {
    name: 'Listar (page)',
    permission: ACCOUNT_PERMISSIONS.LIST,
    kind: 'page',
    run: (ctx) => AccountsPage({ params: Promise.resolve({ companyId: ctx.company.id }), searchParams: Promise.resolve({}) }),
  },
  {
    name: 'Crear (page)',
    permission: ACCOUNT_PERMISSIONS.CREATE,
    kind: 'page',
    run: (ctx) => AccountCreatePage({ params: Promise.resolve({ companyId: ctx.company.id }) }),
  },
  {
    name: 'Ver (page)',
    permission: ACCOUNT_PERMISSIONS.SHOW,
    kind: 'page',
    run: (ctx, id) => AccountShowPage({ params: Promise.resolve({ companyId: ctx.company.id, id }) }),
  },
  {
    name: 'Editar (page)',
    permission: ACCOUNT_PERMISSIONS.UPDATE,
    kind: 'page',
    run: (ctx, id) => AccountEditPage({ params: Promise.resolve({ companyId: ctx.company.id, id }) }),
  },
  {
    name: 'Crear (action)',
    permission: ACCOUNT_PERMISSIONS.CREATE,
    kind: 'action',
    run: (ctx) =>
      createAccountAction(ctx.company.id, initialActionState, formData(createPayload(ctx.service.id, { email: `${uuidv7()}@t.test` }))),
  },
  {
    name: 'Actualizar (action)',
    permission: ACCOUNT_PERMISSIONS.UPDATE,
    kind: 'action',
    run: (ctx, id) => updateAccountAction(ctx.company.id, id, initialActionState, formData(updatePayload())),
  },
  {
    name: 'Registrar renovación (action)',
    permission: ACCOUNT_PERMISSIONS.RENEW,
    kind: 'action',
    run: (ctx, id) =>
      renewAccountAction(ctx.company.id, id, initialActionState, formData({ id: uuidv7(), amount: '5', nextRenewal: '2027-01-01' })),
  },
  {
    name: 'Ver credenciales (action)',
    permission: ACCOUNT_PERMISSIONS.CREDENTIALS,
    kind: 'action',
    run: (ctx, id) => revealAccountCredentialsAction(ctx.company.id, id),
  },
];

async function setup(permissions: string[]) {
  const ctx = await makeAccountContext(db, 2);
  const { account } = await persistAccount(db, ctx);
  await assignRoleWithPermissions(db, ctx.user.id, ctx.company.id, permissions);
  setSessionUser(ctx.user);
  return { ctx, accountId: account.id };
}

/** Resolves to `'denied'` when the page/action refused the user, `'allowed'` otherwise. */
async function outcome(entry: Entry, ctx: AccountContext, accountId: string): Promise<'allowed' | 'denied'> {
  try {
    const result = (await entry.run(ctx, accountId)) as { status?: string; message?: string } | undefined;
    if (entry.kind === 'action' && result?.status === 'error' && /permiso/.test(result.message ?? '')) return 'denied';
    return 'allowed';
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes('dashboard?error=forbidden')) return 'denied';
    if (message.startsWith('NEXT_REDIRECT:')) return 'allowed';
    throw error;
  }
}

describe('Matriz de permisos de cuentas', () => {
  beforeEach(resetDb);
  beforeEach(() => {
    vi.spyOn(console, 'info').mockImplementation(() => undefined);
  });
  afterEach(() => vi.restoreAllMocks());

  for (const entry of ENTRIES) {
    it(`${entry.name} is denied without ${entry.permission}`, async () => {
      const { ctx, accountId } = await setup(ALL.filter((p) => p !== entry.permission));
      expect(await outcome(entry, ctx, accountId)).toBe('denied');
    });

    it(`${entry.name} is allowed with only ${entry.permission}`, async () => {
      const { ctx, accountId } = await setup([entry.permission]);
      expect(await outcome(entry, ctx, accountId)).toBe('allowed');
    });
  }

  it('a user without any account permission is redirected from every page', async () => {
    const { ctx, accountId } = await setup([]);
    for (const entry of ENTRIES.filter((e) => e.kind === 'page')) {
      await expectRedirect(entry.run(ctx, accountId), `/${ctx.company.id}/dashboard?error=forbidden`);
    }
  });
});
