import type { Metadata } from 'next';
import { z } from 'zod';
import { db } from '@/db/client';
import { guardPage } from '@/modules/shared/auth/require-permission';
import { limitParam, offsetParam, optionalEnumFilter } from '@/modules/shared/validation/fields';
import { BOT_PERMISSIONS } from '@/modules/bot/permissions';
import { createBotContainer } from '@/modules/bot/container';
import { BOT_EVENT_STATUSES } from '@/modules/bot/models/bot-event.model';
import { toBotEventDto } from '@/modules/bot/serializers/bot-event.serializer';
import { BotEventList } from '@/modules/bot/ui/components/BotEventList';

export const metadata: Metadata = { title: 'Cola del bot' };

/** Listar. Never throws: an unusable query param is ignored, not an error page. */
const searchSchema = z.object({
  status: optionalEnumFilter(BOT_EVENT_STATUSES),
  limit: limitParam(),
  offset: offsetParam(),
});

type Props = {
  params: Promise<{ companyId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function BotEventsPage({ params, searchParams }: Props) {
  const { companyId } = await params;
  await guardPage(companyId, BOT_PERMISSIONS.EVENTS);

  const { status, limit, offset } = searchSchema.parse(await searchParams);
  const container = createBotContainer(db);
  const [{ data, total }, totals] = await Promise.all([
    container.eventRepository.search({ companyId, status, limit, offset }),
    container.eventRepository.countByStatus(companyId),
  ]);

  return (
    <BotEventList
      companyId={companyId}
      events={data.map(toBotEventDto)}
      totals={totals}
      meta={{ total, limit, offset, hasMore: total > offset + limit }}
      status={status}
    />
  );
}
