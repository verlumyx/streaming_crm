'use client';

import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { claimRoutes } from '@/modules/claim/routes';
import type { ClaimClientOptionDto } from '@/modules/claim/serializers/claim.serializer';
import { ClaimFormProvider } from '../contexts/ClaimFormContext';
import { useClaimForm } from '../hooks/useClaimForm';
import { ClaimForm } from './ClaimForm';

type Props = {
  companyId: string;
  initialId: string;
  clients: ClaimClientOptionDto[];
  preselectedClientId: string | null;
};

/** Crear: instancia el hook del formulario y lo expone por contexto. */
export function ClaimCreate({ companyId, initialId, clients, preselectedClientId }: Props) {
  const router = useRouter();
  const form = useClaimForm({ mode: 'create', companyId, initialId, clients, preselectedClientId });

  return (
    <Card className="rounded-2xl p-6">
      <ClaimFormProvider value={form}>
        <ClaimForm onCancel={() => router.push(claimRoutes.index(companyId))} />
      </ClaimFormProvider>
    </Card>
  );
}
