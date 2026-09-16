import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '@/db/client';
import { initialActionState, type ActionState } from '@/modules/shared/actions/action-state';
import { uuidv7 } from '@/modules/shared/uuid';
import { SALE_PERMISSIONS } from '@/modules/sale/permissions';
import SalesPage from '@/app/[companyId]/sales/page';
import SaleCreatePage from '@/app/[companyId]/sales/create/page';
import SaleShowPage from '@/app/[companyId]/sales/[id]/page';
import {
  approveSaleAction,
  cancelSaleAction,
  createSaleAction,
  reactivateSaleAction,
  rejectSaleAction,
  renewSaleAction,
  searchSaleClientsAction,
} from '@/app/[companyId]/sales/actions';
import { resetDb } from '../../../helpers/reset-db';
import { expectRedirect, setSessionUser } from '../../../helpers/session-mock';
import { assignRoleWithPermissions } from '../../../helpers/company-context';
import { makeSaleContext, type SaleContext } from '../../../helpers/sale-context';
import { daysFromToday, FORBIDDEN_MESSAGE, forbiddenUrl, form, reloadSale, saleEnding, today } from './sale-test-utils';

const ALL = Object.values(SALE_PERMISSIONS);
const allBut = (permission: string) => ALL.filter((p) => p !== permission);

type Entry = {
  permission: string;
  kind: 'page' | 'action';
  run: (ctx: SaleContext, saleId: string) => Promise<unknown>;
};

const ENTRIES: Record<string, Entry> = {
  'Listar (page)': {
    permission: SALE_PERMISSIONS.LIST,
    kind: 'page',
    run: (ctx) => SalesPage({ params: Promise.resolve({ companyId: ctx.company.id }), searchParams: Promise.resolve({}) }),
  },
  'Crear (page)': {
    permission: SALE_PERMISSIONS.CREATE,
    kind: 'page',
    run: (ctx) =>
      SaleCreatePage({ params: Promise.resolve({ companyId: ctx.company.id }), searchParams: Promise.resolve({}) }),
  },
  'Ver (page)': {
    permission: SALE_PERMISSIONS.SHOW,
    kind: 'page',
    run: (ctx, saleId) => SaleShowPage({ params: Promise.resolve({ companyId: ctx.company.id, id: saleId }) }),
  },
  'Crear (action)': {
    permission: SALE_PERMISSIONS.CREATE,
    kind: 'action',
    run: (ctx) =>
      createSaleAction(
        ctx.company.id,
        initialActionState,
        form({ id: uuidv7(), clientId: ctx.client.id, planId: ctx.plan.id, startDate: today(), profileIds: [ctx.profiles[1].id] }),
      ),
  },
  'Buscar clientes (action)': {
    permission: SALE_PERMISSIONS.CREATE,
    kind: 'action',
    run: (ctx) => searchSaleClientsAction(ctx.company.id, ''),
  },
  'Renovar (action)': {
    permission: SALE_PERMISSIONS.RENEW,
    kind: 'action',
    run: (ctx, saleId) => renewSaleAction(ctx.company.id, saleId, initialActionState, form({ id: uuidv7() })),
  },
  'Reactivar (action)': {
    permission: SALE_PERMISSIONS.REACTIVATE,
    kind: 'action',
    run: (ctx, saleId) => reactivateSaleAction(ctx.company.id, saleId, initialActionState, form({ id: uuidv7() })),
  },
  'Aprobar (action)': {
    permission: SALE_PERMISSIONS.APPROVE,
    kind: 'action',
    run: (ctx, saleId) => approveSaleAction(ctx.company.id, saleId),
  },
  'Rechazar (action)': {
    permission: SALE_PERMISSIONS.APPROVE,
    kind: 'action',
    run: (ctx, saleId) => rejectSaleAction(ctx.company.id, saleId, initialActionState, form({ rejectionReason: 'x' })),
  },
  'Expulsar (action)': {
    permission: SALE_PERMISSIONS.CANCEL,
    kind: 'action',
    run: (ctx, saleId) =>
      cancelSaleAction(ctx.company.id, saleId, initialActionState, form({ cancellationReason: 'x' })),
  },
};

describe('Matriz de permisos de ventas', () => {
  beforeEach(resetDb);

  it.each(Object.entries(ENTRIES))('%s requires exactly its own permission', async (_name, entry) => {
    const ctx = await makeSaleContext(db);
    const sale = await saleEnding(ctx, daysFromToday(10));
    await assignRoleWithPermissions(db, ctx.user.id, ctx.company.id, allBut(entry.permission));
    setSessionUser(ctx.user);

    if (entry.kind === 'page') {
      await expectRedirect(entry.run(ctx, sale.id), forbiddenUrl(ctx.company.id));
    } else {
      const result = (await entry.run(ctx, sale.id)) as ActionState;
      expect(result).toMatchObject({ status: 'error', message: FORBIDDEN_MESSAGE });
      expect(await reloadSale(sale.id)).toMatchObject({ status: 'active', endDate: sale.endDate });
    }
  });

  it.each(Object.entries(ENTRIES).filter(([, e]) => e.kind === 'page'))(
    '%s is reachable with only its permission',
    async (_name, entry) => {
      const ctx = await makeSaleContext(db);
      const sale = await saleEnding(ctx, daysFromToday(10));
      await assignRoleWithPermissions(db, ctx.user.id, ctx.company.id, [entry.permission]);
      setSessionUser(ctx.user);

      await expect(entry.run(ctx, sale.id)).resolves.toBeDefined();
    },
  );

  it('a user without any membership role is denied everywhere', async () => {
    const ctx = await makeSaleContext(db);
    const sale = await saleEnding(ctx, daysFromToday(10));
    await assignRoleWithPermissions(db, ctx.user.id, ctx.company.id, []);
    setSessionUser(ctx.user);

    for (const entry of Object.values(ENTRIES)) {
      if (entry.kind === 'page') await expectRedirect(entry.run(ctx, sale.id), forbiddenUrl(ctx.company.id));
      else expect(((await entry.run(ctx, sale.id)) as ActionState).status).toBe('error');
    }
  });
});
