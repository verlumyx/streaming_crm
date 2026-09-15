'use client';

import { Monitor, Moon, Sun, type LucideIcon } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useSyncExternalStore, type HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export type Appearance = 'light' | 'dark' | 'system';

const subscribeNoop = () => () => {};
const getClientSnapshot = () => true;
const getServerSnapshot = () => false;

const TABS: { value: Appearance; icon: LucideIcon; label: string }[] = [
  { value: 'light', icon: Sun, label: 'Claro' },
  { value: 'dark', icon: Moon, label: 'Oscuro' },
  { value: 'system', icon: Monitor, label: 'Sistema' },
];

export function AppearanceTabs({ className = '', ...props }: HTMLAttributes<HTMLDivElement>) {
  const { theme, setTheme } = useTheme();
  // next-themes solo conoce el tema en el cliente; evita desajustes de hidratación.
  const mounted = useSyncExternalStore(subscribeNoop, getClientSnapshot, getServerSnapshot);
  const current: Appearance = mounted ? ((theme as Appearance | undefined) ?? 'system') : 'system';

  return (
    <div
      className={cn('inline-flex gap-1 rounded-lg bg-neutral-100 p-1 dark:bg-neutral-800', className)}
      {...props}
    >
      {TABS.map(({ value, icon: Icon, label }) => (
        <button
          key={value}
          type="button"
          onClick={() => setTheme(value)}
          className={cn(
            'flex items-center rounded-md px-3.5 py-1.5 transition-colors',
            current === value
              ? 'bg-white shadow-xs dark:bg-neutral-700 dark:text-neutral-100'
              : 'text-neutral-500 hover:bg-neutral-200/60 hover:text-black dark:text-neutral-400 dark:hover:bg-neutral-700/60',
          )}
        >
          <Icon className="-ml-1 h-4 w-4" />
          <span className="ml-1.5 text-sm">{label}</span>
        </button>
      ))}
    </div>
  );
}

export default AppearanceTabs;
