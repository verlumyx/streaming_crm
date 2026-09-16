'use client';

import { useMemo } from 'react';
import { AlertTriangle, Check, KeyRound } from 'lucide-react';
import { money } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { SaleAvailableProfileDto } from '@/modules/sale/serializers/sale.serializer';
import { useSaleFormContext } from '../contexts/SaleFormContext';

/**
 * Step 3: available profiles of the plan's service, grouped by account. `profile` plans take one or more
 * (one sale per profile); `full_account` plans take every profile of one account. After a conflict the
 * taken profiles are listed.
 */
export function SaleProfilesStep() {
  const {
    data,
    selectedPlan,
    requiredCount,
    sellsOneSalePerProfile,
    saleCount,
    serviceProfiles,
    toggleProfile,
    unavailable,
    errors,
  } = useSaleFormContext();

  const accounts = useMemo(() => {
    const byAccount = new Map<string, { email: string; profiles: SaleAvailableProfileDto[] }>();
    for (const profile of serviceProfiles) {
      const entry = byAccount.get(profile.accountId) ?? { email: profile.accountEmail, profiles: [] };
      entry.profiles.push(profile);
      byAccount.set(profile.accountId, entry);
    }
    return [...byAccount.entries()];
  }, [serviceProfiles]);

  if (!selectedPlan) {
    return <p className="text-muted-foreground p-6 text-center text-sm">Selecciona un plan en el paso anterior.</p>;
  }

  return (
    <div className="flex flex-col gap-4">
      {sellsOneSalePerProfile ? (
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium">Selecciona uno o más perfiles.</p>
            <p className="text-muted-foreground text-[12.5px]">Se registrará una venta por cada perfil.</p>
          </div>
          <span className="text-muted-foreground text-right text-[12.5px] font-semibold tabular-nums">
            {saleCount} venta{saleCount !== 1 ? 's' : ''} · {money(saleCount * selectedPlan.salePrice)}
          </span>
        </div>
      ) : (
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium">
            Selecciona {requiredCount} perfil{requiredCount !== 1 ? 'es' : ''} de una misma cuenta.
          </p>
          <span className="text-muted-foreground text-[12.5px] font-semibold tabular-nums">
            {data.profileIds.length}/{requiredCount}
          </span>
        </div>
      )}

      {unavailable.length > 0 && (
        <div className="border-bad/40 bg-bad-soft text-bad flex items-start gap-2 rounded-[10px] border p-3 text-sm">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" />
          <span>
            Ya no están disponibles: {unavailable.map((p) => p.label).join(', ')}. Elige otros perfiles.
          </span>
        </div>
      )}

      {errors.profileIds && <p className="text-bad text-sm">{errors.profileIds[0]}</p>}

      <div className="flex flex-col gap-4">
        {accounts.map(([accountId, account]) => (
          <div key={accountId} className="overflow-hidden rounded-[12px] border">
            <div className="bg-muted flex items-center gap-2 border-b px-4 py-2.5 text-[13px] font-bold">
              <KeyRound className="text-muted-foreground size-3.5" />
              {account.email}
            </div>
            <div className="grid grid-cols-2 gap-2 p-3 sm:grid-cols-4">
              {account.profiles.map((profile) => {
                const selected = data.profileIds.includes(profile.id);
                return (
                  <button
                    key={profile.id}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => toggleProfile(profile.id)}
                    className={cn(
                      'flex items-center justify-between gap-2 rounded-[10px] border px-3 py-2.5 text-left text-sm transition-colors',
                      selected ? 'border-primary bg-primary/5 font-semibold' : 'hover:bg-muted',
                    )}
                  >
                    Perfil {profile.number}
                    {selected && <Check className="text-primary size-4" />}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
        {accounts.length === 0 && (
          <p className="text-muted-foreground p-6 text-center text-sm">No hay perfiles disponibles para este servicio.</p>
        )}
      </div>
    </div>
  );
}
