import Link from 'next/link';
import type { ReactNode } from 'react';
import { ArrowLeft } from 'lucide-react';

/** "← Clientes" link shown above page titles. */
export function BackLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      className="text-muted-foreground hover:text-primary inline-flex w-max items-center gap-1.5 text-sm font-semibold transition-colors"
    >
      <ArrowLeft className="size-4" />
      {children}
    </Link>
  );
}
