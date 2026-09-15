'use server';

import { clearFlash } from './flash';

export async function clearFlashAction(): Promise<void> {
  await clearFlash();
}
