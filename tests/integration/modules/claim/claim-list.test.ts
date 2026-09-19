import { beforeEach, describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import { db } from '@/db/client';
import { claims } from '@/modules/claim/models/claim.model';
import ClaimsPage from '@/app/[companyId]/claims/page';
import { resetDb } from '../../../helpers/reset-db';
import { setSessionUser } from '../../../helpers/session-mock';
import { createUserWithCompany } from '../../../helpers/company-context';
import { createClient } from '../../../factories/client.factory';
import { createClaim } from '../../../factories/claim.factory';
import { claimContext } from './claim-test-utils';

type Item = { id: string };

const list = (companyId: string, searchParams: Record<string, string> = {}) =>
  ClaimsPage({ params: Promise.resolve({ companyId }), searchParams: Promise.resolve(searchParams) });

const ids = async (companyId: string, params: Record<string, string> = {}) =>
  (await list(companyId, params)).props.claims.map((c: Item) => c.id);

describe('Listar reclamos', () => {
  beforeEach(resetDb);

  it('renders the claims of the company with their client, newest first', async () => {
    const ctx = await claimContext();
    const older = await createClaim(db, ctx.client, { subject: 'Viejo' });
    const newer = await createClaim(db, ctx.client, { subject: 'Nuevo', status: 'resolved' });
    await db.update(claims).set({ createdAt: new Date('2026-01-01T00:00:00Z') }).where(eq(claims.id, older.id));

    const other = await createUserWithCompany(db);
    await createClaim(db, await createClient(db, { companyId: other.company.id }));

    const element = await list(ctx.company.id);

    expect(element.props.claims.map((c: Item) => c.id)).toEqual([newer.id, older.id]);
    expect(element.props.claims[0]).toMatchObject({
      code: newer.code,
      subject: 'Nuevo',
      status: 'resolved',
      channel: 'whatsapp',
      isClosed: false,
      client: { id: ctx.client.id, name: ctx.client.name, code: ctx.client.code },
    });
    expect(element.props.meta).toEqual({ total: 2, limit: 10, offset: 0, hasMore: false });
  });

  it('filters by q (code, subject or description, case-insensitive and with literal wildcards)', async () => {
    const ctx = await claimContext();
    const bySubject = await createClaim(db, ctx.client, { subject: 'No carga NETFLIX 100%' });
    const byDescription = await createClaim(db, ctx.client, { description: 'Pantalla en negro' });
    await createClaim(db, ctx.client, { subject: 'Otro', description: 'Nada que ver' });

    expect(await ids(ctx.company.id, { q: 'netflix' })).toEqual([bySubject.id]);
    expect(await ids(ctx.company.id, { q: '100%' })).toEqual([bySubject.id]);
    expect(await ids(ctx.company.id, { q: 'pantalla' })).toEqual([byDescription.id]);
    expect(await ids(ctx.company.id, { q: bySubject.code.toLowerCase() })).toEqual([bySubject.id]);
  });

  it('filters by status, channel and client', async () => {
    const ctx = await claimContext();
    const secondClient = await createClient(db, { companyId: ctx.company.id });
    const closed = await createClaim(db, ctx.client, { status: 'closed' });
    const byPhone = await createClaim(db, ctx.client, { channel: 'phone' });
    const ofSecond = await createClaim(db, secondClient);

    expect(await ids(ctx.company.id, { status: 'closed' })).toEqual([closed.id]);
    expect(await ids(ctx.company.id, { channel: 'phone' })).toEqual([byPhone.id]);
    expect(await ids(ctx.company.id, { clientId: secondClient.id })).toEqual([ofSecond.id]);
  });

  it('paginates and never leaks another company claims', async () => {
    const ctx = await claimContext();
    for (let n = 0; n < 3; n++) await createClaim(db, ctx.client);
    const other = await createUserWithCompany(db);
    const otherClient = await createClient(db, { companyId: other.company.id });
    await createClaim(db, otherClient);

    const firstPage = await list(ctx.company.id, { limit: '2' });
    const secondPage = await list(ctx.company.id, { limit: '2', offset: '2' });

    expect(firstPage.props.claims).toHaveLength(2);
    expect(firstPage.props.meta).toMatchObject({ total: 3, hasMore: true });
    expect(secondPage.props.claims).toHaveLength(1);
    expect(secondPage.props.meta).toMatchObject({ total: 3, hasMore: false });

    setSessionUser(other.user);
    expect(await ids(other.company.id)).toHaveLength(1);
  });
});
