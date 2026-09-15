import 'server-only';
import { cookies } from 'next/headers';

export type FlashType = 'success' | 'error';
export type Flash = { type: FlashType; message: string };

const COOKIE = 'flash';

/** One-shot message set by a Server Action right before `redirect()`. */
export async function setFlash(type: FlashType, message: string): Promise<void> {
  const store = await cookies();
  store.set(COOKIE, JSON.stringify({ type, message } satisfies Flash), {
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 60,
  });
}

/**
 * Reads the flash for the current render. The cookie is cleared by the client
 * component (`<FlashToaster />`) through `clearFlashAction`, because Server
 * Components cannot mutate cookies.
 */
export async function readFlash(): Promise<Flash | null> {
  const store = await cookies();
  const raw = store.get(COOKIE)?.value;
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Flash;
    return parsed.type && parsed.message ? parsed : null;
  } catch {
    return null;
  }
}

export async function clearFlash(): Promise<void> {
  const store = await cookies();
  store.delete(COOKIE);
}
