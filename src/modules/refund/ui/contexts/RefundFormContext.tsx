'use client';

import { createContext, useContext, type ReactNode } from 'react';
import type { RefundFormState } from '../hooks/useRefundForm';

const RefundFormContext = createContext<RefundFormState | null>(null);

export function RefundFormProvider({ value, children }: { value: RefundFormState; children: ReactNode }) {
  return <RefundFormContext.Provider value={value}>{children}</RefundFormContext.Provider>;
}

export function useRefundFormContext(): RefundFormState {
  const context = useContext(RefundFormContext);
  if (!context) throw new Error('useRefundFormContext must be used within RefundFormProvider');
  return context;
}
