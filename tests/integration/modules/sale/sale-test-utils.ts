import { asc, desc, eq } from 'drizzle-orm';
import { db } from '@/db/client';
import { addDays, todayIsoDate } from '@/lib/format';
import { profiles } from '@/modules/account/models/account.model';
import { saleProfiles, saleRenewals, sales, type SaleRow, type SaleStatus } from '@/modules/sale/models/sale.model';
import { transactions } from '@/modules/transaction/models/transaction.model';
import { refunds } from '@/modules/refund/models/refund.model';
import { createSale } from '../../../factories/sale.factory';
import type { SaleContext } from '../../../helpers/sale-context';

export const today = () => todayIsoDate();
export const daysFromToday = (days: number) => addDays(todayIsoDate(), days);
export const forbiddenUrl = (companyId: string) => `/${companyId}/dashboard?error=forbidden`;
export const FORBIDDEN_MESSAGE = 'No tienes permiso para acceder a esta sección.';

/** A one-profile sale of the context ending on `endDate` (30-day snapshot). Non-cancelled sales occupy the profile. */
export function saleEnding(
  ctx: SaleContext,
  endDate: string,
  opts: { status?: SaleStatus; profileIndex?: number; clientId?: string; price?: string; agentId?: string } = {},
): Promise<SaleRow> {
  return createSale(db, {
    companyId: ctx.company.id,
    clientId: opts.clientId ?? ctx.client.id,
    planId: ctx.plan.id,
    serviceId: ctx.service.id,
    agentId: opts.agentId ?? ctx.user.id,
    status: opts.status ?? 'active',
    startDate: addDays(endDate, -30),
    endDate,
    price: opts.price,
    profileIds: [ctx.profiles[opts.profileIndex ?? 0].id],
  });
}

/** FormData like the browser submits it: arrays are appended once per value. */
export function form(values: Record<string, string | number | string[] | null | undefined>): FormData {
  const data = new FormData();
  for (const [key, value] of Object.entries(values)) {
    if (value === undefined || value === null) continue;
    if (Array.isArray(value)) value.forEach((item) => data.append(key, item));
    else data.set(key, String(value));
  }
  return data;
}

export async function reloadSale(id: string): Promise<SaleRow> {
  const [row] = await db.select().from(sales).where(eq(sales.id, id));
  return row;
}

export async function profileStatus(id: string): Promise<string> {
  const [row] = await db.select({ status: profiles.status }).from(profiles).where(eq(profiles.id, id));
  return row.status;
}

export async function saleProfileIds(saleId: string): Promise<string[]> {
  const rows = await db
    .select({ profileId: saleProfiles.profileId })
    .from(saleProfiles)
    .where(eq(saleProfiles.saleId, saleId))
    .orderBy(asc(saleProfiles.createdAt));
  return rows.map((r) => r.profileId);
}

export function ledgerOf(saleId: string) {
  return db.select().from(transactions).where(eq(transactions.relatedId, saleId)).orderBy(asc(transactions.createdAt));
}

export function renewalsOf(saleId: string) {
  return db.select().from(saleRenewals).where(eq(saleRenewals.saleId, saleId)).orderBy(desc(saleRenewals.createdAt));
}

export function refundsOf(saleId: string) {
  return db.select().from(refunds).where(eq(refunds.saleId, saleId));
}
