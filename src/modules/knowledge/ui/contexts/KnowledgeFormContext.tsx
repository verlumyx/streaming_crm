'use client';

import { createContext, useContext, type ReactNode } from 'react';
import type { useKnowledgeForm } from '../hooks/useKnowledgeForm';

type KnowledgeFormContextType = ReturnType<typeof useKnowledgeForm>;

const KnowledgeFormContext = createContext<KnowledgeFormContextType | null>(null);

export function KnowledgeFormProvider({ value, children }: { value: KnowledgeFormContextType; children: ReactNode }) {
  return <KnowledgeFormContext.Provider value={value}>{children}</KnowledgeFormContext.Provider>;
}

export function useKnowledgeFormContext(): KnowledgeFormContextType {
  const context = useContext(KnowledgeFormContext);
  if (!context) throw new Error('useKnowledgeFormContext must be used within KnowledgeFormProvider');
  return context;
}
