/**
 * Session + Next.js runtime stubs are registered globally in `tests/setup.ts`.
 * Tests only need `setSessionUser(user)` (per test) and `expectRedirect(promise, url)`.
 */
export { setSessionUser, currentSessionUser } from './session-state';

/** Asserts that an action/page redirected to `url` (prefix match). */
export async function expectRedirect(promise: Promise<unknown>, url: string): Promise<void> {
  try {
    await promise;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.startsWith('NEXT_REDIRECT:') && message.slice('NEXT_REDIRECT:'.length).startsWith(url)) return;
    throw error;
  }
  throw new Error(`Expected a redirect to ${url}`);
}

/** Asserts that a page called `notFound()`. */
export async function expectNotFound(promise: Promise<unknown>): Promise<void> {
  await expect(promise).rejects.toThrow('NEXT_NOT_FOUND');
}

import { expect } from 'vitest';
