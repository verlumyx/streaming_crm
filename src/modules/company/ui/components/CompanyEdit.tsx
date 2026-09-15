'use client';

import type { CompanyDto } from '@/modules/company/serializers/company.serializer';
import { CompanyFormProvider } from '../contexts/CompanyFormContext';
import { useCompanyForm } from '../hooks/useCompanyForm';
import { CompanyForm } from './CompanyForm';

/** Editar: same form bound to `updateCompanyAction`. */
export function CompanyEdit({ companyId, company }: { companyId: string; company: CompanyDto }) {
  const form = useCompanyForm({ mode: 'edit', companyId, company });

  return (
    <CompanyFormProvider value={form}>
      <CompanyForm />
    </CompanyFormProvider>
  );
}
