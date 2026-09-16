import { beforeEach, describe, expect, it } from 'vitest';
import { eq, inArray } from 'drizzle-orm';
import { db } from '@/db/client';
import { initialActionState } from '@/modules/shared/actions/action-state';
import { uuidv7 } from '@/modules/shared/uuid';
import { profiles } from '@/modules/account/models/account.model';
import { saleProfiles, sales } from '@/modules/sale/models/sale.model';
import {
  approveSaleAction,
  cancelSaleAction,
  createSaleAction,
  reactivateSaleAction,
  rejectSaleAction,
} from '@/app/[companyId]/sales/actions';
import { resetDb } from '../../../helpers/reset-db';
import { expectRedirect, setSessionUser } from '../../../helpers/session-mock';
import { addMembership, assignRoleWithPermissions } from '../../../helpers/company-context';
import { makeSaleContext, type SaleContext } from '../../../helpers/sale-context';
import { createPlan } from '../../../factories/catalog.factory';
import { createUser } from '../../../factories/user.factory';
import { daysFromToday, form, ledgerOf, profileStatus, reloadSale, saleEnding, today } from './sale-test-utils';

async function context(maxProfiles = 4): Promise<SaleContext> {
  const ctx = await makeSaleContext(db, maxProfiles);
  setSessionUser(ctx.user);
  return ctx;
}

const pendingSale = (ctx: SaleContext, profileIndex = 0) =>
  saleEnding(ctx, daysFromToday(20), { status: 'pending', profileIndex });

const reject = (ctx: SaleContext, saleId: string, rejectionReason?: string) =>
  rejectSaleAction(ctx.company.id, saleId, initialActionState, form({ rejectionReason }));

const isRedirect = (result: PromiseSettledResult<unknown>) =>
  result.status === 'rejected' && String((result.reason as Error).message).startsWith('NEXT_REDIRECT:');

describe('Aprobar venta', () => {
  beforeEach(resetDb);

  it('approving a pending sale activates it, occupies its profile and records the income', async () => {
    const ctx = await context();
    const sale = await pendingSale(ctx);

    await expectRedirect(approveSaleAction(ctx.company.id, sale.id), `/${ctx.company.id}/sales/${sale.id}`);

    const row = await reloadSale(sale.id);
    expect(row).toMatchObject({ status: 'active', approvedBy: ctx.user.id, startDate: sale.startDate, endDate: sale.endDate });
    expect(row.approvedAt).toBeInstanceOf(Date);
    expect(await profileStatus(ctx.profiles[0].id)).toBe('occupied');

    const ledger = await ledgerOf(sale.id);
    expect(ledger).toHaveLength(1);
    expect(ledger[0]).toMatchObject({
      companyId: ctx.company.id,
      type: 'income',
      category: 'sale',
      amount: '10.00',
      date: today(),
      description: `Venta ${ctx.service.name} a ${ctx.client.name}`,
      relatedType: 'Sale',
      relatedId: sale.id,
      periodFrom: sale.startDate,
      periodTo: sale.endDate,
      recordedBy: ctx.user.id,
    });
  });

  it('a user with only sales.approve can approve and is recorded as the approver', async () => {
    const ctx = await context();
    const sale = await pendingSale(ctx);
    const seller = await createUser(db);
    await addMembership(db, seller.id, ctx.company.id, { isDefault: true });
    await assignRoleWithPermissions(db, seller.id, ctx.company.id, ['sales.approve']);
    setSessionUser(seller);

    await expectRedirect(approveSaleAction(ctx.company.id, sale.id), `/${ctx.company.id}/sales/${sale.id}`);

    expect(await reloadSale(sale.id)).toMatchObject({ agentId: ctx.user.id, approvedBy: seller.id });
    expect((await ledgerOf(sale.id))[0].recordedBy).toBe(seller.id);
  });

  it('a full account sale created through the wizard occupies every profile only once approved', async () => {
    const ctx = await context(2);
    const plan = await createPlan(db, { companyId: ctx.company.id, serviceId: ctx.service.id, capacity: 'full_account' });
    const id = uuidv7();
    const profileIds = ctx.profiles.map((p) => p.id);
    await expectRedirect(
      createSaleAction(ctx.company.id, initialActionState, form({ id, clientId: ctx.client.id, planId: plan.id, startDate: today(), profileIds })),
      `/${ctx.company.id}/sales/${id}`,
    );
    const before = await db.select().from(profiles).where(inArray(profiles.id, profileIds));
    expect(before.every((p) => p.status === 'available')).toBe(true);

    await expectRedirect(approveSaleAction(ctx.company.id, id), `/${ctx.company.id}/sales/${id}`);

    const after = await db.select().from(profiles).where(inArray(profiles.id, profileIds));
    expect(after.every((p) => p.status === 'occupied')).toBe(true);
    expect(await ledgerOf(id)).toHaveLength(1);
  });

  it('a profile taken by another approved sale meanwhile is a conflict and nothing changes', async () => {
    const ctx = await context();
    const first = await pendingSale(ctx);
    const second = await pendingSale(ctx);
    await expectRedirect(approveSaleAction(ctx.company.id, first.id), `/${ctx.company.id}/sales/${first.id}`);

    const result = await approveSaleAction(ctx.company.id, second.id);

    expect(result).toMatchObject({
      status: 'conflict',
      message: 'Algunos perfiles de la venta ya no están disponibles. Recházala y registra una nueva venta con otros perfiles.',
      details: { unavailableProfiles: [{ id: ctx.profiles[0].id, label: `${ctx.account.email} · Perfil 1` }] },
    });
    expect(await reloadSale(second.id)).toMatchObject({ status: 'pending', approvedAt: null });
    expect(await ledgerOf(second.id)).toHaveLength(0);
  });

  it('concurrent approvals of pending sales on the same profile: exactly one succeeds', async () => {
    const ctx = await context();
    const pending = await Promise.all([pendingSale(ctx), pendingSale(ctx), pendingSale(ctx)]);

    const results = await Promise.allSettled(pending.map((sale) => approveSaleAction(ctx.company.id, sale.id)));

    expect(results.filter(isRedirect)).toHaveLength(1);
    expect(results.filter((r) => r.status === 'fulfilled' && r.value.status === 'conflict')).toHaveLength(2);
    const rows = await db.select().from(sales).where(inArray(sales.id, pending.map((s) => s.id)));
    expect(rows.filter((r) => r.status === 'active')).toHaveLength(1);
    expect(rows.filter((r) => r.status === 'pending')).toHaveLength(2);
  });

  it('only pending sales can be approved', async () => {
    const ctx = await context();
    const active = await saleEnding(ctx, daysFromToday(10));

    const result = await approveSaleAction(ctx.company.id, active.id);

    expect(result).toMatchObject({ status: 'error', message: 'Esta venta ya no está por aprobar.' });
    expect(await ledgerOf(active.id)).toHaveLength(0);
  });

  it('a same-company returnTo is honored after approving', async () => {
    const ctx = await context();
    const sale = await pendingSale(ctx);

    await expectRedirect(
      approveSaleAction(ctx.company.id, sale.id, `/${ctx.company.id}/sales?status=pending`),
      `/${ctx.company.id}/sales?status=pending`,
    );
  });

  it('a pending sale linked later does not keep an approved sale from freeing its profile', async () => {
    const ctx = await context();
    const approved = await saleEnding(ctx, daysFromToday(10));
    await pendingSale(ctx);

    await expectRedirect(
      cancelSaleAction(ctx.company.id, approved.id, initialActionState, form({ cancellationReason: 'Baja' })),
      `/${ctx.company.id}/sales/${approved.id}`,
    );

    expect(await profileStatus(ctx.profiles[0].id)).toBe('available');
  });

  it('an older pending sale approved after a newer one released the profile holds it against reactivation', async () => {
    const ctx = await context();
    const olderPending = await pendingSale(ctx);
    const newer = await saleEnding(ctx, daysFromToday(10));
    await expectRedirect(
      cancelSaleAction(ctx.company.id, newer.id, initialActionState, form({ cancellationReason: 'Baja' })),
      `/${ctx.company.id}/sales/${newer.id}`,
    );
    await expectRedirect(approveSaleAction(ctx.company.id, olderPending.id), `/${ctx.company.id}/sales/${olderPending.id}`);

    const result = await reactivateSaleAction(ctx.company.id, newer.id, initialActionState, form({ id: uuidv7() }));

    expect(result.status).toBe('conflict');
    expect(await reloadSale(newer.id)).toMatchObject({ status: 'cancelled' });
    const [pivot] = await db.select().from(saleProfiles).where(eq(saleProfiles.saleId, olderPending.id));
    expect(pivot.profileId).toBe(ctx.profiles[0].id);
  });
});

describe('Rechazar venta', () => {
  beforeEach(resetDb);

  it('rejecting a pending sale stores the reason and leaves profiles and ledger untouched', async () => {
    const ctx = await context();
    const sale = await pendingSale(ctx);

    await expectRedirect(reject(ctx, sale.id, 'El pago no se reflejó'), `/${ctx.company.id}/sales/${sale.id}`);

    const row = await reloadSale(sale.id);
    expect(row).toMatchObject({ status: 'rejected', rejectedBy: ctx.user.id, rejectionReason: 'El pago no se reflejó' });
    expect(row.rejectedAt).toBeInstanceOf(Date);
    expect(await profileStatus(ctx.profiles[0].id)).toBe('available');
    expect(await ledgerOf(sale.id)).toHaveLength(0);
  });

  it('the reason is required', async () => {
    const ctx = await context();
    const sale = await pendingSale(ctx);

    const result = await reject(ctx, sale.id);

    expect(result.fieldErrors?.rejectionReason?.[0]).toBe('El motivo es obligatorio.');
    expect(await reloadSale(sale.id)).toMatchObject({ status: 'pending' });
  });

  it('a rejected sale is final: it cannot be approved, rejected again, expelled nor reactivated', async () => {
    const ctx = await context();
    const sale = await pendingSale(ctx);
    await expectRedirect(reject(ctx, sale.id, 'Sin pago'), `/${ctx.company.id}/sales/${sale.id}`);

    expect(await approveSaleAction(ctx.company.id, sale.id)).toMatchObject({ message: 'Esta venta ya no está por aprobar.' });
    expect(await reject(ctx, sale.id, 'Otra vez')).toMatchObject({ message: 'Esta venta ya no está por aprobar.' });
    expect(
      await cancelSaleAction(ctx.company.id, sale.id, initialActionState, form({ cancellationReason: 'x', createRefund: 'true', refundAmount: 10 })),
    ).toMatchObject({ status: 'error', message: 'Solo se pueden expulsar ventas aprobadas.' });
    expect(
      await reactivateSaleAction(ctx.company.id, sale.id, initialActionState, form({ id: uuidv7() })),
    ).toMatchObject({ status: 'error' });
    expect(await reloadSale(sale.id)).toMatchObject({ status: 'rejected', rejectionReason: 'Sin pago' });
    expect(await ledgerOf(sale.id)).toHaveLength(0);
  });

  it('an active sale cannot be rejected', async () => {
    const ctx = await context();
    const active = await saleEnding(ctx, daysFromToday(10));

    expect(await reject(ctx, active.id, 'x')).toMatchObject({ status: 'error', message: 'Esta venta ya no está por aprobar.' });
    expect(await reloadSale(active.id)).toMatchObject({ status: 'active' });
  });

  it('a pending sale cannot be expelled', async () => {
    const ctx = await context();
    const sale = await pendingSale(ctx);

    const result = await cancelSaleAction(ctx.company.id, sale.id, initialActionState, form({ cancellationReason: 'x' }));

    expect(result).toMatchObject({ status: 'error', message: 'Solo se pueden expulsar ventas aprobadas.' });
    expect(await reloadSale(sale.id)).toMatchObject({ status: 'pending' });
  });
});
