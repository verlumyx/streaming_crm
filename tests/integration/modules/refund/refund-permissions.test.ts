import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '@/db/client';
import { initialActionState, type ActionState } from '@/modules/shared/actions/action-state';
import { uuidv7 } from '@/modules/shared/uuid';
import type { RefundRow } from '@/modules/refund/models/refund.model';
import type { SaleRow } from '@/modules/sale/models/sale.model';
import { REFUND_PERMISSIONS } from '@/modules/refund/permissions';
import RefundsPage from '@/app/[companyId]/refunds/page';
import RefundCreatePage from '@/app/[companyId]/refunds/create/page';
import RefundShowPage from '@/app/[companyId]/refunds/[id]/page';
import {
  approveRefundAction,
  createRefundAction,
  rejectRefundAction,
  updateRefundAction,
} from '@/app/[companyId]/refunds/actions';
import { resetDb } from '../../../helpers/reset-db';
import { expectRedirect, setSessionUser } from '../../../helpers/session-mock';
import { assignRoleWithPermissions } from '../../../helpers/company-context';
import { makeSaleContext, persistSale, type SaleContext } from '../../../helpers/sale-context';
import { formData } from '../../../helpers/form-data';
import { createRefund } from '../../../factories/refund.factory';
import { reloadSale } from '../sale/sale-test-utils';
import { allLedger, allRefunds, FORBIDDEN_MESSAGE, forbiddenUrl, reloadRefund } from './refund-test-utils';

const ALL = Object.values(REFUND_PERMISSIONS);
const allBut = (permission: string) => ALL.filter((p) => p !== permission);

type Fixture = { ctx: SaleContext; sale: SaleRow; refund: RefundRow };
type Entry = { permission: string; kind: 'page' | 'action'; run: (f: Fixture) => Promise<unknown> };

const ENTRIES: Record<string, Entry> = {
  'Listar (page)': {
    permission: REFUND_PERMISSIONS.LIST,
    kind: 'page',
    run: ({ ctx }) => RefundsPage({ params: Promise.resolve({ companyId: ctx.company.id }), searchParams: Promise.resolve({}) }),
  },
  'Crear (page)': {
    permission: REFUND_PERMISSIONS.CREATE,
    kind: 'page',
    run: ({ ctx }) => RefundCreatePage({ params: Promise.resolve({ companyId: ctx.company.id }) }),
  },
  'Ver (page)': {
    permission: REFUND_PERMISSIONS.SHOW,
    kind: 'page',
    run: ({ ctx, refund }) => RefundShowPage({ params: Promise.resolve({ companyId: ctx.company.id, id: refund.id }) }),
  },
  'Crear (action)': {
    permission: REFUND_PERMISSIONS.CREATE,
    kind: 'action',
    run: ({ ctx, sale }) =>
      createRefundAction(ctx.company.id, initialActionState, formData({ id: uuidv7(), saleId: sale.id, amount: 10 })),
  },
  'Actualizar (action)': {
    permission: REFUND_PERMISSIONS.UPDATE,
    kind: 'action',
    run: ({ ctx, refund }) => updateRefundAction(ctx.company.id, refund.id, initialActionState, formData({ amount: 99 })),
  },
  'Aprobar (action)': {
    permission: REFUND_PERMISSIONS.APPROVE,
    kind: 'action',
    run: ({ ctx, refund }) => approveRefundAction(ctx.company.id, refund.id),
  },
  'Rechazar (action)': {
    permission: REFUND_PERMISSIONS.REJECT,
    kind: 'action',
    run: ({ ctx, refund }) => rejectRefundAction(ctx.company.id, refund.id),
  },
};

async function fixture(permissions: string[]): Promise<Fixture> {
  const ctx = await makeSaleContext(db);
  const sale = await persistSale(db, ctx);
  const refund = await createRefund(db, sale);
  await assignRoleWithPermissions(db, ctx.user.id, ctx.company.id, permissions);
  setSessionUser(ctx.user);
  return { ctx, sale, refund };
}

async function expectNothingChanged({ sale, refund }: Fixture) {
  expect(await reloadRefund(refund.id)).toMatchObject({ status: 'pending', amount: '10.00' });
  expect(await allRefunds()).toHaveLength(1);
  expect(await allLedger()).toHaveLength(0);
  expect((await reloadSale(sale.id)).status).toBe('active');
}

describe('Matriz de permisos de reembolsos', () => {
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
    else await expectRedirect(entry.run(f), `/${f.ctx.company.id}/refunds/`);
  });

  it('the detail page only offers the actions the user holds', async () => {
    const f = await fixture([REFUND_PERMISSIONS.SHOW, REFUND_PERMISSIONS.REJECT]);

    const element = await RefundShowPage({
      params: Promise.resolve({ companyId: f.ctx.company.id, id: f.refund.id }),
      searchParams: Promise.resolve({ edit: '1' }),
    });

    expect(element.props).toMatchObject({ canUpdate: false, canApprove: false, canReject: true, initialEditing: false });
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
