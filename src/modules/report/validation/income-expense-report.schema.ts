import { z } from 'zod';
import { limitParam, offsetParam, optionalDateParam, searchedParam } from '@/modules/shared/validation/fields';

/** Ingresos y gastos: `searchParams`. The date range defaults to the current month (resolved by the page). */
export const incomeExpenseReportSchema = z.object({
  dateFrom: optionalDateParam,
  dateTo: optionalDateParam,
  searched: searchedParam,
  limit: limitParam(50, 200),
  offset: offsetParam(),
});

export type IncomeExpenseReportInput = z.infer<typeof incomeExpenseReportSchema>;
