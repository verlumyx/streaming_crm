'use client';

import { useEffect, useState } from 'react';

/** `true` for `durationMs` after `savedAt` changes (Inertia's `recentlySuccessful`). */
export function useRecentlySuccessful(savedAt: number | null, durationMs = 2000): boolean {
  const [dismissedAt, setDismissedAt] = useState<number | null>(null);

  useEffect(() => {
    if (savedAt === null) return;
    const timer = setTimeout(() => setDismissedAt(savedAt), durationMs);
    return () => clearTimeout(timer);
  }, [savedAt, durationMs]);

  return savedAt !== null && savedAt !== dismissedAt;
}
