import { describe, expect, it } from 'vitest';
import type { UserRow } from '@/db/auth-schema';
import type { ApiAuthRepository } from '@/modules/api-auth/repositories/api-auth.repository';
import type { ApiTokenFactory, PasswordVerifier } from '@/modules/api-auth/services/ports';
import { ApiLoginService, MAX_DEVICES } from '@/modules/api-auth/services/api-login.service';
import { ApiLogoutService } from '@/modules/api-auth/services/api-logout.service';
import { ApiAuthenticateService } from '@/modules/api-auth/services/api-authenticate.service';
import { LoginCommand } from '@/modules/api-auth/commands/login.command';
import { InvalidCredentialsException } from '@/modules/api-auth/exceptions/invalid-credentials.exception';
import { MaxDevicesReachedException } from '@/modules/api-auth/exceptions/max-devices-reached.exception';

const USER = { id: 'u1', name: 'John', email: 'john@example.com', isSystemOwner: false } as UserRow;

class FakeRepository implements ApiAuthRepository {
  tokens: { id: string; userId: string; name: string; tokenHash: string }[] = [];
  constructor(private readonly users: { user: UserRow; passwordHash: string }[] = [{ user: USER, passwordHash: 'hash:secret123' }]) {}
  async findCredentialUserByEmail(email: string) {
    return this.users.find((u) => u.user.email === email.toLowerCase()) ?? null;
  }
  async countTokens(userId: string) {
    return this.tokens.filter((t) => t.userId === userId).length;
  }
  async createToken(input: { id: string; userId: string; name: string; tokenHash: string }) {
    this.tokens.push(input);
  }
  async findUserByTokenHash(hash: string) {
    const token = this.tokens.find((t) => t.tokenHash === hash);
    return token ? { tokenId: token.id, user: USER } : null;
  }
  async revokeToken(tokenId: string) {
    this.tokens = this.tokens.filter((t) => t.id !== tokenId);
  }
}

const verifier: PasswordVerifier = { verify: async (hash, password) => hash === `hash:${password}` };
let n = 0;
const tokens: ApiTokenFactory = { newId: () => `t${++n}`, issue: () => ({ plain: `plain-${n}`, hash: `h:plain-${n}` }), hash: (p) => `h:${p}` };

describe('ApiLoginService', () => {
  it('authenticates a user and returns a new device token', async () => {
    const repository = new FakeRepository();
    const result = await new ApiLoginService(repository, verifier, tokens).execute(new LoginCommand('John@Example.com', 'secret123', 'mobile'));

    expect(result.user).toBe(USER);
    expect(result.token).toMatch(/^plain-/);
    expect(repository.tokens).toEqual([expect.objectContaining({ userId: 'u1', name: 'mobile' })]);
  });

  it('throws when the user does not exist or the password is incorrect', async () => {
    const service = new ApiLoginService(new FakeRepository(), verifier, tokens);
    await expect(service.execute(new LoginCommand('ghost@example.com', 'secret123', 'mobile'))).rejects.toBeInstanceOf(InvalidCredentialsException);
    await expect(service.execute(new LoginCommand('john@example.com', 'wrong', 'mobile'))).rejects.toBeInstanceOf(InvalidCredentialsException);
  });

  it('throws when the device limit is reached and issues no token', async () => {
    const repository = new FakeRepository();
    for (let i = 0; i < MAX_DEVICES; i++) repository.tokens.push({ id: `x${i}`, userId: 'u1', name: `d${i}`, tokenHash: `hx${i}` });

    await expect(
      new ApiLoginService(repository, verifier, tokens).execute(new LoginCommand('john@example.com', 'secret123', 'mobile')),
    ).rejects.toBeInstanceOf(MaxDevicesReachedException);
    expect(repository.tokens).toHaveLength(MAX_DEVICES);
  });
});

describe('ApiAuthenticateService / ApiLogoutService', () => {
  it('resolves only well-formed bearer headers and revokes the current token', async () => {
    const repository = new FakeRepository();
    repository.tokens.push({ id: 'a', userId: 'u1', name: 'd1', tokenHash: 'h:abc' }, { id: 'b', userId: 'u1', name: 'd2', tokenHash: 'h:def' });
    const authenticate = new ApiAuthenticateService(repository, tokens);

    expect(await authenticate.execute(null)).toBeNull();
    expect(await authenticate.execute('Basic abc')).toBeNull();
    const auth = await authenticate.execute('Bearer abc');
    expect(auth?.tokenId).toBe('a');

    await new ApiLogoutService(repository).execute(auth!.tokenId);
    expect(repository.tokens.map((t) => t.id)).toEqual(['b']);
  });
});
