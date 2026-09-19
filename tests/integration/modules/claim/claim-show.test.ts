import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '@/db/client';
import { uuidv7 } from '@/modules/shared/uuid';
import { CLAIM_PERMISSIONS } from '@/modules/claim/permissions';
import ClaimShowPage from '@/app/[companyId]/claims/[id]/page';
import ClaimCreatePage from '@/app/[companyId]/claims/create/page';
import ClaimEditPage from '@/app/[companyId]/claims/[id]/edit/page';
import { resetDb } from '../../../helpers/reset-db';
import { expectNotFound, setSessionUser } from '../../../helpers/session-mock';
import { assignRoleWithPermissions, createUserWithCompany } from '../../../helpers/company-context';
import { createClient } from '../../../factories/client.factory';
import { createClaim } from '../../../factories/claim.factory';
import { claimContext } from './claim-test-utils';

const show = (companyId: string, id: string) => ClaimShowPage({ params: Promise.resolve({ companyId, id }) });

const createForm = (companyId: string, searchParams: Record<string, string> = {}) =>
  ClaimCreatePage({ params: Promise.resolve({ companyId }), searchParams: Promise.resolve(searchParams) });

const editForm = (companyId: string, id: string) => ClaimEditPage({ params: Promise.resolve({ companyId, id }) });

describe('Ver reclamo', () => {
  beforeEach(resetDb);

  it('renders the claim with its client and the reporting user', async () => {
    const ctx = await claimContext();
    const claim = await createClaim(db, ctx.client, { reportedBy: ctx.user.id, subject: 'No carga Netflix' });

    const element = await show(ctx.company.id, claim.id);

    expect(element.props.claim).toMatchObject({
      id: claim.id,
      code: claim.code,
      subject: 'No carga Netflix',
      status: 'open',
      isClosed: false,
      client: { id: ctx.client.id, name: ctx.client.name },
      reportedByUser: { id: ctx.user.id, name: ctx.user.name },
      resolvedByUser: null,
    });
    expect(element.props).toMatchObject({ canUpdate: true, canUpdateStatus: true });
  });

  it('only offers the actions the user holds', async () => {
    const ctx = await claimContext();
    const claim = await createClaim(db, ctx.client);
    await assignRoleWithPermissions(db, ctx.user.id, ctx.company.id, [CLAIM_PERMISSIONS.SHOW]);

    const element = await show(ctx.company.id, claim.id);

    expect(element.props).toMatchObject({ canUpdate: false, canUpdateStatus: false });
  });

  it('404s on a malformed id, an unknown id and a claim of another company', async () => {
    const ctx = await claimContext();
    const other = await createUserWithCompany(db);
    const foreign = await createClaim(db, await createClient(db, { companyId: other.company.id }));

    await expectNotFound(show(ctx.company.id, 'no-es-uuid'));
    await expectNotFound(show(ctx.company.id, uuidv7()));
    await expectNotFound(show(ctx.company.id, foreign.id));
  });
});

describe('Formularios de reclamo', () => {
  beforeEach(resetDb);

  it('the create form lists the clients of the company and preselects `?clientId=`', async () => {
    const ctx = await claimContext();
    const other = await createUserWithCompany(db);
    await createClient(db, { companyId: other.company.id });

    const element = await createForm(ctx.company.id, { clientId: ctx.client.id });

    expect(element.props.children.props.clients).toEqual([
      { id: ctx.client.id, name: ctx.client.name, code: ctx.client.code, isActive: true },
    ]);
    expect(element.props.children.props.preselectedClientId).toBe(ctx.client.id);
    expect(element.props.children.props.initialId).toMatch(/^[0-9a-f-]{36}$/);
  });

  it('the create form ignores a client of another company', async () => {
    const ctx = await claimContext();
    const other = await createUserWithCompany(db);
    const foreignClient = await createClient(db, { companyId: other.company.id });

    const element = await createForm(ctx.company.id, { clientId: foreignClient.id });

    expect(element.props.children.props.preselectedClientId).toBeNull();
  });

  it('the edit form carries the claim and its clients', async () => {
    const ctx = await claimContext();
    const claim = await createClaim(db, ctx.client);

    const element = await editForm(ctx.company.id, claim.id);

    expect(element.props.children.props.claim).toMatchObject({ id: claim.id, subject: claim.subject });
    expect(element.props.children.props.clients).toHaveLength(1);
  });

  it('the edit form 404s for a closed claim', async () => {
    const ctx = await claimContext();
    const claim = await createClaim(db, ctx.client, { status: 'closed' });

    await expectNotFound(editForm(ctx.company.id, claim.id));
  });

  it('the edit form 404s for a claim of another company', async () => {
    const ctx = await claimContext();
    const other = await createUserWithCompany(db);
    const foreign = await createClaim(db, await createClient(db, { companyId: other.company.id }));
    setSessionUser(ctx.user);

    await expectNotFound(editForm(ctx.company.id, foreign.id));
  });
});
