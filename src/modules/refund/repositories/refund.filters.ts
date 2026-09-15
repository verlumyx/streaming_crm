import { eq, ilike, or } from 'drizzle-orm';
import { contains, type FilterMap } from '@/modules/shared/infrastructure/drizzle-query-filters';
import { refunds, type RefundStatus } from '../models/refund.model';

/** Keys MUST match `SearchRefundCommand.filters`. Filters combine with AND; `q` matches code OR reason. */
export const refundFilters = {
  q: (value) => or(ilike(refunds.code, contains(value)), ilike(refunds.reason, contains(value))),
  status: (value) => eq(refunds.status, value as RefundStatus),
  saleId: (value) => eq(refunds.saleId, value),
  clientId: (value) => eq(refunds.clientId, value),
} satisfies FilterMap;
