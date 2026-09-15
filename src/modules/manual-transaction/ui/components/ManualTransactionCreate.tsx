'use client';

import { Card } from '@/components/ui/card';
import { ManualTransactionFormProvider } from '../contexts/ManualTransactionFormContext';
import { useManualTransactionForm } from '../hooks/useManualTransactionForm';
import type { TransactionCatalogDto } from '../types/ManualTransaction';
import { ManualTransactionForm } from './ManualTransactionForm';

type Props = { companyId: string; initialId: string; today: string; catalog: TransactionCatalogDto };

/** Crear: instantiates the form hook and exposes it through the context. */
export function ManualTransactionCreate(props: Props) {
  const form = useManualTransactionForm(props);

  return (
    <Card className="rounded-2xl p-6">
      <ManualTransactionFormProvider value={form}>
        <ManualTransactionForm />
      </ManualTransactionFormProvider>
    </Card>
  );
}
