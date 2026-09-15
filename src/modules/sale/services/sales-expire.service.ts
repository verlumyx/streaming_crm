import { addDays, todayIsoDate } from '@/lib/format';
import type { SaleRepository } from '../repositories/sale.repository';

/** Runs `work` in its own transaction with a repository bound to it (wired by the container). */
export type SaleTransactionRunner = <T>(work: (repository: SaleRepository) => Promise<T>) => Promise<T>;

export type SalesExpireResult = { expired: number; released: number };

/**
 * Daily expiration job (every company), one transaction per sale:
 * 1. active sales with `endDate < today` → `expired` (profiles stay occupied: grace period);
 * 2. expired sales with `endDate < today − graceDays` → their occupied profiles are freed.
 */
export class SalesExpireService {
  constructor(
    private readonly repository: SaleRepository,
    private readonly runInTransaction: SaleTransactionRunner,
    private readonly graceDays: number,
  ) {}

  async execute(today = todayIsoDate()): Promise<SalesExpireResult> {
    let expired = 0;
    for (const saleId of await this.repository.findDueActiveSaleIds(today)) {
      if (await this.runInTransaction((repository) => repository.markExpired(saleId, today))) expired++;
    }

    const cutoff = addDays(today, -this.graceDays);
    let released = 0;
    for (const saleId of await this.repository.findExpiredSaleIdsEndingBefore(cutoff)) {
      if ((await this.runInTransaction((repository) => repository.releaseProfiles(saleId))) > 0) released++;
    }

    return { expired, released };
  }
}
