'use client';

import { createContext, useContext, type ReactNode } from 'react';
import type { ManualTransactionFormState } from '../hooks/useManualTransactionForm';

const ManualTransactionFormContext = createContext<ManualTransactionFormState | null>(null);

export function ManualTransactionFormProvider({
  value,
  children,
}: {
  value: ManualTransactionFormState;
  children: ReactNode;
}) {
  return <ManualTransactionFormContext.Provider value={value}>{children}</ManualTransactionFormContext.Provider>;
}

export function useManualTransactionFormContext(): ManualTransactionFormState {
  const context = useContext(ManualTransactionFormContext);
  if (!context) throw new Error('useManualTransactionFormContext must be used within ManualTransactionFormProvider');
  return context;
}
