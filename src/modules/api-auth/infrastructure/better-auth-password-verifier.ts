import { auth } from '@/lib/auth';
import type { PasswordVerifier } from '../services/ports';

/** Uses better-auth's own hashing so API logins accept the same passwords as the web login. */
export class BetterAuthPasswordVerifier implements PasswordVerifier {
  async verify(hash: string, password: string): Promise<boolean> {
    const ctx = await auth.$context;
    return ctx.password.verify({ hash, password });
  }
}
