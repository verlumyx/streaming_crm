import { beforeEach, describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import { db } from '@/db/client';
import { initialActionState } from '@/modules/shared/actions/action-state';
import { uuidv7 } from '@/modules/shared/uuid';
import { profiles } from '@/modules/account/models/account.model';
import { sales } from '@/modules/sale/models/sale.model';
import { reactivateSaleAction } from '@/app/[companyId]/sales/actions';
import { resetDb } from '../../../helpers/reset-db';
import { expectRedirect, setSessionUser } from '../../../helpers/session-mock';
import { assignRoleWithPermissions } from '../../../helpers/company-context';
import { makeSaleContext, type SaleContext } from '../../../helpers/sale-context';
import { createAccountWithProfiles, createService } from '../../../factories/catalog.factory';
import {
  daysFromToday,
  FORBIDDEN_MESSAGE,
  form,
  ledgerOf,
  profileStatus,
  reloadSale,
  renewalsOf,
  saleEnding,
  saleProfileIds,
  today,
} from './sale-test-utils';

async function context(maxProfiles = 4): Promise<SaleContext> {
  const ctx = await makeSaleContext(db, maxProfiles);
  setSessionUser(ctx.user);
  return ctx;
}

const reactivate = (ctx: SaleContext, saleId: string, values: Record<string, string | number | string[]> = {}) =>
  reactivateSaleAction(ctx.company.id, saleId, initialActionState, form({ id: uuidv7(), ...values }));

const free = (profileId: string) => db.update(profiles).set({ status: 'available' }).where(eq(profiles.id, profileId));

describe('Reactivar venta', () => {
  beforeEach(resetDb);

  it('a cancelled sale is reactivated reusing its original profile when free', async () => {
    const ctx = await context();
    const oldEnd = daysFromToday(-2);
    const sale = await saleEnding(ctx, oldEnd, { status: 'cancelled' });
    await db.update(sales).set({ cancelledAt: new Date(), cancellationReason: 'Falta de pago' }).where(eq(sales.id, sale.id));

    await expectRedirect(reactivate(ctx, sale.id), `/${ctx.company.id}/sales/${sale.id}`);

    const row = await reloadSale(sale.id);
    expect(row).toMatchObject({
      status: 'active',
      cancelledAt: null,
      cancellationReason: null,
      endDate: daysFromToday(30),
      durationDays: 30,
      price: '10.00',
    });
    expect(await profileStatus(ctx.profiles[0].id)).toBe('occupied');
    expect(await saleProfileIds(sale.id)).toEqual([ctx.profiles[0].id]);

    const renewals = await renewalsOf(sale.id);
    expect(renewals).toHaveLength(1);
    expect(renewals[0]).toMatchObject({
      renewedAt: today(),
      previousEndDate: oldEnd,
      newEndDate: daysFromToday(30),
      renewedBy: ctx.user.id,
    });

    const ledger = await ledgerOf(sale.id);
    expect(ledger).toHaveLength(1);
    expect(ledger[0]).toMatchObject({
      type: 'income',
      category: 'renewal',
      amount: '10.00',
      date: today(),
      description: `Reactivación de venta ${sale.code}`,
      periodFrom: today(),
      periodTo: daysFromToday(30),
    });
  });

  it('reactivating with a new price and duration updates the sale snapshot, the renewal and the ledger', async () => {
    const ctx = await context();
    const sale = await saleEnding(ctx, daysFromToday(-2), { status: 'cancelled' });

    await expectRedirect(reactivate(ctx, sale.id, { price: 120, durationDays: 45 }), `/${ctx.company.id}/sales/`);

    expect(await reloadSale(sale.id)).toMatchObject({ price: '120.00', durationDays: 45, endDate: daysFromToday(45) });
    expect((await renewalsOf(sale.id))[0]).toMatchObject({ price: '120.00', durationDays: 45 });
    expect((await ledgerOf(sale.id))[0].amount).toBe('120.00');
  });

  it('reactivation returns a conflict when the original profile was taken by another sale', async () => {
    const ctx = await context();
    const sale = await saleEnding(ctx, daysFromToday(-2), { status: 'cancelled' });
    await saleEnding(ctx, daysFromToday(20), { status: 'active', profileIndex: 0 });

    const result = await reactivate(ctx, sale.id);

    expect(result).toMatchObject({
      status: 'conflict',
      details: { unavailableProfiles: [{ id: ctx.profiles[0].id, label: `${ctx.account.email} · Perfil 1` }] },
    });
    expect((await reloadSale(sale.id)).status).toBe('cancelled');
    expect(await renewalsOf(sale.id)).toHaveLength(0);
    expect(await ledgerOf(sale.id)).toHaveLength(0);
  });

  it('reactivation succeeds when replacement profiles are provided after a conflict', async () => {
    const ctx = await context();
    const sale = await saleEnding(ctx, daysFromToday(-2), { status: 'cancelled' });
    const other = await saleEnding(ctx, daysFromToday(20), { status: 'active', profileIndex: 0 });
    expect((await reactivate(ctx, sale.id)).status).toBe('conflict');

    await expectRedirect(reactivate(ctx, sale.id, { profileIds: [ctx.profiles[1].id] }), `/${ctx.company.id}/sales/`);

    expect((await reloadSale(sale.id)).status).toBe('active');
    expect(await saleProfileIds(sale.id)).toEqual([ctx.profiles[1].id]);
    expect(await profileStatus(ctx.profiles[1].id)).toBe('occupied');
    expect(await profileStatus(ctx.profiles[0].id)).toBe('occupied');
    expect(await saleProfileIds(other.id)).toEqual([ctx.profiles[0].id]);
  });

  it('replacement profiles are checked for coherence and availability', async () => {
    const ctx = await context();
    const sale = await saleEnding(ctx, daysFromToday(-2), { status: 'cancelled' });
    const otherService = await createService(db, { companyId: ctx.company.id });
    const foreign = await createAccountWithProfiles(db, { companyId: ctx.company.id, serviceId: otherService.id }, 1);
    await saleEnding(ctx, daysFromToday(20), { status: 'active', profileIndex: 2 });

    const wrongService = await reactivate(ctx, sale.id, { profileIds: [foreign.profiles[0].id] });
    const tooMany = await reactivate(ctx, sale.id, { profileIds: [ctx.profiles[1].id, ctx.profiles[3].id] });
    const taken = await reactivate(ctx, sale.id, { profileIds: [ctx.profiles[2].id] });

    expect(wrongService.fieldErrors?.profileIds?.[0]).toMatch(/servicio del plan seleccionado/);
    expect(tooMany.fieldErrors?.profileIds?.[0]).toMatch(/exactamente 1 perfil/);
    expect(taken.status).toBe('conflict');
    expect((await reloadSale(sale.id)).status).toBe('cancelled');
  });

  it('an expired sale outside the grace period can be reactivated after the job freed its profile', async () => {
    const ctx = await context();
    const sale = await saleEnding(ctx, daysFromToday(-15), { status: 'expired' });
    await free(ctx.profiles[0].id);

    await expectRedirect(reactivate(ctx, sale.id), `/${ctx.company.id}/sales/${sale.id}`);

    expect(await reloadSale(sale.id)).toMatchObject({ status: 'active', endDate: daysFromToday(30) });
    expect(await profileStatus(ctx.profiles[0].id)).toBe('occupied');
  });

  it('an expired sale outside grace whose profile is still occupied by itself is reactivated without conflict', async () => {
    const ctx = await context();
    const sale = await saleEnding(ctx, daysFromToday(-15), { status: 'expired' });
    expect(await profileStatus(ctx.profiles[0].id)).toBe('occupied');

    await expectRedirect(reactivate(ctx, sale.id), `/${ctx.company.id}/sales/${sale.id}`);

    expect((await reloadSale(sale.id)).status).toBe('active');
    expect(await saleProfileIds(sale.id)).toEqual([ctx.profiles[0].id]);
  });

  it('replacing profiles frees the ones the sale still occupied', async () => {
    const ctx = await context();
    const sale = await saleEnding(ctx, daysFromToday(-15), { status: 'expired' });

    await expectRedirect(reactivate(ctx, sale.id, { profileIds: [ctx.profiles[1].id] }), `/${ctx.company.id}/sales/`);

    expect(await profileStatus(ctx.profiles[0].id)).toBe('available');
    expect(await profileStatus(ctx.profiles[1].id)).toBe('occupied');
    expect(await saleProfileIds(sale.id)).toEqual([ctx.profiles[1].id]);
  });

  it('an active sale or an expired sale within grace cannot be reactivated', async () => {
    const ctx = await context();
    const active = await saleEnding(ctx, daysFromToday(10), { profileIndex: 0 });
    const inGrace = await saleEnding(ctx, daysFromToday(-1), { status: 'expired', profileIndex: 1 });

    for (const sale of [active, inGrace]) {
      const result = await reactivate(ctx, sale.id);
      expect(result.fieldErrors?.id?.[0]).toBe('Esta venta no requiere reactivación. Usa la renovación.');
    }
    expect(await renewalsOf(active.id)).toHaveLength(0);
  });

  it('a user without reactivate permission cannot reactivate', async () => {
    const ctx = await context();
    const sale = await saleEnding(ctx, daysFromToday(-2), { status: 'cancelled' });
    await assignRoleWithPermissions(db, ctx.user.id, ctx.company.id, ['sales.list', 'sales.renew']);

    const result = await reactivate(ctx, sale.id);

    expect(result).toMatchObject({ status: 'error', message: FORBIDDEN_MESSAGE });
    expect((await reloadSale(sale.id)).status).toBe('cancelled');
  });
});
