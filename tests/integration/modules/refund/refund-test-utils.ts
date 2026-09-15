import { asc, eq } from 'drizzle-orm';
import { db } from '@/db/client';
import { initialActionState } from '@/modules/shared/actions/action-state';
import { uuidv7 } from '@/modules/shared/uuid';
import { refunds, type RefundRow } from '@/modules/refund/models/refund.model';
import { transactions } from '@/modules/transaction/models/transaction.model';
import { createRefundAction } from '@/app/[companyId]/refunds/actions';
import { setSessionUser } from '../../../helpers/session-mock';
import { makeSaleContext, type SaleContext } from '../../../helpers/sale-context';
import { formData } from '../../../helpers/form-data';

export const forbiddenUrl = (companyId: string) => `/${companyId}/dashboard?error=forbidden`;
export const FORBIDDEN_MESSAGE = 'No tienes permiso para acceder a esta sección.';
export const RESOLVED_MESSAGE = 'El reembolso ya fue resuelto y no puede modificarse.';

/** Admin user + company + client + service + plan + account with profiles, logged in. */
export async function refundContext(): Promise<SaleContext> {
  const ctx = await makeSaleContext(db);
  setSessionUser(ctx.user);
  return ctx;
}

export const submitCreate = (companyId: string, values: Record<string, string | number | null | undefined>) =>
  createRefundAction(companyId, initialActionState, formData({ id: uuidv7(), ...values }));

export async function reloadRefund(id: string): Promise<RefundRow> {
  const [row] = await db.select().from(refunds).where(eq(refunds.id, id));
  return row;
}

export function allRefunds() {
  return db.select().from(refunds).orderBy(asc(refunds.code));
}

export function ledgerOfRefund(refundId: string) {
  return db.select().from(transactions).where(eq(transactions.relatedId, refundId));
}

export const allLedger = () => db.select().from(transactions);
