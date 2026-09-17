'use client';

import { createContext, useContext, type ReactNode } from 'react';
import type { useBotSettingsForm } from '../hooks/useBotSettingsForm';

type BotSettingsFormContextType = ReturnType<typeof useBotSettingsForm>;

const BotSettingsFormContext = createContext<BotSettingsFormContextType | null>(null);

export function BotSettingsFormProvider({
  value,
  children,
}: {
  value: BotSettingsFormContextType;
  children: ReactNode;
}) {
  return <BotSettingsFormContext.Provider value={value}>{children}</BotSettingsFormContext.Provider>;
}

export function useBotSettingsFormContext(): BotSettingsFormContextType {
  const context = useContext(BotSettingsFormContext);
  if (!context) throw new Error('useBotSettingsFormContext must be used within BotSettingsFormProvider');
  return context;
}
