'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { useClipboard } from '@/hooks/use-clipboard';
import { revealAccountCredentialsAction } from '@/app/[companyId]/accounts/actions';

export type AccountCredentialsView = { email: string; password: string };

/** Text ready to send to the customer. */
export function formatCredentials(credentials: AccountCredentialsView): string {
  return `Email: ${credentials.email}\nContraseña: ${credentials.password}`;
}

/** Loads decrypted credentials through the server action (audited server-side) and copies them. */
export function useAccountCredentials(companyId: string, accountId: string) {
  const [loading, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [credentials, setCredentials] = useState<AccountCredentialsView | null>(null);
  const [copied, setCopied] = useState(false);
  const [, copy] = useClipboard();
  const copiedTimer = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(copiedTimer.current), []);

  const load = (onLoaded?: () => void) =>
    startTransition(async () => {
      setError(null);
      const result = await revealAccountCredentialsAction(companyId, accountId);
      if (result.status === 'ok') {
        setCredentials({ email: result.email, password: result.password });
        onLoaded?.();
      } else {
        setError(result.message ?? 'No se pudieron obtener las credenciales.');
      }
    });

  const copyCredentials = async () => {
    if (!credentials) return;
    if (await copy(formatCredentials(credentials))) {
      setCopied(true);
      window.clearTimeout(copiedTimer.current);
      copiedTimer.current = window.setTimeout(() => setCopied(false), 2000);
    }
  };

  return { loading, error, credentials, load, copied, copyCredentials };
}
