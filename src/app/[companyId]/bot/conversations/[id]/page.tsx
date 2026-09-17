import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { db } from '@/db/client';
import { guardPage, hasPermission } from '@/modules/shared/auth/require-permission';
import { isUuid } from '@/modules/shared/uuid';
import { BOT_PERMISSIONS } from '@/modules/bot/permissions';
import { createConversationContainer } from '@/modules/conversation/container';
import { toBotMessageDto, toConversationDto } from '@/modules/conversation/serializers/conversation.serializer';
import { ConversationNotFoundException } from '@/modules/conversation/exceptions/conversation-not-found.exception';
import { ConversationThread } from '@/modules/conversation/ui/components/ConversationThread';

export const metadata: Metadata = { title: 'Conversación' };

type Props = { params: Promise<{ companyId: string; id: string }> };

/** Ver. */
export default async function ConversationShowPage({ params }: Props) {
  const { companyId, id } = await params;
  await guardPage(companyId, BOT_PERMISSIONS.CONVERSATIONS);
  if (!isUuid(id)) notFound();

  let found;
  try {
    found = await createConversationContainer(db).findService.execute(id, companyId);
  } catch (error) {
    if (error instanceof ConversationNotFoundException) notFound();
    throw error;
  }

  const canHandoff = await hasPermission(companyId, BOT_PERMISSIONS.HANDOFF);

  return (
    <ConversationThread
      companyId={companyId}
      conversation={toConversationDto(found.conversation)}
      messages={found.messages.map(toBotMessageDto)}
      canHandoff={canHandoff}
    />
  );
}
