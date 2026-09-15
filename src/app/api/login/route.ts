import { db } from '@/db/client';
import { DomainError } from '@/modules/shared/exceptions/domain-error';
import { getUserCompanies } from '@/modules/shared/auth/membership';
import { issuesToFieldErrors } from '@/modules/shared/validation/issues';
import { createApiAuthContainer } from '@/modules/api-auth/container';
import { loginSchema } from '@/modules/api-auth/validation/login.schema';
import { LoginCommand } from '@/modules/api-auth/commands/login.command';
import { toAuthUserDto } from '@/modules/api-auth/serializers/api-auth.serializer';
import { FixedWindowRateLimiter } from '@/modules/api-auth/infrastructure/fixed-window-rate-limiter';
import { json, validationFailed } from '@/modules/api-auth/http/api-response';

const limiter = new FixedWindowRateLimiter(10, 60_000);

/** POST /api/login — mobile login (max 2 devices per user). 201 { token, user }. */
export async function POST(request: Request) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || 'local';
  const retryAfter = limiter.hit(`login:${ip}`);
  if (retryAfter !== null) {
    return json({ message: 'Demasiados intentos. Intenta de nuevo en un minuto.' }, 429, { 'Retry-After': String(retryAfter) });
  }

  const body = await request.json().catch(() => ({}));
  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) return validationFailed(issuesToFieldErrors(parsed.error));

  try {
    const { user, token } = await createApiAuthContainer(db).loginService.execute(LoginCommand.fromInput(parsed.data));
    return json({ token, user: toAuthUserDto(user, await getUserCompanies(user.id)) }, 201);
  } catch (error) {
    if (error instanceof DomainError && 'status' in error) {
      return json({ message: error.message }, (error as DomainError & { status: number }).status);
    }
    throw error;
  }
}
