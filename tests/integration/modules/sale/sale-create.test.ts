import { beforeEach, describe, expect, it } from 'vitest';
import { eq, inArray } from 'drizzle-orm';
import { db } from '@/db/client';
import { addDays } from '@/lib/format';
import { initialActionState } from '@/modules/shared/actions/action-state';
import { uuidv7 } from '@/modules/shared/uuid';
import { saleProfiles, sales } from '@/modules/sale/models/sale.model';
import { plans } from '@/modules/plan/models/plan.model';
import { clients } from '@/modules/client/models/client.model';
import { profiles } from '@/modules/account/models/account.model';
import { transactions } from '@/modules/transaction/models/transaction.model';
import { createSaleAction } from '@/app/[companyId]/sales/actions';
import { resetDb } from '../../../helpers/reset-db';
import { expectRedirect, setSessionUser } from '../../../helpers/session-mock';
import { assignRoleWithPermissions } from '../../../helpers/company-context';
import { makeSaleContext, type SaleContext } from '../../../helpers/sale-context';
import { createAccountWithProfiles, createPlan, createService } from '../../../factories/catalog.factory';
import { createClient } from '../../../factories/client.factory';
import { FORBIDDEN_MESSAGE, form, ledgerOf, profileStatus, saleProfileIds, today } from './sale-test-utils';

type SaleValues = { id: string; clientId: string; planId: string; startDate: string; profileIds: string[]; notes?: string };

function values(ctx: SaleContext, overrides: Partial<SaleValues> = {}): SaleValues {
  return {
    id: uuidv7(),
    clientId: ctx.client.id,
    planId: ctx.plan.id,
    startDate: today(),
    profileIds: [ctx.profiles[0].id],
    ...overrides,
  };
}

function submit(ctx: SaleContext, sale: SaleValues) {
  return createSaleAction(ctx.company.id, initialActionState, form(sale));
}

async function context(maxProfiles = 4): Promise<SaleContext> {
  const ctx = await makeSaleContext(db, maxProfiles);
  setSessionUser(ctx.user);
  return ctx;
}

describe('Crear venta', () => {
  beforeEach(resetDb);

  it('a sale is created with the plan snapshot, the computed end date and the first code', async () => {
    const ctx = await context();
    const sale = values(ctx, { startDate: '2026-09-10', notes: 'Pago por transferencia' });

    await expectRedirect(submit(ctx, sale), `/${ctx.company.id}/sales/${sale.id}`);

    const [row] = await db.select().from(sales).where(eq(sales.id, sale.id));
    expect(row).toMatchObject({
      companyId: ctx.company.id,
      code: 'SAL000001',
      clientId: ctx.client.id,
      planId: ctx.plan.id,
      agentId: ctx.user.id,
      serviceId: ctx.service.id,
      capacity: 'profile',
      durationDays: 30,
      price: '10.00',
      startDate: '2026-09-10',
      endDate: '2026-10-10',
      status: 'active',
      notes: 'Pago por transferencia',
      cancelledAt: null,
    });
  });

  it('the snapshot is immutable when the plan changes afterwards', async () => {
    const ctx = await context();
    const sale = values(ctx);
    await expectRedirect(submit(ctx, sale), `/${ctx.company.id}/sales/${sale.id}`);

    await db.update(plans).set({ salePrice: '999.00', durationDays: 365, capacity: 'full_account' }).where(eq(plans.id, ctx.plan.id));

    const [row] = await db.select().from(sales).where(eq(sales.id, sale.id));
    expect(row).toMatchObject({ price: '10.00', durationDays: 30, capacity: 'profile', endDate: addDays(sale.startDate, 30) });
  });

  it('creating a sale occupies the assigned profile through a pivot row', async () => {
    const ctx = await context();
    const sale = values(ctx);

    await expectRedirect(submit(ctx, sale), `/${ctx.company.id}/sales/${sale.id}`);

    expect(await profileStatus(ctx.profiles[0].id)).toBe('occupied');
    expect(await profileStatus(ctx.profiles[1].id)).toBe('available');
    expect(await saleProfileIds(sale.id)).toEqual([ctx.profiles[0].id]);
  });

  it('creating a sale records an income transaction related to the sale', async () => {
    const ctx = await context();
    const sale = values(ctx, { startDate: '2026-09-01' });

    await expectRedirect(submit(ctx, sale), `/${ctx.company.id}/sales/${sale.id}`);

    const ledger = await ledgerOf(sale.id);
    expect(ledger).toHaveLength(1);
    expect(ledger[0]).toMatchObject({
      companyId: ctx.company.id,
      type: 'income',
      category: 'sale',
      amount: '10.00',
      date: '2026-09-01',
      description: `Venta ${ctx.service.name} a ${ctx.client.name}`,
      relatedType: 'Sale',
      relatedId: sale.id,
      periodFrom: '2026-09-01',
      periodTo: '2026-10-01',
      recordedBy: ctx.user.id,
    });
  });

  it('a full_account sale requires exactly max_profiles profiles from the same account', async () => {
    const ctx = await context(4);
    const plan = await createPlan(db, {
      companyId: ctx.company.id,
      serviceId: ctx.service.id,
      capacity: 'full_account',
      salePrice: '80.00',
    });
    const sale = values(ctx, { planId: plan.id, profileIds: ctx.profiles.map((p) => p.id) });

    await expectRedirect(submit(ctx, sale), `/${ctx.company.id}/sales/${sale.id}`);

    const [row] = await db.select().from(sales).where(eq(sales.id, sale.id));
    expect(row).toMatchObject({ capacity: 'full_account', price: '80.00' });
    expect(await db.select().from(saleProfiles).where(eq(saleProfiles.saleId, sale.id))).toHaveLength(4);
    const occupied = await db
      .select()
      .from(profiles)
      .where(inArray(profiles.id, ctx.profiles.map((p) => p.id)));
    expect(occupied.every((p) => p.status === 'occupied')).toBe(true);
  });

  it('a full_account sale rejects a wrong number of profiles', async () => {
    const ctx = await context(4);
    const plan = await createPlan(db, { companyId: ctx.company.id, serviceId: ctx.service.id, capacity: 'full_account' });

    const result = await submit(ctx, values(ctx, { planId: plan.id, profileIds: ctx.profiles.slice(0, 3).map((p) => p.id) }));

    expect(result.fieldErrors?.profileIds?.[0]).toBe('Un plan de cuenta completa requiere exactamente 4 perfiles.');
    expect(await db.select().from(sales)).toHaveLength(0);
  });

  it('a full_account sale rejects profiles from different accounts', async () => {
    const ctx = await context(2);
    const plan = await createPlan(db, { companyId: ctx.company.id, serviceId: ctx.service.id, capacity: 'full_account' });
    const other = await createAccountWithProfiles(db, { companyId: ctx.company.id, serviceId: ctx.service.id }, 2);

    const result = await submit(ctx, values(ctx, { planId: plan.id, profileIds: [ctx.profiles[0].id, other.profiles[0].id] }));

    expect(result.fieldErrors?.profileIds?.[0]).toBe(
      'Todos los perfiles de una cuenta completa deben pertenecer a la misma cuenta.',
    );
  });

  it('a profile capacity plan rejects more than one profile', async () => {
    const ctx = await context();

    const result = await submit(ctx, values(ctx, { profileIds: [ctx.profiles[0].id, ctx.profiles[1].id] }));

    expect(result.status).toBe('error');
    expect(result.fieldErrors?.profileIds?.[0]).toBe('Un plan de capacidad "perfil" requiere exactamente 1 perfil.');
    expect(await profileStatus(ctx.profiles[0].id)).toBe('available');
  });

  it('a sale cannot be created for an inactive client', async () => {
    const ctx = await context();
    await db.update(clients).set({ status: 'inactive' }).where(eq(clients.id, ctx.client.id));

    const result = await submit(ctx, values(ctx));

    expect(result.fieldErrors?.clientId?.[0]).toBe('Solo se puede vender a clientes activos.');
    expect(await db.select().from(sales)).toHaveLength(0);
    expect(await db.select().from(transactions)).toHaveLength(0);
  });

  it('a sale cannot use a client or a plan of another company', async () => {
    const ctx = await context();
    const foreign = await makeSaleContext(db);
    setSessionUser(ctx.user);

    const byClient = await submit(ctx, values(ctx, { clientId: foreign.client.id }));
    const byPlan = await submit(ctx, values(ctx, { planId: foreign.plan.id }));

    expect(byClient.fieldErrors?.clientId?.[0]).toBe('El cliente seleccionado no existe.');
    expect(byPlan.fieldErrors?.planId?.[0]).toBe('El plan seleccionado no existe.');
  });

  it('a sale rejects a profile from a different service of the company', async () => {
    const ctx = await context();
    const otherService = await createService(db, { companyId: ctx.company.id, maxProfiles: 2 });
    const other = await createAccountWithProfiles(db, { companyId: ctx.company.id, serviceId: otherService.id }, 2);

    const result = await submit(ctx, values(ctx, { profileIds: [other.profiles[0].id] }));

    expect(result.fieldErrors?.profileIds?.[0]).toBe(
      'Todos los perfiles deben pertenecer a cuentas del servicio del plan seleccionado.',
    );
    expect(await profileStatus(other.profiles[0].id)).toBe('available');
  });

  it('a sale rejects a profile from another company and unknown profiles', async () => {
    const ctx = await context();
    const foreign = await makeSaleContext(db);
    setSessionUser(ctx.user);

    const byCompany = await submit(ctx, values(ctx, { profileIds: [foreign.profiles[0].id] }));
    const unknown = await submit(ctx, values(ctx, { profileIds: [uuidv7()] }));

    expect(byCompany.fieldErrors?.profileIds?.[0]).toMatch(/servicio del plan seleccionado/);
    expect(unknown.fieldErrors?.profileIds?.[0]).toBe('Uno o más perfiles no existen.');
  });

  it('an unavailable profile returns a conflict with its label and persists nothing', async () => {
    const ctx = await context();
    await db.update(profiles).set({ status: 'occupied' }).where(eq(profiles.id, ctx.profiles[0].id));
    await db.update(profiles).set({ status: 'maintenance' }).where(eq(profiles.id, ctx.profiles[1].id));
    const plan = await createPlan(db, { companyId: ctx.company.id, serviceId: ctx.service.id, capacity: 'full_account' });

    const single = await submit(ctx, values(ctx));
    const full = await submit(ctx, values(ctx, { planId: plan.id, profileIds: ctx.profiles.map((p) => p.id) }));

    expect(single).toMatchObject({
      status: 'conflict',
      message: 'Algunos perfiles ya no están disponibles. Selecciona otros perfiles del mismo servicio.',
      details: { unavailableProfiles: [{ id: ctx.profiles[0].id, label: `${ctx.account.email} · Perfil 1` }] },
    });
    expect((full.details?.unavailableProfiles as { label: string }[]).map((p) => p.label).sort()).toEqual([
      `${ctx.account.email} · Perfil 1`,
      `${ctx.account.email} · Perfil 2`,
    ]);
    expect(await db.select().from(sales)).toHaveLength(0);
    expect(await db.select().from(saleProfiles)).toHaveLength(0);
    expect(await db.select().from(transactions)).toHaveLength(0);
    expect(await profileStatus(ctx.profiles[2].id)).toBe('available');
  });

  it('concurrent creates on the same profile: exactly one succeeds', async () => {
    const ctx = await context();

    const results = await Promise.allSettled([submit(ctx, values(ctx)), submit(ctx, values(ctx)), submit(ctx, values(ctx))]);

    const redirected = results.filter(
      (r) => r.status === 'rejected' && String((r.reason as Error).message).startsWith('NEXT_REDIRECT:'),
    );
    const conflicts = results.filter((r) => r.status === 'fulfilled' && r.value.status === 'conflict');
    expect(redirected).toHaveLength(1);
    expect(conflicts).toHaveLength(2);
    expect(await db.select().from(sales)).toHaveLength(1);
    expect(await db.select().from(saleProfiles)).toHaveLength(1);
    expect(await db.select().from(transactions)).toHaveLength(1);
  });

  it('concurrent creates on different profiles never duplicate a code', async () => {
    const ctx = await context(4);

    await Promise.allSettled(ctx.profiles.map((p) => submit(ctx, values(ctx, { profileIds: [p.id] }))));

    const codes = (await db.select({ code: sales.code }).from(sales)).map((r) => r.code).sort();
    expect(codes).toEqual(['SAL000001', 'SAL000002', 'SAL000003', 'SAL000004']);
  });

  it('each company has its own code sequence', async () => {
    const ctx = await context();
    const other = await makeSaleContext(db);

    setSessionUser(ctx.user);
    await expectRedirect(submit(ctx, values(ctx)), `/${ctx.company.id}/sales/`);
    await expectRedirect(submit(ctx, values(ctx, { profileIds: [ctx.profiles[1].id] })), `/${ctx.company.id}/sales/`);
    setSessionUser(other.user);
    await expectRedirect(submit(other, values(other)), `/${other.company.id}/sales/`);

    const rows = await db.select({ companyId: sales.companyId, code: sales.code }).from(sales);
    expect(rows.filter((r) => r.companyId === ctx.company.id).map((r) => r.code).sort()).toEqual(['SAL000001', 'SAL000002']);
    expect(rows.filter((r) => r.companyId === other.company.id).map((r) => r.code)).toEqual(['SAL000001']);
  });

  it('the input shape is validated with Spanish messages', async () => {
    const ctx = await context();

    const empty = await createSaleAction(ctx.company.id, initialActionState, form({ id: uuidv7() }));
    const badDate = await submit(ctx, values(ctx, { startDate: '2026-02-30' }));
    const badProfile = await submit(ctx, values(ctx, { profileIds: ['nope'] }));

    expect(empty.fieldErrors).toMatchObject({
      clientId: ['Selecciona un cliente.'],
      planId: ['Selecciona un plan.'],
      startDate: ['La fecha de inicio es obligatoria.'],
      profileIds: ['Selecciona al menos un perfil.'],
    });
    expect(badDate.fieldErrors?.startDate?.[0]).toBe('La fecha de inicio no es válida.');
    expect(badProfile.fieldErrors?.profileIds?.[0]).toBe('Uno o más perfiles no son válidos.');
  });

  it('a user without permission cannot create a sale', async () => {
    const ctx = await context();
    await assignRoleWithPermissions(db, ctx.user.id, ctx.company.id, ['sales.list']);

    const result = await submit(ctx, values(ctx));

    expect(result).toMatchObject({ status: 'error', message: FORBIDDEN_MESSAGE });
    expect(await db.select().from(sales)).toHaveLength(0);
    expect(await profileStatus(ctx.profiles[0].id)).toBe('available');
  });

  it('any active client of the company can be sold to', async () => {
    const ctx = await context();
    const client = await createClient(db, { companyId: ctx.company.id, name: 'Otra' });

    const sale = values(ctx, { clientId: client.id });
    await expectRedirect(submit(ctx, sale), `/${ctx.company.id}/sales/${sale.id}`);
  });
});
