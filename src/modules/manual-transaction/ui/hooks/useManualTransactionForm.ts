'use client';

import { useActionState, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { initialActionState } from '@/modules/shared/actions/action-state';
import { createManualTransactionAction } from '@/app/[companyId]/manual-transactions/actions';
import type { ManualTransactionLineDraft, TransactionCatalogDto } from '../types/ManualTransaction';

export type ManualTransactionFormData = {
  id: string;
  date: string;
  paymentMethod: string;
  currency: string;
  reference: string;
  description: string;
  notes: string;
  lines: ManualTransactionLineDraft[];
};

const emptyLine = (): ManualTransactionLineDraft => ({ category: '', amount: 0, description: '' });

type Options = { companyId: string; initialId: string; today: string; catalog: TransactionCatalogDto };

/** Header + lines form. The income/expense type of each line is derived on the server from its category. */
export function useManualTransactionForm({ companyId, initialId, today, catalog }: Options) {
  const [data, setDataState] = useState<ManualTransactionFormData>({
    id: initialId,
    date: today,
    paymentMethod: 'cash',
    currency: 'USD',
    reference: '',
    description: '',
    notes: '',
    lines: [emptyLine()],
  });

  const [state, formAction, pending] = useActionState(
    createManualTransactionAction.bind(null, companyId),
    initialActionState,
  );

  useEffect(() => {
    if (state.status === 'error' && state.message && !state.fieldErrors) toast.error(state.message);
  }, [state]);

  const setData = <K extends keyof ManualTransactionFormData>(key: K, value: ManualTransactionFormData[K]) =>
    setDataState((prev) => ({ ...prev, [key]: value }));

  const total = useMemo(() => data.lines.reduce((sum, l) => sum + (Number(l.amount) || 0), 0), [data.lines]);

  const addLine = () => setDataState((prev) => ({ ...prev, lines: [...prev.lines, emptyLine()] }));

  const removeLine = (index: number) =>
    setDataState((prev) =>
      prev.lines.length <= 1 ? prev : { ...prev, lines: prev.lines.filter((_, i) => i !== index) },
    );

  const updateLine = (index: number, patch: Partial<ManualTransactionLineDraft>) =>
    setDataState((prev) => ({
      ...prev,
      lines: prev.lines.map((line, i) => (i === index ? { ...line, ...patch } : line)),
    }));

  return {
    companyId,
    catalog,
    data,
    setData,
    total,
    addLine,
    removeLine,
    updateLine,
    formAction,
    pending,
    errors: state.fieldErrors ?? {},
  };
}

export type ManualTransactionFormState = ReturnType<typeof useManualTransactionForm>;
