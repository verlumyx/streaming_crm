import { describe, expect, it } from 'vitest';
import { SettingsFindProfileService } from '@/modules/settings/services/settings-find-profile.service';
import { SettingsUpdateProfileService } from '@/modules/settings/services/settings-update-profile.service';
import { SettingsSetDefaultCompanyService } from '@/modules/settings/services/settings-set-default-company.service';
import { UpdateProfileCommand } from '@/modules/settings/commands/update-profile.command';
import { SetDefaultCompanyCommand } from '@/modules/settings/commands/set-default-company.command';
import { SettingsEmailAlreadyInUseException } from '@/modules/settings/exceptions/settings-email-already-in-use.exception';
import { SettingsUserNotFoundException } from '@/modules/settings/exceptions/settings-user-not-found.exception';
import { SettingsCompanyNotMemberException } from '@/modules/settings/exceptions/settings-company-not-member.exception';
import { ForbiddenError, ValidationError } from '@/modules/shared/exceptions/domain-error';
import { buildMembershipRow, buildUserRow, FakeSettingsRepository } from './fake-settings.repository';

const USER = '0192f3a0-0000-7000-8000-000000000001';
const OTHER_USER = '0192f3a0-0000-7000-8000-000000000002';
const COMPANY_A = '0192f3a0-0000-7000-8000-00000000c001';
const COMPANY_B = '0192f3a0-0000-7000-8000-00000000c002';
const COMPANY_C = '0192f3a0-0000-7000-8000-00000000c003';

describe('SettingsUpdateProfileService', () => {
  it('updates the name and keeps the verification when the email is unchanged', async () => {
    const repository = new FakeSettingsRepository([buildUserRow({ id: USER, email: 'ana@example.com' })]);

    const { user, emailChanged } = await new SettingsUpdateProfileService(repository).execute(
      new UpdateProfileCommand(USER, 'Ana María', 'ANA@example.com'),
    );

    expect(emailChanged).toBe(false);
    expect(user).toMatchObject({ name: 'Ana María', email: 'ana@example.com', emailVerified: true });
  });

  it('marks a new email as unverified', async () => {
    const repository = new FakeSettingsRepository([buildUserRow({ id: USER })]);

    const { user, emailChanged } = await new SettingsUpdateProfileService(repository).execute(
      new UpdateProfileCommand(USER, 'Ana', 'nueva@example.com'),
    );

    expect(emailChanged).toBe(true);
    expect(user).toMatchObject({ email: 'nueva@example.com', emailVerified: false });
  });

  it('rejects an email used by another user (case-insensitive)', async () => {
    const repository = new FakeSettingsRepository([
      buildUserRow({ id: USER }),
      buildUserRow({ id: OTHER_USER, email: 'tomado@example.com' }),
    ]);

    const promise = new SettingsUpdateProfileService(repository).execute(
      new UpdateProfileCommand(USER, 'Ana', 'TOMADO@example.com'),
    );

    await expect(promise).rejects.toBeInstanceOf(SettingsEmailAlreadyInUseException);
    await expect(promise).rejects.toBeInstanceOf(ValidationError);
    expect(repository.users[0].email).toBe('ana@example.com');
  });

  it('throws when the user does not exist', async () => {
    const repository = new FakeSettingsRepository();

    await expect(
      new SettingsUpdateProfileService(repository).execute(new UpdateProfileCommand(USER, 'Ana', 'a@x.com')),
    ).rejects.toBeInstanceOf(SettingsUserNotFoundException);
    await expect(new SettingsFindProfileService(repository).execute(USER)).rejects.toBeInstanceOf(
      SettingsUserNotFoundException,
    );
  });
});

describe('SettingsSetDefaultCompanyService', () => {
  it('leaves exactly one default membership', async () => {
    const repository = new FakeSettingsRepository(
      [],
      [
        buildMembershipRow({ userId: USER, companyId: COMPANY_A, isDefault: true }),
        buildMembershipRow({ userId: USER, companyId: COMPANY_B }),
        buildMembershipRow({ userId: OTHER_USER, companyId: COMPANY_A, isDefault: true }),
      ],
    );

    await new SettingsSetDefaultCompanyService(repository).execute(new SetDefaultCompanyCommand(USER, COMPANY_B));

    const mine = repository.memberships.filter((m) => m.userId === USER);
    expect(mine.filter((m) => m.isDefault).map((m) => m.companyId)).toEqual([COMPANY_B]);
    // Other users are untouched.
    expect(repository.memberships.find((m) => m.userId === OTHER_USER)?.isDefault).toBe(true);
  });

  it('rejects a company the user does not belong to', async () => {
    const repository = new FakeSettingsRepository([], [buildMembershipRow({ userId: USER, companyId: COMPANY_A, isDefault: true })]);

    const promise = new SettingsSetDefaultCompanyService(repository).execute(new SetDefaultCompanyCommand(USER, COMPANY_C));

    await expect(promise).rejects.toBeInstanceOf(SettingsCompanyNotMemberException);
    await expect(promise).rejects.toBeInstanceOf(ForbiddenError);
    expect(repository.memberships[0].isDefault).toBe(true);
  });
});
