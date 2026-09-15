'use client';

import { useEffect } from 'react';
import { toast } from 'sonner';
import { AlertTriangle, ArrowLeft, ArrowRight, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { useSaleFormContext } from '../contexts/SaleFormContext';
import { SaleClientStep } from './SaleClientStep';
import { SalePlanStep } from './SalePlanStep';
import { SaleProfilesStep } from './SaleProfilesStep';

const STEPS = [
  { number: 1, title: 'Cliente' },
  { number: 2, title: 'Plan' },
  { number: 3, title: 'Perfiles' },
];

/** Wizard shell: step indicator, current step, navigation and the hidden fields posted to `createSaleAction`. */
export function SaleWizard() {
  const { data, step, setStep, canContinue, formAction, pending, state, notifyConflict } = useSaleFormContext();

  useEffect(() => {
    if (state.status === 'conflict') notifyConflict();
    else if (state.status === 'error' && state.message && !state.fieldErrors) toast.error(state.message);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return (
    <form
      action={formAction}
      className="flex flex-col gap-5"
      onSubmit={(e) => {
        if (step !== 3 || !canContinue) e.preventDefault();
      }}
    >
      <input type="hidden" name="id" value={data.id} />
      <input type="hidden" name="clientId" value={data.clientId} />
      <input type="hidden" name="planId" value={data.planId} />
      <input type="hidden" name="startDate" value={data.startDate} />
      <input type="hidden" name="notes" value={data.notes} />
      {data.profileIds.map((profileId) => (
        <input key={profileId} type="hidden" name="profileIds" value={profileId} />
      ))}

      <div className="flex items-center gap-2">
        {STEPS.map((s, index) => (
          <div key={s.number} className="flex flex-1 items-center">
            <div className="flex items-center gap-2.5">
              <span
                className={cn(
                  'grid size-9 place-items-center rounded-full text-sm font-bold transition-colors',
                  step >= s.number ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground',
                )}
              >
                {step > s.number ? <Check className="size-4" /> : s.number}
              </span>
              <span className={cn('text-sm font-semibold', step < s.number && 'text-muted-foreground')}>{s.title}</span>
            </div>
            {index < STEPS.length - 1 && (
              <div className={cn('mx-3 h-0.5 flex-1', step > s.number ? 'bg-primary' : 'bg-border')} />
            )}
          </div>
        ))}
      </div>

      {state.status === 'error' && state.message && state.fieldErrors && (
        <div className="border-bad/40 bg-bad-soft text-bad flex items-start gap-2 rounded-[10px] border p-3 text-sm">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" />
          <span>{Object.values(state.fieldErrors).flat()[0] ?? state.message}</span>
        </div>
      )}

      <Card className="rounded-2xl p-6">
        {step === 1 && <SaleClientStep />}
        {step === 2 && <SalePlanStep />}
        {step === 3 && <SaleProfilesStep />}
      </Card>

      <div className="flex justify-between">
        <Button
          type="button"
          variant="outline"
          className="bg-card rounded-[11px] font-semibold"
          onClick={() => setStep(step - 1)}
          disabled={step === 1 || pending}
        >
          <ArrowLeft />
          Atrás
        </Button>
        {step < 3 ? (
          <Button
            type="button"
            className="rounded-[11px] font-semibold"
            onClick={() => setStep(step + 1)}
            disabled={!canContinue}
          >
            Continuar
            <ArrowRight />
          </Button>
        ) : (
          <Button type="submit" className="rounded-[11px] font-semibold" disabled={!canContinue || pending}>
            <Check />
            {pending ? 'Registrando…' : 'Registrar venta'}
          </Button>
        )}
      </div>
    </form>
  );
}
