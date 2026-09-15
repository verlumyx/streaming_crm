import 'server-only';
import { db } from '@/db/client';
import type { UserRow } from '@/db/auth-schema';
import { isUuid } from '@/modules/shared/uuid';
import { getMembership, type Membership } from '@/modules/shared/auth/membership';
import { createApiAuthContainer } from '../container';

export const json = (body: unknown, status = 200, headers?: HeadersInit) => Response.json(body, { status, headers });

export const unauthenticated = () => json({ message: 'Unauthenticated.' }, 401);

/** Laravel-style 422 so existing mobile clients keep parsing `errors`. */
export const validationFailed = (errors: Record<string, string[]>) =>
  json({ message: 'Los datos proporcionados no son válidos.', errors }, 422);

/** `auth:sanctum` equivalent. */
export async function authenticate(request: Request): Promise<{ tokenId: string; user: UserRow } | null> {
  return createApiAuthContainer(db).authenticateService.execute(request.headers.get('authorization'));
}

/**
 * `company.access.api` equivalent: active membership in an active company (system owners may use inactive
 * companies). Returns the membership, or a JSON 403 response.
 */
export async function requireApiCompanyAccess(user: UserRow, companyId: string): Promise<Membership | Response> {
  if (!isUuid(companyId)) return json({ message: 'No tienes acceso a esta empresa.' }, 403);
  const membership = await getMembership(user.id, companyId);
  const active = membership?.status === 'active' && (user.isSystemOwner || membership.company.status === 'active');
  if (!membership || !active) return json({ message: 'No tienes acceso a esta empresa o está inactiva.' }, 403);
  return membership;
}
