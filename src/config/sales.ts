const graceDays = Number.parseInt(process.env.SALES_GRACE_PERIOD_DAYS ?? '', 10);
const reservationMinutes = Number.parseInt(process.env.SALES_PENDING_RESERVATION_MINUTES ?? '', 10);

export const salesConfig = {
  /** Days after `end_date` during which an expired sale can still be renewed and keeps its profiles. */
  gracePeriodDays: Number.isFinite(graceDays) && graceDays >= 0 ? graceDays : 3,
  /**
   * How long a `pending` sale holds the profiles it asked for. A pending sale does not occupy them
   * (only approval does), so without this window two customers could pay for the same profile and
   * only one of the sales could be approved.
   */
  pendingReservationMinutes:
    Number.isFinite(reservationMinutes) && reservationMinutes >= 0 ? reservationMinutes : 120,
} as const;
