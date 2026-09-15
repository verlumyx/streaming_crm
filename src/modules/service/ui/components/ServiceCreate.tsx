'use client';

import { ServiceFormProvider } from '../contexts/ServiceFormContext';
import { useServiceForm } from '../hooks/useServiceForm';
import { ServiceForm } from './ServiceForm';

/** Crear: instantiates the form hook and exposes it through the context. */
export function ServiceCreate({ companyId, initialId }: { companyId: string; initialId: string }) {
  const form = useServiceForm({ mode: 'create', companyId, initialId });

  return (
    <ServiceFormProvider value={form}>
      <ServiceForm />
    </ServiceFormProvider>
  );
}
