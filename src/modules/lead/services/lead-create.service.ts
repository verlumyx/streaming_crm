import type { LeadRow } from '../models/lead.model';
import type { LeadRepository } from '../repositories/lead.repository';
import type { CreateLeadCommand } from '../commands/create-lead.command';

/** Crear: stores a pending lead from the public contact form. */
export class LeadCreateService {
  constructor(private readonly repository: LeadRepository) {}

  execute(command: CreateLeadCommand): Promise<LeadRow> {
    return this.repository.create(command);
  }
}
