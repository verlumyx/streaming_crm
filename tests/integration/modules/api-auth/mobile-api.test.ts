import { beforeEach, describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import { db } from '@/db/client';
import { apiTokens } from '@/modules/api-auth/models/api-token.model';
import { createApiAuthContainer } from '@/modules/api-auth/container';
import { MAX_DEVICES } from '@/modules/api-auth/services/api-login.service';
import { seedMenus, seedPermissions } from '@/db/seed/registries';
import { uuidv7 } from '@/modules/shared/uuid';
import { POST as login } from '@/app/api/login/route';
import { POST as logout } from '@/app/api/logout/route';
import { GET as me } from '@/app/api/me/route';
import { GET as context } from '@/app/api/companies/[companyId]/context/route';
import { GET as menu } from '@/app/api/companies/[companyId]/menu/route';
import { resetDb } from '../../../helpers/reset-db';
import { addMembership, assignRoleWithPermissions, createUserWithCompany } from '../../../helpers/company-context';
import { withPassword } from '../../../helpers/credentials';
import { createCompany } from '../../../factories/company.factory';

let ipCounter = 0;
const nextIp = () => `10.0.0.${++ipCounter}`;

const loginRequest = (body: unknown, ip = nextIp()) =>
  new Request('http://localhost/api/login', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-forwarded-for': ip },
    body: JSON.stringify(body),
  });

const authed = (url: string, token?: string, method = 'GET') =>
  new Request(`http://localhost${url}`, { method, headers: token ? { authorization: `Bearer ${token}` } : {} });

const params = (companyId: string) => ({ params: Promise.resolve({ companyId }) });

async function issueToken(userId: string, name = 'mobile'): Promise<string> {
  const { repository, tokens } = createApiAuthContainer(db);
  const { plain, hash } = tokens.issue();
  await repository.createToken({ id: uuidv7(), userId, name, tokenHash: hash });
  return plain;
}

describe('POST /api/login', () => {
  beforeEach(resetDb);

  it('a user can log in and receives a token', async () => {
    const { user, company } = await createUserWithCompany(db);
    await withPassword(db, user);

    const response = await login(loginRequest({ email: user.email.toUpperCase(), password: 'password', device_name: 'iPhone 15' }));
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.token).toMatch(/^[0-9a-f]{64}$/);
    expect(body.user).toMatchObject({ id: user.id, email: user.email, is_system_owner: false });
    expect(body.user.companies).toEqual([
      expect.objectContaining({ id: company.id, name: company.name, status: 'active', is_default: true }),
    ]);

    const [token] = await db.select().from(apiTokens).where(eq(apiTokens.userId, user.id));
    expect(token.name).toBe('iPhone 15');
    expect(token.tokenHash).not.toBe(body.token);
  });

  it('login fails with invalid credentials', async () => {
    const { user } = await createUserWithCompany(db);
    await withPassword(db, user);

    const response = await login(loginRequest({ email: user.email, password: 'wrong-password' }));

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ message: 'Las credenciales proporcionadas son incorrectas.' });
    expect(await db.select().from(apiTokens)).toHaveLength(0);
  });

  it('login requires email and password', async () => {
    const response = await login(loginRequest({}));
    const body = await response.json();

    expect(response.status).toBe(422);
    expect(Object.keys(body.errors).sort()).toEqual(['email', 'password']);
  });

  it('login is blocked when the device limit is reached', async () => {
    const { user } = await createUserWithCompany(db);
    await withPassword(db, user);
    await issueToken(user.id, 'device-1');
    await issueToken(user.id, 'device-2');

    const response = await login(loginRequest({ email: user.email, password: 'password' }));

    expect(response.status).toBe(403);
    expect(await db.select().from(apiTokens).where(eq(apiTokens.userId, user.id))).toHaveLength(MAX_DEVICES);
  });

  it('login is rate limited to 10 attempts per minute per IP', async () => {
    const ip = '172.16.0.99';
    const statuses: number[] = [];
    for (let i = 0; i < 11; i++) statuses.push((await login(loginRequest({ email: 'x@example.com', password: 'nope' }, ip))).status);

    expect(statuses.slice(0, 10).every((s) => s === 401)).toBe(true);
    expect(statuses[10]).toBe(429);
  });
});

describe('POST /api/logout and GET /api/me', () => {
  beforeEach(resetDb);

  it('an authenticated user can log out and the token is revoked', async () => {
    const { user } = await createUserWithCompany(db);
    const token = await issueToken(user.id);

    const response = await logout(authed('/api/logout', token, 'POST'));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ message: 'Sesión cerrada correctamente.' });
    expect(await db.select().from(apiTokens)).toHaveLength(0);
    expect((await me(authed('/api/me', token))).status).toBe(401);
  });

  it('logout only revokes the current device token', async () => {
    const { user } = await createUserWithCompany(db);
    const current = await issueToken(user.id, 'device-1');
    await issueToken(user.id, 'device-2');

    await logout(authed('/api/logout', current, 'POST'));

    const remaining = await db.select().from(apiTokens).where(eq(apiTokens.userId, user.id));
    expect(remaining.map((t) => t.name)).toEqual(['device-2']);
  });

  it('logout and me require authentication', async () => {
    expect((await logout(authed('/api/logout', undefined, 'POST'))).status).toBe(401);
    expect((await me(authed('/api/me'))).status).toBe(401);
    expect((await me(authed('/api/me', 'not-a-real-token'))).status).toBe(401);
  });

  it('an authenticated user can fetch their profile', async () => {
    const { user, company } = await createUserWithCompany(db);
    const token = await issueToken(user.id);

    const response = await me(authed('/api/me', token));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.user).toMatchObject({ id: user.id, email: user.email });
    expect(body.user.companies[0].id).toBe(company.id);
    const [row] = await db.select().from(apiTokens);
    expect(row.lastUsedAt).not.toBeNull();
  });
});

describe('GET /api/companies/{id}/context and /menu', () => {
  beforeEach(async () => {
    await resetDb();
    await seedPermissions(db);
    await seedMenus(db);
  });

  it('returns company, permissions and menu (raw urls) in a single request', async () => {
    const { user, company } = await createUserWithCompany(db);
    await assignRoleWithPermissions(db, user.id, company.id, ['services.list', 'menus.list']);
    const token = await issueToken(user.id);

    const response = await context(authed(`/api/companies/${company.id}/context`, token), params(company.id));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.company).toMatchObject({ id: company.id, name: company.name, status: 'active', is_default: true });
    expect(body.company.role_id).toEqual(expect.any(String));
    expect(body.permissions).toContain('services.list');
    const titles = body.menu.mainNavItems.map((m: { title: string }) => m.title);
    expect(titles).toContain('Dashboard');
    expect(titles).toContain('Catálogo');
    expect(body.menu.mainNavItems.find((m: { title: string }) => m.title === 'Dashboard').url).toBe('/dashboard');
  });

  it('permissions and menu are scoped to the role of that company', async () => {
    const { user, company } = await createUserWithCompany(db);
    await assignRoleWithPermissions(db, user.id, company.id, ['menus.list']);
    const token = await issueToken(user.id);

    const body = await (await context(authed(`/api/companies/${company.id}/context`, token), params(company.id))).json();

    expect(body.permissions).toEqual(['menus.list']);
    const titles = body.menu.mainNavItems.map((m: { title: string }) => m.title);
    expect(titles).toContain('Dashboard');
    expect(titles).not.toContain('Catálogo');
  });

  it('a user with full access gets the whole menu, filtered for another role', async () => {
    const { user, company } = await createUserWithCompany(db);
    const token = await issueToken(user.id);

    const full = await (await menu(authed(`/api/companies/${company.id}/menu`, token), params(company.id))).json();
    expect(full.mainNavItems.map((m: { title: string }) => m.title)).toEqual(expect.arrayContaining(['Dashboard', 'Clientes', 'Catálogo', 'Ventas']));
    expect(full.mainNavItems[0]).toEqual(expect.objectContaining({ id: expect.any(String), icon: expect.any(String), children: expect.any(Array) }));
    expect(full.footerNavItems.map((m: { title: string }) => m.title)).not.toContain('Empresas');

    await assignRoleWithPermissions(db, user.id, company.id, ['menus.list']);
    const limited = await (await menu(authed(`/api/companies/${company.id}/menu`, token), params(company.id))).json();
    expect(limited.mainNavItems.map((m: { title: string }) => m.title)).toEqual(['Dashboard']);
  });

  it('context and menu require authentication', async () => {
    const companyId = uuidv7();
    expect((await context(authed(`/api/companies/${companyId}/context`), params(companyId))).status).toBe(401);
    expect((await menu(authed(`/api/companies/${companyId}/menu`), params(companyId))).status).toBe(401);
  });

  it('a user cannot use a company they do not belong to, nor an inactive one', async () => {
    const { user } = await createUserWithCompany(db);
    const token = await issueToken(user.id);
    const foreign = await createCompany(db, { createdBy: user.id });
    const inactive = await createCompany(db, { createdBy: user.id, status: 'inactive' });
    await addMembership(db, user.id, inactive.id);

    expect((await context(authed(`/api/companies/${foreign.id}/context`, token), params(foreign.id))).status).toBe(403);
    expect((await menu(authed(`/api/companies/${foreign.id}/menu`, token), params(foreign.id))).status).toBe(403);
    expect((await context(authed(`/api/companies/${inactive.id}/context`, token), params(inactive.id))).status).toBe(403);
    expect((await menu(authed('/api/companies/not-a-uuid/menu', token), params('not-a-uuid'))).status).toBe(403);
  });

  it('a system owner can use an inactive company', async () => {
    const { user, company } = await createUserWithCompany(db, { isSystemOwner: true, companyStatus: 'inactive' });
    const token = await issueToken(user.id);

    const response = await context(authed(`/api/companies/${company.id}/context`, token), params(company.id));

    expect(response.status).toBe(200);
    expect((await response.json()).company.status).toBe('inactive');
  });
});
