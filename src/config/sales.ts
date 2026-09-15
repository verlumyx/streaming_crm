const parsed = Number.parseInt(process.env.SALES_GRACE_PERIOD_DAYS ?? '', 10);

export const salesConfig = {
  /** Days after `end_date` during which an expired sale can still be renewed and keeps its profiles. */
  gracePeriodDays: Number.isFinite(parsed) && parsed >= 0 ? parsed : 3,
} as const;
