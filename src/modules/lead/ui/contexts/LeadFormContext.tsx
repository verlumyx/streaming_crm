'use client';

import { createContext, useContext, type ReactNode } from 'react';
import type { useLeadForm } from '../hooks/useLeadForm';

type LeadFormContextType = ReturnType<typeof useLeadForm>;

const LeadFormContext = createContext<LeadFormContextType | null>(null);

export function LeadFormProvider({ value, children }: { value: LeadFormContextType; children: ReactNode }) {
  return <LeadFormContext.Provider value={value}>{children}</LeadFormContext.Provider>;
}

export function useLeadFormContext(): LeadFormContextType {
  const context = useContext(LeadFormContext);
  if (!context) throw new Error('useLeadFormContext must be used within LeadFormProvider');
  return context;
}
