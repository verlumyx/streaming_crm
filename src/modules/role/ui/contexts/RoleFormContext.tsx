'use client';

import { createContext, useContext, type ReactNode } from 'react';
import type { useRoleForm } from '../hooks/useRoleForm';

type RoleFormContextType = ReturnType<typeof useRoleForm>;

const RoleFormContext = createContext<RoleFormContextType | null>(null);

export function RoleFormProvider({ value, children }: { value: RoleFormContextType; children: ReactNode }) {
  return <RoleFormContext.Provider value={value}>{children}</RoleFormContext.Provider>;
}

export function useRoleFormContext(): RoleFormContextType {
  const context = useContext(RoleFormContext);
  if (!context) throw new Error('useRoleFormContext must be used within RoleFormProvider');
  return context;
}
