import { Badge } from '@/components/ui/badge';
import { ADMINISTRATOR_ROLE_NAME } from '@/modules/role/models/role.model';
import type { UserDto } from '@/modules/user/serializers/user.serializer';

/** Role of the user in the current company, or "Sin rol". */
export function UserRoleBadge({ role }: { role: UserDto['role'] }) {
  if (!role) return <Badge variant="outline">Sin rol</Badge>;
  return <Badge variant={role.name === ADMINISTRATOR_ROLE_NAME ? 'default' : 'secondary'}>{role.name}</Badge>;
}
