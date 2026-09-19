'use client';

import { createContext, useContext, type ReactNode } from 'react';
import type { ClaimFormState } from '../hooks/useClaimForm';

const ClaimFormContext = createContext<ClaimFormState | null>(null);

export function ClaimFormProvider({ value, children }: { value: ClaimFormState; children: ReactNode }) {
  return <ClaimFormContext.Provider value={value}>{children}</ClaimFormContext.Provider>;
}

export function useClaimFormContext(): ClaimFormState {
  const context = useContext(ClaimFormContext);
  if (!context) throw new Error('useClaimFormContext must be used within ClaimFormProvider');
  return context;
}
