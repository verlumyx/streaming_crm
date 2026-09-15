import type { MembershipStatus } from '@/modules/shared/models/user-company.model';

/** A user ↔ company membership (`user_company`). */
export class CreateUserCompanyCommand {
  constructor(
    readonly id: string,
    readonly userId: string,
    readonly companyId: string,
    readonly roleId: string | null,
    readonly status: MembershipStatus = 'active',
    readonly isDefault: boolean = false,
  ) {}
}
