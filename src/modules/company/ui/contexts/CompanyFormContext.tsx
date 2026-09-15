'use client';

import { createContext, useContext, type ReactNode } from 'react';
import type { useCompanyForm } from '../hooks/useCompanyForm';

type CompanyFormContextType = ReturnType<typeof useCompanyForm>;

const CompanyFormContext = createContext<CompanyFormContextType | null>(null);

export function CompanyFormProvider({
  value,
  children,
}: {
  value: CompanyFormContextType;
  children: ReactNode;
}) {
  return <CompanyFormContext.Provider value={value}>{children}</CompanyFormContext.Provider>;
}

export function useCompanyFormContext(): CompanyFormContextType {
  const context = useContext(CompanyFormContext);
  if (!context) throw new Error('useCompanyFormContext must be used within CompanyFormProvider');
  return context;
}
