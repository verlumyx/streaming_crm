'use client';

import type { PlanDto } from '@/modules/plan/serializers/plan.serializer';
import type { ServiceOptionDto } from '@/modules/service/serializers/service.serializer';
import { PlanFormProvider } from '../contexts/PlanFormContext';
import { usePlanForm } from '../hooks/usePlanForm';
import { PlanForm } from './PlanForm';

type Props = { companyId: string; plan: PlanDto; services: ServiceOptionDto[] };

/** Editar: same form bound to `updatePlanAction`. */
export function PlanEdit({ companyId, plan, services }: Props) {
  const form = usePlanForm({ mode: 'edit', companyId, plan, services });

  return (
    <PlanFormProvider value={form}>
      <PlanForm />
    </PlanFormProvider>
  );
}
