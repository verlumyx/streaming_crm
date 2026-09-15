import type { LeadRow } from '../models/lead.model';
import type { CreateLeadCommand } from '../commands/create-lead.command';

export interface LeadRepository {
  create(command: CreateLeadCommand): Promise<LeadRow>;
}
