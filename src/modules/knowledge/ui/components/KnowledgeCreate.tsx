'use client';

import { KnowledgeFormProvider } from '../contexts/KnowledgeFormContext';
import { useKnowledgeForm } from '../hooks/useKnowledgeForm';
import { KnowledgeForm } from './KnowledgeForm';

/** Crear: instantiates the form hook and exposes it through the context. */
export function KnowledgeCreate({ companyId, initialId }: { companyId: string; initialId: string }) {
  const form = useKnowledgeForm({ mode: 'create', companyId, initialId });

  return (
    <KnowledgeFormProvider value={form}>
      <KnowledgeForm />
    </KnowledgeFormProvider>
  );
}
