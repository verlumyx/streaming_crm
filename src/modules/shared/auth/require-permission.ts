import 'server-only';
import { cache } from 'react';
import { redirect } from 'next/navigation';
import { ForbiddenError } from '@/modules/shared/exceptions/domain-error';
import { getSessionUser } from './session';
import { getMembership } from './membership';
import { getAllPermissionActions } from '@/modules/permission/queries/all-permission-actions';

/**
 * Does the current user hold `action` in `companyId`?
 * The role comes from the membership row; `permissionType === 'all'` passes every check.
 */
export const hasPermission = cache(async (companyId: string, action: string): Promise<boolean> => {
  const user = await getSessionUser();
  if (!user) return false;

  const membership = await getMembership(user.id, companyId);
  const role = membership?.role;
  if (!role) return false;
  if (role.permissionType === 'all') return true;

  return role.permissions.some((p) => p.permission === action);
});

/** Permission actions of any user in a company (web session or API token). */
export async function permissionsForUser(
  userId: string,
  companyId: string,
): Promise<{ permissions: string[]; hasAllPermissions: boolean }> {
  const membership = await getMembership(userId, companyId);
  const role = membership?.role;
  if (!role) return { permissions: [], hasAllPermissions: false };
  if (role.permissionType === 'all') return { permissions: await getAllPermissionActions(), hasAllPermissions: true };
  return { permissions: role.permissions.map((p) => p.permission), hasAllPermissions: false };
}

/** Flat list of the current user's permission actions in the company (for the UI). */
export const getUserPermissions = cache(async (companyId: string): Promise<string[]> => {
  const user = await getSessionUser();
  if (!user) return [];
  return (await permissionsForUser(user.id, companyId)).permissions;
});

/** For server actions: throws `ForbiddenError`, which `toActionError` turns into an error state. */
export async function requirePermission(companyId: string, action: string): Promise<void> {
  if (!(await hasPermission(companyId, action))) throw new ForbiddenError(action);
}

/** For pages: a Server Component cannot set cookies, so it redirects with a query flag the layout shows as a toast. */
export async function guardPage(companyId: string, action: string): Promise<void> {
  if (!(await hasPermission(companyId, action))) redirect(`/${companyId}/dashboard?error=forbidden`);
}

export const isSystemOwner = cache(async (): Promise<boolean> => {
  const user = await getSessionUser();
  return Boolean(user?.isSystemOwner);
});

/** Companies module: gated on `users.is_system_owner`, never on a role permission. */
export async function requireSystemOwner(): Promise<void> {
  if (!(await isSystemOwner())) throw new ForbiddenError('system_owner');
}

export async function guardSystemOwnerPage(companyId: string): Promise<void> {
  if (!(await isSystemOwner())) redirect(`/${companyId}/dashboard?error=forbidden`);
}
