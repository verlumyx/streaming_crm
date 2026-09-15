'use client';

import { createContext, useContext, type ReactNode } from 'react';
import type { SaleFormState } from '../hooks/useSaleForm';

const SaleFormContext = createContext<SaleFormState | null>(null);

export function SaleFormProvider({ value, children }: { value: SaleFormState; children: ReactNode }) {
  return <SaleFormContext.Provider value={value}>{children}</SaleFormContext.Provider>;
}

/** Wizard state for the step components (they never receive props). */
export function useSaleFormContext(): SaleFormState {
  const context = useContext(SaleFormContext);
  if (!context) throw new Error('useSaleFormContext must be used within SaleFormProvider');
  return context;
}
