'use client';

import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { claimRoutes } from '@/modules/claim/routes';
import type { ClaimClientOptionDto, ClaimDto } from '@/modules/claim/serializers/claim.serializer';
import { ClaimFormProvider } from '../contexts/ClaimFormContext';
import { useClaimForm } from '../hooks/useClaimForm';
import { ClaimForm } from './ClaimForm';

type Props = { companyId: string; claim: ClaimDto; clients: ClaimClientOptionDto[] };

/** Editar: el mismo formulario enlazado a `updateClaimAction`. */
export function ClaimEdit({ companyId, claim, clients }: Props) {
  const router = useRouter();
  const form = useClaimForm({ mode: 'edit', companyId, claim, clients });

  return (
    <Card className="rounded-2xl p-6">
      <ClaimFormProvider value={form}>
        <ClaimForm onCancel={() => router.push(claimRoutes.show(companyId, claim.id))} />
      </ClaimFormProvider>
    </Card>
  );
}
