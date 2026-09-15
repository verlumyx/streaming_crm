import 'dotenv/config';
import { vi } from 'vitest';

// Integration tests hit the dedicated test database, never the dev one.
if (process.env.DATABASE_URL_TEST) {
  process.env.DATABASE_URL = process.env.DATABASE_URL_TEST;
}

// `server-only` throws outside the Next.js runtime.
vi.mock('server-only', () => ({}));

// Session stub: tests call `setSessionUser(user)` from `tests/helpers/session-state`.
vi.mock('@/modules/shared/auth/session', async () => {
  const { currentSessionUser } = await import('./helpers/session-state');
  return {
    getSession: vi.fn(async () => {
      const user = currentSessionUser();
      return user ? { user, session: { id: 'test-session' } } : null;
    }),
    getSessionUser: vi.fn(async () => currentSessionUser()),
    requireSessionUser: vi.fn(async () => {
      const user = currentSessionUser();
      if (!user) throw new Error('NEXT_REDIRECT:/login');
      return user;
    }),
  };
});

// Next.js runtime APIs: `redirect()` throws `NEXT_REDIRECT:<url>`, `notFound()` throws `NEXT_NOT_FOUND`.
vi.mock('next/headers', () => ({
  headers: vi.fn(async () => new Headers()),
  cookies: vi.fn(async () => ({ get: () => undefined, set: () => undefined, delete: () => undefined })),
}));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn(), revalidateTag: vi.fn() }));
vi.mock('next/navigation', () => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`NEXT_REDIRECT:${url}`);
  }),
  notFound: vi.fn(() => {
    throw new Error('NEXT_NOT_FOUND');
  }),
}));
vi.mock('@/modules/shared/flash/flash', () => ({
  setFlash: vi.fn(),
  readFlash: vi.fn(async () => null),
  clearFlash: vi.fn(),
}));
