'use client';

import type { ServiceOptionDto } from '@/modules/service/serializers/service.serializer';
import { PlanFormProvider } from '../contexts/PlanFormContext';
import { usePlanForm } from '../hooks/usePlanForm';
import { PlanForm } from './PlanForm';

type Props = { companyId: string; initialId: string; services: ServiceOptionDto[] };

/** Crear: instantiates the form hook and exposes it through the context. */
export function PlanCreate({ companyId, initialId, services }: Props) {
  const form = usePlanForm({ mode: 'create', companyId, initialId, services });

  return (
    <PlanFormProvider value={form}>
      <PlanForm />
    </PlanFormProvider>
  );
}
