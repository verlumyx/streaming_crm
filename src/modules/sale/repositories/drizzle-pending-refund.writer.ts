import type { DbExecutor } from '@/modules/shared/infrastructure/db-executor';
import { createRefundContainer } from '@/modules/refund/container';
import type { PendingRefundData, PendingRefundWriter } from './pending-refund.writer';

/** Delegates to the Refund module repository so manual refunds and "Expulsar" refunds share one insert path and code sequence. */
export class DrizzlePendingRefundWriter implements PendingRefundWriter {
  constructor(private readonly db: DbExecutor) {}

  create(refund: PendingRefundData): Promise<void> {
    return createRefundContainer(this.db).repository.create(refund);
  }
}
