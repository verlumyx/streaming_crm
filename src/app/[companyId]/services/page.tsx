import type { Metadata } from 'next';
import { db } from '@/db/client';
import { guardPage } from '@/modules/shared/auth/require-permission';
import { SERVICE_PERMISSIONS } from '@/modules/service/permissions';
import { createServiceContainer } from '@/modules/service/container';
import { searchServiceSchema } from '@/modules/service/validation/search-service.schema';
import { SearchServiceCommand } from '@/modules/service/commands/search-service.command';
import { toServiceDto } from '@/modules/service/serializers/service.serializer';
import { ServiceList } from '@/modules/service/ui/components/ServiceList';

export const metadata: Metadata = { title: 'Servicios' };

type Props = {
  params: Promise<{ companyId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

/** Listar. */
export default async function ServicesPage({ params, searchParams }: Props) {
  const { companyId } = await params;
  await guardPage(companyId, SERVICE_PERMISSIONS.LIST);

  const input = searchServiceSchema.parse(await searchParams);
  const command = SearchServiceCommand.fromInput(input, companyId);
  const { data, total } = await createServiceContainer(db).searchService.execute(command);

  return (
    <ServiceList
      companyId={companyId}
      services={data.map(toServiceDto)}
      meta={{
        total,
        limit: command.limit,
        offset: command.offset,
        hasMore: total > command.offset + command.limit,
      }}
      filters={command.filters}
    />
  );
}
