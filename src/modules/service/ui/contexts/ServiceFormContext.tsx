'use client';

import { createContext, useContext, type ReactNode } from 'react';
import type { useServiceForm } from '../hooks/useServiceForm';

type ServiceFormContextType = ReturnType<typeof useServiceForm>;

const ServiceFormContext = createContext<ServiceFormContextType | null>(null);

export function ServiceFormProvider({ value, children }: { value: ServiceFormContextType; children: ReactNode }) {
  return <ServiceFormContext.Provider value={value}>{children}</ServiceFormContext.Provider>;
}

export function useServiceFormContext(): ServiceFormContextType {
  const context = useContext(ServiceFormContext);
  if (!context) throw new Error('useServiceFormContext must be used within ServiceFormProvider');
  return context;
}
