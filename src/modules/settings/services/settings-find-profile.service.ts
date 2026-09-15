import type { UserRow } from '@/db/auth-schema';
import type { SettingsRepository } from '../repositories/settings.repository';
import { SettingsUserNotFoundException } from '../exceptions/settings-user-not-found.exception';

/**
 * Reads the user row straight from the database: the session may come from the
 * better-auth cookie cache and lag behind a profile / 2FA change.
 */
export class SettingsFindProfileService {
  constructor(private readonly repository: SettingsRepository) {}

  async execute(userId: string): Promise<UserRow> {
    const row = await this.repository.findUserById(userId);
    if (!row) throw new SettingsUserNotFoundException();
    return row;
  }
}
