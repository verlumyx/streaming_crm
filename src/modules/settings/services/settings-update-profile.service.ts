import type { UserRow } from '@/db/auth-schema';
import type { SettingsRepository } from '../repositories/settings.repository';
import type { UpdateProfileCommand } from '../commands/update-profile.command';
import { SettingsUserNotFoundException } from '../exceptions/settings-user-not-found.exception';
import { SettingsEmailAlreadyInUseException } from '../exceptions/settings-email-already-in-use.exception';

export type UpdateProfileResult = { user: UserRow; emailChanged: boolean };

/** Perfil: name + email. A new email is marked as unverified (Fortify's `email_verified_at = null`). */
export class SettingsUpdateProfileService {
  constructor(private readonly repository: SettingsRepository) {}

  async execute(command: UpdateProfileCommand): Promise<UpdateProfileResult> {
    const current = await this.repository.findUserById(command.userId);
    if (!current) throw new SettingsUserNotFoundException();

    const emailChanged = current.email.toLowerCase() !== command.email.toLowerCase();

    if (emailChanged && (await this.repository.existsUserWithEmail(command.email, command.userId))) {
      throw new SettingsEmailAlreadyInUseException();
    }

    await this.repository.updateProfile(command.userId, {
      name: command.name,
      email: emailChanged ? command.email : current.email,
      emailVerified: emailChanged ? false : current.emailVerified,
    });

    const user = await this.repository.findUserById(command.userId);
    if (!user) throw new SettingsUserNotFoundException();
    return { user, emailChanged };
  }
}
