'use client';

import { Check, Copy } from 'lucide-react';
import { useClipboard } from '@/hooks/use-clipboard';

type Props = { value: string; label: string; multiline?: boolean };

/** Read-only value with a copy button. */
export function CopyableValue({ value, label, multiline = false }: Props) {
  const [copiedText, copy] = useClipboard();
  const Icon = copiedText === value ? Check : Copy;

  return (
    <div className="border-border flex w-full items-stretch overflow-hidden rounded-xl border">
      {multiline ? (
        <textarea
          readOnly
          value={value}
          aria-label={label}
          rows={3}
          className="bg-background text-foreground w-full resize-none p-3 font-mono text-xs outline-none"
        />
      ) : (
        <input
          type="text"
          readOnly
          value={value}
          aria-label={label}
          className="bg-background text-foreground h-full w-full p-3 font-mono text-sm outline-none"
        />
      )}
      <button
        type="button"
        onClick={() => copy(value)}
        className="border-border hover:bg-muted border-l px-3"
        aria-label={`Copiar ${label.toLowerCase()}`}
      >
        <Icon className="w-4" />
      </button>
    </div>
  );
}
