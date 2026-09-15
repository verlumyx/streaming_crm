'use client';

import type { ClientDto } from '@/modules/client/serializers/client.serializer';
import { ClientFormProvider } from '../contexts/ClientFormContext';
import { useClientForm } from '../hooks/useClientForm';
import { ClientForm } from './ClientForm';

/** Editar: same form bound to `updateClientAction`. */
export function ClientEdit({ companyId, client }: { companyId: string; client: ClientDto }) {
  const form = useClientForm({ mode: 'edit', companyId, client });

  return (
    <ClientFormProvider value={form}>
      <ClientForm />
    </ClientFormProvider>
  );
}
