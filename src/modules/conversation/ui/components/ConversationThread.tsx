'use client';

import { useActionState, useEffect, useTransition } from 'react';
import { toast } from 'sonner';
import { Ban, Bot, Send, UserCheck, X } from 'lucide-react';
import { PageShell } from '@/components/page-shell';
import { BackLink } from '@/components/back-link';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { cn } from '@/lib/utils';
import { initialActionState, type ActionState } from '@/modules/shared/actions/action-state';
import { botRoutes } from '@/modules/bot/routes';
import {
  blockContactAction,
  closeConversationAction,
  returnConversationToBotAction,
  sendAgentMessageAction,
  takeOverConversationAction,
} from '@/app/[companyId]/bot/conversations/actions';
import type { BotMessageDto, ConversationDto } from '@/modules/conversation/serializers/conversation.serializer';

const ROLE_STYLE: Record<BotMessageDto['role'], string> = {
  user: 'bg-muted mr-auto',
  assistant: 'bg-primary-soft ml-auto',
  agent: 'bg-info-soft ml-auto',
  tool: 'bg-card border text-muted-foreground mx-auto text-[12.5px]',
};

const ROLE_LABEL: Record<BotMessageDto['role'], string> = {
  user: 'Cliente',
  assistant: 'Asistente',
  agent: 'Agente',
  tool: 'Herramienta',
};

function Message({ message }: { message: BotMessageDto }) {
  return (
    <div className={cn('flex max-w-[80%] flex-col gap-1 rounded-2xl px-4 py-2.5', ROLE_STYLE[message.role])}>
      <span className="text-[11.5px] font-bold tracking-wider uppercase opacity-70">
        {message.role === 'tool' ? `${ROLE_LABEL.tool}: ${message.toolName}` : ROLE_LABEL[message.role]}
      </span>
      <p className="text-[13.5px] whitespace-pre-wrap">{message.content}</p>
      <span className="text-[11.5px] opacity-60">
        {new Date(message.createdAt).toLocaleString('es')}
        {message.status === 'failed' && ` · no entregado: ${message.error ?? 'error'}`}
      </span>
    </div>
  );
}

type Props = {
  companyId: string;
  conversation: ConversationDto;
  messages: BotMessageDto[];
  canHandoff: boolean;
};

export function ConversationThread({ companyId, conversation, messages, canHandoff }: Props) {
  const [pending, startTransition] = useTransition();
  const [state, formAction, sending] = useActionState(
    sendAgentMessageAction.bind(null, companyId, conversation.id),
    initialActionState,
  );

  useEffect(() => {
    if (state.status === 'error' && state.message) toast.error(state.message);
  }, [state]);

  const run = (action: () => Promise<ActionState | undefined>) =>
    startTransition(async () => {
      const result = await action();
      if (result?.status === 'error') toast.error(result.message ?? 'No se pudo completar la acción.');
    });

  const humanInControl = conversation.handledBy === 'human';

  return (
    <PageShell
      back={<BackLink href={botRoutes.conversations(companyId)}>Conversaciones</BackLink>}
      title={conversation.contact.displayName ?? conversation.contact.externalId}
      subtitle={`${conversation.code} · ${conversation.contact.phoneE164 ?? conversation.contact.externalId} · ${conversation.messageCount} mensajes`}
      actions={
        canHandoff && (
          <>
            {humanInControl ? (
              <Button
                variant="outline"
                className="h-[42px] rounded-[10px]"
                disabled={pending}
                onClick={() => run(() => returnConversationToBotAction(companyId, conversation.id))}
              >
                <Bot className="size-4" />
                Devolver al asistente
              </Button>
            ) : (
              <Button
                className="h-[42px] rounded-[10px]"
                disabled={pending}
                onClick={() => run(() => takeOverConversationAction(companyId, conversation.id))}
              >
                <UserCheck className="size-4" />
                Tomar el control
              </Button>
            )}
            {conversation.contact.status === 'active' && (
              <Button
                variant="outline"
                className="h-[42px] rounded-[10px]"
                disabled={pending}
                onClick={() => run(() => blockContactAction(companyId, conversation.id))}
              >
                <Ban className="size-4" />
                Bloquear
              </Button>
            )}
            {conversation.status === 'open' && (
              <Button
                variant="outline"
                className="h-[42px] rounded-[10px]"
                disabled={pending}
                onClick={() => run(() => closeConversationAction(companyId, conversation.id))}
              >
                <X className="size-4" />
                Cerrar
              </Button>
            )}
          </>
        )
      }
    >
      {humanInControl && (
        <Alert>
          <AlertTitle>El asistente está en silencio</AlertTitle>
          <AlertDescription>
            {conversation.handoffReason ?? 'Un agente tomó el control.'}
            {conversation.handoffExpiresAt &&
              ` Volverá a atender automáticamente el ${new Date(conversation.handoffExpiresAt).toLocaleString('es')}.`}
          </AlertDescription>
        </Alert>
      )}

      {conversation.contact.status === 'blocked' && (
        <Alert variant="destructive">
          <AlertTitle>Contacto bloqueado</AlertTitle>
          <AlertDescription>Sus mensajes se guardan pero nadie responde automáticamente.</AlertDescription>
        </Alert>
      )}

      {conversation.outsideServiceWindow && (
        <Alert variant="destructive">
          <AlertTitle>Fuera de la ventana de 24 horas</AlertTitle>
          <AlertDescription>
            WhatsApp solo permite texto libre dentro de las 24 horas siguientes al último mensaje del cliente. Ahora
            mismo un envío será rechazado por Meta.
          </AlertDescription>
        </Alert>
      )}

      <Card className="flex max-h-[60vh] flex-col gap-3 overflow-y-auto rounded-2xl p-5">
        {messages.map((message) => (
          <Message key={message.id} message={message} />
        ))}
        {messages.length === 0 && <p className="text-muted-foreground p-8 text-center text-sm">Sin mensajes todavía.</p>}
      </Card>

      {canHandoff && (
        <form action={formAction} className="flex flex-col gap-3">
          <Textarea
            id="content"
            name="content"
            rows={3}
            maxLength={4000}
            placeholder={
              humanInControl
                ? 'Escribe tu respuesta…'
                : 'Puedes responder directamente; toma el control para que el asistente no conteste también.'
            }
            className="rounded-[10px]"
          />
          <div className="flex justify-end">
            <Button type="submit" disabled={sending} className="h-[42px] rounded-[10px]">
              <Send className="size-4" />
              {sending ? 'Enviando…' : 'Enviar'}
            </Button>
          </div>
        </form>
      )}
    </PageShell>
  );
}
