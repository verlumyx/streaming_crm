'use client';

import { createContext, useContext, type ReactNode } from 'react';
import type { usePasswordForm } from '../hooks/usePasswordForm';

type PasswordFormContextType = ReturnType<typeof usePasswordForm>;

const PasswordFormContext = createContext<PasswordFormContextType | null>(null);

export function PasswordFormProvider({ value, children }: { value: PasswordFormContextType; children: ReactNode }) {
  return <PasswordFormContext.Provider value={value}>{children}</PasswordFormContext.Provider>;
}

export function usePasswordFormContext(): PasswordFormContextType {
  const context = useContext(PasswordFormContext);
  if (!context) throw new Error('usePasswordFormContext must be used within PasswordFormProvider');
  return context;
}
