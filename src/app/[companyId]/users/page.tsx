import type { Metadata } from 'next';
import { db } from '@/db/client';
import { guardPage } from '@/modules/shared/auth/require-permission';
import { USER_PERMISSIONS } from '@/modules/user/permissions';
import { createUserContainer } from '@/modules/user/container';
import { searchUserSchema } from '@/modules/user/validation/search-user.schema';
import { SearchUserCommand } from '@/modules/user/commands/search-user.command';
import { toUserDto } from '@/modules/user/serializers/user.serializer';
import { UserList } from '@/modules/user/ui/components/UserList';

export const metadata: Metadata = { title: 'Usuarios' };

type Props = {
  params: Promise<{ companyId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

/** Listar: only users with a membership in the company. */
export default async function UsersPage({ params, searchParams }: Props) {
  const { companyId } = await params;
  await guardPage(companyId, USER_PERMISSIONS.LIST);

  const input = searchUserSchema.parse(await searchParams);
  const command = SearchUserCommand.fromInput(input, companyId);
  const { data, total } = await createUserContainer(db).searchService.execute(command);

  return (
    <UserList
      companyId={companyId}
      users={data.map(toUserDto)}
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
