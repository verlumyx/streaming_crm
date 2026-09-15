'use client';

import { useRouter } from 'next/navigation';
import { Building2, Check, ChevronsUpDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useCompany } from '@/modules/shared/auth/company-context';

export function CompanySwitcher() {
  const router = useRouter();
  const { companyId, companyName, companies } = useCompany();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="max-w-[220px] gap-2">
          <Building2 className="size-4 shrink-0 text-muted-foreground" />
          <span className="truncate">{companyName || 'Sin empresa'}</span>
          <ChevronsUpDown className="size-4 shrink-0 opacity-60" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel>Mis empresas</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {companies.length === 0 ? (
          <DropdownMenuItem disabled>Sin empresas asignadas</DropdownMenuItem>
        ) : (
          companies.map((company) => (
            <DropdownMenuItem
              key={company.id}
              onSelect={() => {
                if (company.id !== companyId) router.push(`/${company.id}/dashboard`);
              }}
            >
              <span className="truncate">{company.name}</span>
              {company.status === 'inactive' && <span className="ml-1 text-xs text-muted-foreground">(inactiva)</span>}
              {company.id === companyId && <Check className="ml-auto size-4" />}
            </DropdownMenuItem>
          ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
