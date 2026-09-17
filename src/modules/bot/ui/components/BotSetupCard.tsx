'use client';

import { useActionState, useEffect } from 'react';
import { Bot } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { initialActionState } from '@/modules/shared/actions/action-state';
import { setupBotAction } from '@/app/[companyId]/bot/actions';

/** Shown until the company has a settings row: preparing the bot is a mutation, never a page load. */
export function BotSetupCard({ companyId }: { companyId: string }) {
  const [state, formAction, pending] = useActionState(setupBotAction.bind(null, companyId), initialActionState);

  useEffect(() => {
    if (state.status === 'error' && state.message) toast.error(state.message);
  }, [state]);

  return (
    <Card className="mx-auto flex max-w-xl flex-col items-center gap-4 rounded-2xl p-8 text-center">
      <span className="bg-primary-soft text-primary grid size-12 place-items-center rounded-xl">
        <Bot className="size-6" />
      </span>
      <div>
        <h2 className="text-lg font-bold tracking-tight">Prepara el asistente</h2>
        <p className="text-muted-foreground mt-1 text-sm">
          Se creará el vendedor <strong>Asistente IA</strong> con permisos mínimos —registrar clientes y ventas por
          aprobar— para que sus ventas queden atribuidas y auditables. No responderá a nadie hasta que lo actives.
        </p>
      </div>
      <form action={formAction}>
        <Button type="submit" disabled={pending} className="h-[42px] rounded-[10px]">
          {pending ? 'Preparando…' : 'Preparar asistente'}
        </Button>
      </form>
    </Card>
  );
}
