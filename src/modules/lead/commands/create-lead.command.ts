import { uuidv7 } from '@/modules/shared/uuid';
import type { CreateLeadInput } from '../validation/create-lead.schema';

/** Leads are public submissions: the id is generated on the server, never taken from the form. */
export class CreateLeadCommand {
  constructor(
    readonly id: string,
    readonly name: string,
    readonly email: string,
    readonly phone: string,
  ) {}

  static fromInput(input: CreateLeadInput, id: string = uuidv7()): CreateLeadCommand {
    return new CreateLeadCommand(id, input.name, input.email, input.phone);
  }
}
