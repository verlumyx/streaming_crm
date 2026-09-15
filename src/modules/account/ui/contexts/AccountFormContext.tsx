'use client';

import { createContext, useContext, type ReactNode } from 'react';
import type { useAccountForm } from '../hooks/useAccountForm';

type AccountFormContextType = ReturnType<typeof useAccountForm>;

const AccountFormContext = createContext<AccountFormContextType | null>(null);

export function AccountFormProvider({ value, children }: { value: AccountFormContextType; children: ReactNode }) {
  return <AccountFormContext.Provider value={value}>{children}</AccountFormContext.Provider>;
}

export function useAccountFormContext(): AccountFormContextType {
  const context = useContext(AccountFormContext);
  if (!context) throw new Error('useAccountFormContext must be used within AccountFormProvider');
  return context;
}
