'use client';

import { useEffect, useState } from 'react';
import { Check, Contact, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { searchSaleClientsAction } from '@/app/[companyId]/sales/actions';
import type { SaleClientOptionDto } from '@/modules/sale/serializers/sale.serializer';
import { useSaleFormContext } from '../contexts/SaleFormContext';

const SEARCH_DEBOUNCE_MS = 300;

/**
 * Step 1: pick an ACTIVE client. The initial batch comes from the page; typing searches on the server
 * (debounced). The selected client stays pinned on top even when it is not among the results.
 */
export function SaleClientStep() {
  const { companyId, clients, data, selectedClient, selectClient, errors } = useSaleFormContext();

  const [search, setSearch] = useState('');
  const [serverResults, setServerResults] = useState<SaleClientOptionDto[]>([]);
  const [loading, setLoading] = useState(false);
  const term = search.trim();

  useEffect(() => {
    if (term === '') return;
    let cancelled = false;
    const timeout = setTimeout(async () => {
      setLoading(true);
      try {
        const result = await searchSaleClientsAction(companyId, term);
        if (!cancelled) setServerResults(result.clients);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, SEARCH_DEBOUNCE_MS);

    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }, [term, companyId]);

  const results = term === '' ? clients : serverResults;
  const pinned = selectedClient && !results.some((c) => c.id === selectedClient.id) ? selectedClient : null;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="client-search">Buscar cliente</Label>
        <div className="relative">
          <Input
            id="client-search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && e.preventDefault()}
            placeholder="Nombre o código del cliente..."
            autoComplete="off"
          />
          {loading && (
            <Loader2 className="text-muted-foreground absolute top-1/2 right-3 size-4 -translate-y-1/2 animate-spin" />
          )}
        </div>
      </div>

      {errors.clientId && <p className="text-bad text-sm">{errors.clientId[0]}</p>}

      <div className="flex max-h-80 flex-col gap-2 overflow-auto">
        {pinned && <ClientRow client={pinned} selected onClick={() => selectClient(pinned)} />}
        {results.map((client) => (
          <ClientRow
            key={client.id}
            client={client}
            selected={data.clientId === client.id}
            onClick={() => selectClient(client)}
          />
        ))}
        {!loading && results.length === 0 && (
          <p className="text-muted-foreground p-6 text-center text-sm">
            {term === '' ? 'No hay clientes activos.' : 'No hay clientes activos que coincidan.'}
          </p>
        )}
      </div>
    </div>
  );
}

function ClientRow({
  client,
  selected,
  onClick,
}: {
  client: SaleClientOptionDto;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex items-center justify-between gap-3 rounded-[12px] border p-3.5 text-left transition-colors',
        selected ? 'border-primary bg-primary/5' : 'hover:bg-muted',
      )}
    >
      <span className="flex items-center gap-3">
        <span className="bg-muted text-muted-foreground grid size-10 place-items-center rounded-[10px] border">
          <Contact className="size-5" />
        </span>
        <span className="flex flex-col">
          <span className="font-bold">{client.name}</span>
          <span className="text-muted-foreground text-[12.5px]">{client.code}</span>
        </span>
      </span>
      {selected && <Check className="text-primary size-5" />}
    </button>
  );
}
