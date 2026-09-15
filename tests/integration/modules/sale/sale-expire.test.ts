import { beforeEach, describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import { db } from '@/db/client';
import { addDays } from '@/lib/format';
import { profiles } from '@/modules/account/models/account.model';
import { createSaleContainer } from '@/modules/sale/container';
import { resetDb } from '../../../helpers/reset-db';
import { makeSaleContext } from '../../../helpers/sale-context';
import { profileStatus, reloadSale, saleEnding } from './sale-test-utils';

const TODAY = '2026-09-14';
const expire = (today = TODAY) => createSaleContainer(db, { graceDays: 3 }).expireService.execute(today);

describe('Expiración automática de ventas (sales:expire)', () => {
  beforeEach(resetDb);

  it('step 1 marks due active sales as expired without freeing their profiles', async () => {
    const ctx = await makeSaleContext(db);
    const sale = await saleEnding(ctx, addDays(TODAY, -1));

    expect(await expire()).toEqual({ expired: 1, released: 0 });

    expect((await reloadSale(sale.id)).status).toBe('expired');
    expect(await profileStatus(ctx.profiles[0].id)).toBe('occupied');
  });

  it('active sales that are not yet due (or end today) are left untouched', async () => {
    const ctx = await makeSaleContext(db);
    const future = await saleEnding(ctx, addDays(TODAY, 5), { profileIndex: 0 });
    const endsToday = await saleEnding(ctx, TODAY, { profileIndex: 1 });

    expect(await expire()).toEqual({ expired: 0, released: 0 });

    expect((await reloadSale(future.id)).status).toBe('active');
    expect((await reloadSale(endsToday.id)).status).toBe('active');
  });

  it('step 2 frees the profiles of sales expired beyond the grace period', async () => {
    const ctx = await makeSaleContext(db);
    const sale = await saleEnding(ctx, addDays(TODAY, -15), { status: 'expired' });

    expect(await expire()).toEqual({ expired: 0, released: 1 });

    expect((await reloadSale(sale.id)).status).toBe('expired');
    expect(await profileStatus(ctx.profiles[0].id)).toBe('available');
  });

  it('profiles stay occupied while the sale is within grace (boundary included)', async () => {
    const ctx = await makeSaleContext(db);
    await saleEnding(ctx, addDays(TODAY, -1), { status: 'expired', profileIndex: 0 });
    await saleEnding(ctx, addDays(TODAY, -3), { status: 'expired', profileIndex: 1 });
    await saleEnding(ctx, addDays(TODAY, -4), { status: 'expired', profileIndex: 2 });

    expect(await expire()).toEqual({ expired: 0, released: 1 });

    expect(await profileStatus(ctx.profiles[0].id)).toBe('occupied');
    expect(await profileStatus(ctx.profiles[1].id)).toBe('occupied');
    expect(await profileStatus(ctx.profiles[2].id)).toBe('available');
  });

  it('a long overdue active sale is expired and released in the same run, across every company', async () => {
    const a = await makeSaleContext(db);
    const b = await makeSaleContext(db);
    const saleA = await saleEnding(a, addDays(TODAY, -10));
    const saleB = await saleEnding(b, addDays(TODAY, -2));

    expect(await expire()).toEqual({ expired: 2, released: 1 });

    expect((await reloadSale(saleA.id)).status).toBe('expired');
    expect((await reloadSale(saleB.id)).status).toBe('expired');
    expect(await profileStatus(a.profiles[0].id)).toBe('available');
    expect(await profileStatus(b.profiles[0].id)).toBe('occupied');
  });

  it('cancelled sales and profiles held by a newer sale are never touched; a second run is a no-op', async () => {
    const ctx = await makeSaleContext(db);
    await saleEnding(ctx, addDays(TODAY, -20), { status: 'expired', profileIndex: 0 });
    await db.update(profiles).set({ status: 'available' }).where(eq(profiles.id, ctx.profiles[0].id));
    await saleEnding(ctx, addDays(TODAY, 10), { status: 'active', profileIndex: 0 });
    const cancelled = await saleEnding(ctx, addDays(TODAY, -20), { status: 'cancelled', profileIndex: 1 });

    expect(await expire()).toEqual({ expired: 0, released: 0 });
    expect(await expire()).toEqual({ expired: 0, released: 0 });

    expect(await profileStatus(ctx.profiles[0].id)).toBe('occupied');
    expect((await reloadSale(cancelled.id)).status).toBe('cancelled');
  });
});
