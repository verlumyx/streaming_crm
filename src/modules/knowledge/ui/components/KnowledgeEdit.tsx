'use client';

import type { KnowledgeDocumentDto } from '@/modules/knowledge/serializers/knowledge.serializer';
import { KnowledgeFormProvider } from '../contexts/KnowledgeFormContext';
import { useKnowledgeForm } from '../hooks/useKnowledgeForm';
import { KnowledgeForm } from './KnowledgeForm';

/** Editar: instantiates the form hook and exposes it through the context. */
export function KnowledgeEdit({ companyId, document }: { companyId: string; document: KnowledgeDocumentDto }) {
  const form = useKnowledgeForm({ mode: 'edit', companyId, document });

  return (
    <KnowledgeFormProvider value={form}>
      <KnowledgeForm />
    </KnowledgeFormProvider>
  );
}
