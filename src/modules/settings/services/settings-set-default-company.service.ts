import type { SettingsRepository } from '../repositories/settings.repository';
import type { SetDefaultCompanyCommand } from '../commands/set-default-company.command';
import { SettingsCompanyNotMemberException } from '../exceptions/settings-company-not-member.exception';

/** Empresa predeterminada: exactly one default membership per user. */
export class SettingsSetDefaultCompanyService {
  constructor(private readonly repository: SettingsRepository) {}

  async execute(command: SetDefaultCompanyCommand): Promise<void> {
    const membership = await this.repository.findMembership(command.userId, command.companyId);
    if (!membership) throw new SettingsCompanyNotMemberException();

    await this.repository.setDefaultCompany(command.userId, command.companyId);
  }
}
