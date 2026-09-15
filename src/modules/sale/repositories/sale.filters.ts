import { and, between, eq, gte, ilike, inArray, lte } from 'drizzle-orm';
import { addDays } from '@/lib/format';
import { isUuid } from '@/modules/shared/uuid';
import { contains, type FilterMap } from '@/modules/shared/infrastructure/drizzle-query-filters';
import { sales, SALE_STATUSES, type SaleStatus } from '../models/sale.model';
import { isIsoDate } from '../validation/sale-fields';

const isStatus = (value: string): value is SaleStatus => (SALE_STATUSES as readonly string[]).includes(value);

/**
 * Keys MUST match `SearchSaleCommand.filters`. Filters combine with AND; invalid values are ignored
 * (the expirations report reuses these keys without going through the page schema).
 * `today` anchors the relative `expiringSoon` window so callers and tests stay deterministic.
 */
export function createSaleFilters(today: string) {
  return {
    code: (value) => ilike(sales.code, contains(value)),
    status: (value) => (isStatus(value) ? eq(sales.status, value) : undefined),
    statusIn: (value) => {
      const list = value.split(',').map((s) => s.trim()).filter(isStatus);
      return list.length ? inArray(sales.status, list) : undefined;
    },
    clientId: (value) => (isUuid(value) ? eq(sales.clientId, value) : undefined),
    agentId: (value) => (isUuid(value) ? eq(sales.agentId, value) : undefined),
    serviceId: (value) => (isUuid(value) ? eq(sales.serviceId, value) : undefined),
    dateFrom: (value) => (isIsoDate(value) ? gte(sales.startDate, value) : undefined),
    dateTo: (value) => (isIsoDate(value) ? lte(sales.startDate, value) : undefined),
    endDateFrom: (value) => (isIsoDate(value) ? gte(sales.endDate, value) : undefined),
    endDateTo: (value) => (isIsoDate(value) ? lte(sales.endDate, value) : undefined),
    expiringSoon: (value) => {
      const days = Number.parseInt(value, 10);
      if (!Number.isFinite(days) || days < 0) return undefined;
      return and(eq(sales.status, 'active'), between(sales.endDate, today, addDays(today, days)));
    },
  } satisfies FilterMap;
}
