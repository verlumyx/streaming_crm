import { addDays, diffInDays } from '@/lib/format';
import type { DashboardRepository } from '../repositories/dashboard.repository';
import type { DashboardExpirationDto } from '../serializers/dashboard.serializer';

export const EXPIRATIONS_LOOKAHEAD_DAYS = 9;
export const EXPIRATIONS_LIMIT = 8;

/** Active or expired sales ending within the next 9 days (or already overdue), soonest first. */
export class DashboardExpirationsService {
  constructor(private readonly repository: DashboardRepository) {}

  async execute(companyId: string, today: string): Promise<DashboardExpirationDto[]> {
    const rows = await this.repository.upcomingSales(
      companyId,
      addDays(today, EXPIRATIONS_LOOKAHEAD_DAYS),
      EXPIRATIONS_LIMIT,
    );

    return rows.map((sale) => {
      const days = diffInDays(today, sale.endDate);
      return {
        id: sale.id,
        code: sale.code,
        clientName: sale.clientName ?? '—',
        clientPhone: sale.clientPhone,
        serviceName: sale.serviceName ?? '—',
        statusKey: days < 0 ? 'vencido' : days <= 5 ? 'porvencer' : 'activo',
        days,
      };
    });
  }
}
