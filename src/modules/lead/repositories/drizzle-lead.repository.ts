import type { DbExecutor } from '@/modules/shared/infrastructure/db-executor';
import { leads, type LeadRow } from '../models/lead.model';
import type { LeadRepository } from './lead.repository';
import type { CreateLeadCommand } from '../commands/create-lead.command';

export class DrizzleLeadRepository implements LeadRepository {
  constructor(private readonly db: DbExecutor) {}

  async create(command: CreateLeadCommand): Promise<LeadRow> {
    const [row] = await this.db
      .insert(leads)
      .values({
        id: command.id,
        name: command.name,
        email: command.email,
        phone: command.phone,
        status: 'pending',
      })
      .returning();
    return row;
  }
}
