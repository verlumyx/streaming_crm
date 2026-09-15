'use client';

import { createContext, useContext, type ReactNode } from 'react';
import type { useUserForm } from '../hooks/useUserForm';

type UserFormContextType = ReturnType<typeof useUserForm>;

const UserFormContext = createContext<UserFormContextType | null>(null);

export function UserFormProvider({ value, children }: { value: UserFormContextType; children: ReactNode }) {
  return <UserFormContext.Provider value={value}>{children}</UserFormContext.Provider>;
}

export function useUserFormContext(): UserFormContextType {
  const context = useContext(UserFormContext);
  if (!context) throw new Error('useUserFormContext must be used within UserFormProvider');
  return context;
}
