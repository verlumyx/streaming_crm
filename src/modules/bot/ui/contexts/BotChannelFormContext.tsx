'use client';

import { createContext, useContext, type ReactNode } from 'react';
import type { useBotChannelForm } from '../hooks/useBotChannelForm';

type BotChannelFormContextType = ReturnType<typeof useBotChannelForm>;

const BotChannelFormContext = createContext<BotChannelFormContextType | null>(null);

export function BotChannelFormProvider({ value, children }: { value: BotChannelFormContextType; children: ReactNode }) {
  return <BotChannelFormContext.Provider value={value}>{children}</BotChannelFormContext.Provider>;
}

export function useBotChannelFormContext(): BotChannelFormContextType {
  const context = useContext(BotChannelFormContext);
  if (!context) throw new Error('useBotChannelFormContext must be used within BotChannelFormProvider');
  return context;
}
