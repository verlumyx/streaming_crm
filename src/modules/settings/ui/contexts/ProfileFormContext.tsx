'use client';

import { createContext, useContext, type ReactNode } from 'react';
import type { useProfileForm } from '../hooks/useProfileForm';

type ProfileFormContextType = ReturnType<typeof useProfileForm>;

const ProfileFormContext = createContext<ProfileFormContextType | null>(null);

export function ProfileFormProvider({ value, children }: { value: ProfileFormContextType; children: ReactNode }) {
  return <ProfileFormContext.Provider value={value}>{children}</ProfileFormContext.Provider>;
}

export function useProfileFormContext(): ProfileFormContextType {
  const context = useContext(ProfileFormContext);
  if (!context) throw new Error('useProfileFormContext must be used within ProfileFormProvider');
  return context;
}
