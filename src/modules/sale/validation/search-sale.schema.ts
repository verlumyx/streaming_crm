import { z } from 'zod';
import { SALE_STATUSES } from '../models/sale.model';
import { limitParam, offsetParam, optionalEnumFilter, optionalFilter } from '@/modules/shared/validation/fields';
import { DEFAULT_PAGE_SIZE } from '@/modules/shared/pagination/page-items';
import { optionalDateFilter, optionalDaysFilter, optionalListFilter, optionalUuidFilter } from './sale-fields';

/** Listar: `searchParams` of the index page (also reused by the expirations report). Never throws. */
export const searchSaleSchema = z.object({
  code: optionalFilter,
  status: optionalEnumFilter(SALE_STATUSES),
  statusIn: optionalListFilter(SALE_STATUSES),
  clientId: optionalUuidFilter,
  agentId: optionalUuidFilter,
  serviceId: optionalUuidFilter,
  dateFrom: optionalDateFilter,
  dateTo: optionalDateFilter,
  endDateFrom: optionalDateFilter,
  endDateTo: optionalDateFilter,
  expiringSoon: optionalDaysFilter,
  limit: limitParam(DEFAULT_PAGE_SIZE),
  offset: offsetParam(),
});

export type SearchSaleInput = z.infer<typeof searchSaleSchema>;
