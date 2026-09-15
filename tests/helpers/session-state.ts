import type { UserRow } from '@/db/auth-schema';

/** Shared state behind the session mock registered in `tests/setup.ts`. */
const state: { user: UserRow | null } = { user: null };

export function setSessionUser(user: UserRow | null): void {
  state.user = user;
}

export function currentSessionUser(): UserRow | null {
  return state.user;
}
