'use client';

import { LeadFormProvider } from '../contexts/LeadFormContext';
import { useLeadForm } from '../hooks/useLeadForm';
import { LeadForm } from './LeadForm';

/** Crear: instantiates the form hook and exposes it through the context. */
export function LeadCreate() {
  const form = useLeadForm();

  return (
    <LeadFormProvider value={form}>
      <LeadForm />
    </LeadFormProvider>
  );
}
