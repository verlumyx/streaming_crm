'use client';

import { useActionState, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { initialActionState } from '@/modules/shared/actions/action-state';
import {
  createKnowledgeDocumentAction,
  updateKnowledgeDocumentAction,
} from '@/app/[companyId]/bot/knowledge/actions';
import type { KnowledgeDocumentDto } from '@/modules/knowledge/serializers/knowledge.serializer';

export type KnowledgeFormData = { id: string; title: string; content: string };

type Options =
  | { mode: 'create'; companyId: string; initialId: string; document?: undefined }
  | { mode: 'edit'; companyId: string; document: KnowledgeDocumentDto; initialId?: undefined };

export function useKnowledgeForm(options: Options) {
  const { mode, companyId, document } = options;

  const [data, setDataState] = useState<KnowledgeFormData>(() => ({
    id: document?.id ?? options.initialId ?? '',
    title: document?.title ?? '',
    content: document?.content ?? '',
  }));

  // companyId / id are bound here — the action never reads them from FormData.
  const action =
    mode === 'create'
      ? createKnowledgeDocumentAction.bind(null, companyId)
      : updateKnowledgeDocumentAction.bind(null, companyId, document.id);

  const [state, formAction, pending] = useActionState(action, initialActionState);

  useEffect(() => {
    if (state.status === 'error' && state.message && !state.fieldErrors) toast.error(state.message);
  }, [state]);

  const setData = <K extends keyof KnowledgeFormData>(key: K, value: KnowledgeFormData[K]) =>
    setDataState((prev) => ({ ...prev, [key]: value }));

  return { mode, data, setData, formAction, pending, errors: state.fieldErrors ?? {} };
}
