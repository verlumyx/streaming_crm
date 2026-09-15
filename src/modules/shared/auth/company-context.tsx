'use client';

import { createContext, useContext, type ReactNode } from 'react';

export type CompanyContextValue = {
  companyId: string;
  companyName: string;
  user: { id: string; name: string; email: string; isSystemOwner: boolean };
  /** Flat permission actions of the current user in this company. */
  permissions: string[];
  /** All companies the user can switch to. */
  companies: { id: string; name: string; status: 'active' | 'inactive' }[];
  defaultCompanyId: string | null;
};

const CompanyContext = createContext<CompanyContextValue | null>(null);

export function CompanyProvider({ value, children }: { value: CompanyContextValue; children: ReactNode }) {
  return <CompanyContext.Provider value={value}>{children}</CompanyContext.Provider>;
}

export function useCompany(): CompanyContextValue {
  const ctx = useContext(CompanyContext);
  if (!ctx) throw new Error('useCompany must be used within CompanyProvider');
  return ctx;
}

/** `can('sales.create')` for client components. Server code uses `hasPermission()` instead. */
export function usePermission() {
  const { permissions, user } = useCompany();
  const can = (action: string) => permissions.includes(action);
  return { can, isSystemOwner: user.isSystemOwner, permissions };
}
