'use client';

import { CompanyFormProvider } from '../contexts/CompanyFormContext';
import { useCompanyForm } from '../hooks/useCompanyForm';
import { CompanyForm } from './CompanyForm';

/** Crear: instantiates the form hook and exposes it through the context. */
export function CompanyCreate({ companyId, initialId }: { companyId: string; initialId: string }) {
  const form = useCompanyForm({ mode: 'create', companyId, initialId });

  return (
    <CompanyFormProvider value={form}>
      <CompanyForm />
    </CompanyFormProvider>
  );
}
