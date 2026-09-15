'use client';

import { createContext, useContext, type ReactNode } from 'react';
import type { useClientForm } from '../hooks/useClientForm';

type ClientFormContextType = ReturnType<typeof useClientForm>;

const ClientFormContext = createContext<ClientFormContextType | null>(null);

export function ClientFormProvider({ value, children }: { value: ClientFormContextType; children: ReactNode }) {
  return <ClientFormContext.Provider value={value}>{children}</ClientFormContext.Provider>;
}

export function useClientFormContext(): ClientFormContextType {
  const context = useContext(ClientFormContext);
  if (!context) throw new Error('useClientFormContext must be used within ClientFormProvider');
  return context;
}
