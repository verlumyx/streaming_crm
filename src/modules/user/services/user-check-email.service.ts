import type { UserRepository } from '../repositories/user.repository';
import type { UserCompanyRepository } from '../repositories/user-company.repository';

export type UserEmailCheck = {
  exists: boolean;
  alreadyInCompany: boolean;
  user: { id: string; name: string } | null;
};

/** Step 1 of Crear: does a global user with this email exist, and is it already a member of the company? */
export class UserCheckEmailService {
  constructor(
    private readonly users: UserRepository,
    private readonly memberships: UserCompanyRepository,
  ) {}

  async execute(email: string, companyId: string): Promise<UserEmailCheck> {
    const existing = await this.users.findIdentityByEmail(email);
    if (!existing) return { exists: false, alreadyInCompany: false, user: null };

    const membership = await this.memberships.find(existing.id, companyId);
    return { exists: true, alreadyInCompany: Boolean(membership), user: { id: existing.id, name: existing.name } };
  }
}
