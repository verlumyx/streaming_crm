'use client';

import type { ServiceDto } from '@/modules/service/serializers/service.serializer';
import { ServiceFormProvider } from '../contexts/ServiceFormContext';
import { useServiceForm } from '../hooks/useServiceForm';
import { ServiceForm } from './ServiceForm';

/** Editar: same form bound to `updateServiceAction`. */
export function ServiceEdit({ companyId, service }: { companyId: string; service: ServiceDto }) {
  const form = useServiceForm({ mode: 'edit', companyId, service });

  return (
    <ServiceFormProvider value={form}>
      <ServiceForm />
    </ServiceFormProvider>
  );
}
