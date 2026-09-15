'use client';

import { createContext, useContext, type ReactNode } from 'react';
import type { usePlanForm } from '../hooks/usePlanForm';

type PlanFormContextType = ReturnType<typeof usePlanForm>;

const PlanFormContext = createContext<PlanFormContextType | null>(null);

export function PlanFormProvider({ value, children }: { value: PlanFormContextType; children: ReactNode }) {
  return <PlanFormContext.Provider value={value}>{children}</PlanFormContext.Provider>;
}

export function usePlanFormContext(): PlanFormContextType {
  const context = useContext(PlanFormContext);
  if (!context) throw new Error('usePlanFormContext must be used within PlanFormProvider');
  return context;
}
