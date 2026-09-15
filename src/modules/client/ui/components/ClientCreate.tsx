'use client';

import { ClientFormProvider } from '../contexts/ClientFormContext';
import { useClientForm } from '../hooks/useClientForm';
import { ClientForm } from './ClientForm';

/** Crear: instantiates the form hook and exposes it through the context. */
export function ClientCreate({ companyId, initialId }: { companyId: string; initialId: string }) {
  const form = useClientForm({ mode: 'create', companyId, initialId });

  return (
    <ClientFormProvider value={form}>
      <ClientForm />
    </ClientFormProvider>
  );
}
