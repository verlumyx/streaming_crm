import type { Metadata } from 'next';
import { db } from '@/db/client';
import { guardPage } from '@/modules/shared/auth/require-permission';
import { ROLE_PERMISSIONS } from '@/modules/role/permissions';
import { createRoleContainer } from '@/modules/role/container';
import { searchRoleSchema } from '@/modules/role/validation/search-role.schema';
import { SearchRoleCommand } from '@/modules/role/commands/search-role.command';
import { toRoleDto } from '@/modules/role/serializers/role.serializer';
import { RoleList } from '@/modules/role/ui/components/RoleList';

export const metadata: Metadata = { title: 'Roles' };

type Props = {
  params: Promise<{ companyId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

/** Listar. */
export default async function RolesPage({ params, searchParams }: Props) {
  const { companyId } = await params;
  await guardPage(companyId, ROLE_PERMISSIONS.LIST);

  const input = searchRoleSchema.parse(await searchParams);
  const command = SearchRoleCommand.fromInput(input, companyId);
  const { data, total } = await createRoleContainer(db).searchService.execute(command);

  return (
    <RoleList
      companyId={companyId}
      roles={data.map((row) => toRoleDto(row))}
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
