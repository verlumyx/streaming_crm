import type { CompanyRow } from '../models/company.model';
import type { CompanyRepository, CompanyServicesSeeder } from '../repositories/company.repository';
import type { CreateCompanyCommand } from '../commands/create-company.command';
import { CompanyNameAlreadyExistsException } from '../exceptions/company-name-already-exists.exception';

/**
 * Crear: company + `Administrador` role (all) + the creator's default active membership + default services.
 * Every step runs on the executor the container received: the action opens ONE transaction for all of them.
 */
export class CompanyCreateService {
  constructor(
    private readonly repository: CompanyRepository,
    private readonly servicesSeeder: CompanyServicesSeeder,
  ) {}

  async execute(command: CreateCompanyCommand): Promise<CompanyRow> {
    if (await this.repository.existsByName(command.name)) {
      throw new CompanyNameAlreadyExistsException();
    }

    await this.repository.create(command);
    const roleId = await this.repository.createAdministratorRole(command.id);
    await this.repository.createDefaultMembership(command.createdBy, command.id, roleId);
    await this.servicesSeeder.execute(command.id);

    return this.repository.findOrFail(command.id);
  }
}
