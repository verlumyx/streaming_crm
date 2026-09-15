import type { UserRow } from '@/db/auth-schema';
import type { ApiAuthRepository } from '../repositories/api-auth.repository';
import type { LoginCommand } from '../commands/login.command';
import type { ApiTokenFactory, PasswordVerifier } from './ports';
import { InvalidCredentialsException } from '../exceptions/invalid-credentials.exception';
import { MaxDevicesReachedException } from '../exceptions/max-devices-reached.exception';

export const MAX_DEVICES = 2;

/** Mobile login: valid credentials and fewer than MAX_DEVICES active tokens → a new device token. */
export class ApiLoginService {
  constructor(
    private readonly repository: ApiAuthRepository,
    private readonly passwords: PasswordVerifier,
    private readonly tokens: ApiTokenFactory,
  ) {}

  async execute(command: LoginCommand): Promise<{ user: UserRow; token: string }> {
    const found = await this.repository.findCredentialUserByEmail(command.email);
    if (!found || !(await this.passwords.verify(found.passwordHash, command.password))) {
      throw new InvalidCredentialsException();
    }

    if ((await this.repository.countTokens(found.user.id)) >= MAX_DEVICES) {
      throw new MaxDevicesReachedException();
    }

    const { plain, hash } = this.tokens.issue();
    await this.repository.createToken({
      id: this.tokens.newId(),
      userId: found.user.id,
      name: command.deviceName,
      tokenHash: hash,
    });

    return { user: found.user, token: plain };
  }
}
