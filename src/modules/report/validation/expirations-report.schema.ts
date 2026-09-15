import { z } from 'zod';
import { limitParam, offsetParam, optionalDateParam, searchedParam } from '@/modules/shared/validation/fields';

const first = (v: unknown) => (Array.isArray(v) ? v[0] : v);

export const EXPIRATION_DAYS = [7, 15, 30] as const;
export const EXPIRATION_STATUSES = ['expiring', 'expired', 'all'] as const;
export type ExpirationStatusFilter = (typeof EXPIRATION_STATUSES)[number];

/** Vencimientos: `searchParams`. Never throws; unknown values fall back to the defaults. */
export const expirationsReportSchema = z.object({
  days: z
    .preprocess(first, z.coerce.number().int())
    .refine((d) => (EXPIRATION_DAYS as readonly number[]).includes(d))
    .catch(7),
  status: z.preprocess(first, z.enum(EXPIRATION_STATUSES)).catch('expiring'),
  serviceId: z.preprocess(first, z.uuid().optional()).catch(undefined),
  agentId: z.preprocess(first, z.uuid().optional()).catch(undefined),
  dateFrom: optionalDateParam,
  dateTo: optionalDateParam,
  searched: searchedParam,
  limit: limitParam(50, 200),
  offset: offsetParam(),
});

export type ExpirationsReportInput = z.infer<typeof expirationsReportSchema>;
