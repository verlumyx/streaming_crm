import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '@/db/client';
import { resetDb } from '../../../helpers/reset-db';
import { expectRedirect } from '../../../helpers/session-mock';
import { createUserWithCompany } from '../../../helpers/company-context';
import { createClient } from '../../../factories/client.factory';
import { createClaim } from '../../../factories/claim.factory';
import { CLOSED_MESSAGE, claimContext, reloadClaim, submitStatus } from './claim-test-utils';

describe('Actualizar estado del reclamo', () => {
  beforeEach(resetDb);

  it('walks the flow open → in_progress → resolved', async () => {
    const ctx = await claimContext();
    const claim = await createClaim(db, ctx.client);

    await expectRedirect(
      submitStatus(ctx.company.id, claim.id, { status: 'in_progress' }),
      `/${ctx.company.id}/claims/${claim.id}`,
    );
    expect(await reloadClaim(claim.id)).toMatchObject({ status: 'in_progress', resolvedBy: null, resolvedAt: null });

    await expectRedirect(
      submitStatus(ctx.company.id, claim.id, { status: 'resolved', resolutionNotes: 'Se restableció la cuenta.' }),
      `/${ctx.company.id}/claims/${claim.id}`,
    );

    const resolved = await reloadClaim(claim.id);
    expect(resolved).toMatchObject({
      status: 'resolved',
      resolvedBy: ctx.user.id,
      resolutionNotes: 'Se restableció la cuenta.',
    });
    expect(resolved.resolvedAt).not.toBeNull();
  });

  it('clears the resolution stamp when the claim is reopened', async () => {
    const ctx = await claimContext();
    const claim = await createClaim(db, ctx.client, { status: 'resolved', resolvedBy: ctx.user.id });

    await expectRedirect(
      submitStatus(ctx.company.id, claim.id, { status: 'open' }),
      `/${ctx.company.id}/claims/${claim.id}`,
    );

    expect(await reloadClaim(claim.id)).toMatchObject({ status: 'open', resolvedBy: null, resolvedAt: null });
  });

  it('keeps the stored notes when the form does not send them, and clears them when they arrive empty', async () => {
    const ctx = await claimContext();
    const claim = await createClaim(db, ctx.client, { resolutionNotes: 'Notas previas' });

    await expectRedirect(
      submitStatus(ctx.company.id, claim.id, { status: 'in_progress' }, 'list'),
      `/${ctx.company.id}/claims`,
    );
    expect((await reloadClaim(claim.id)).resolutionNotes).toBe('Notas previas');

    await expectRedirect(
      submitStatus(ctx.company.id, claim.id, { status: 'in_progress', resolutionNotes: '   ' }),
      `/${ctx.company.id}/claims/${claim.id}`,
    );
    expect((await reloadClaim(claim.id)).resolutionNotes).toBeNull();
  });

  it('lands on the list when the change comes from the list', async () => {
    const ctx = await claimContext();
    const claim = await createClaim(db, ctx.client);

    await expectRedirect(
      submitStatus(ctx.company.id, claim.id, { status: 'resolved' }, 'list'),
      `/${ctx.company.id}/claims`,
    );

    expect((await reloadClaim(claim.id)).status).toBe('resolved');
  });

  it('a closed claim admits no further change', async () => {
    const ctx = await claimContext();
    const claim = await createClaim(db, ctx.client, { status: 'closed', resolvedBy: ctx.user.id });

    const result = await submitStatus(ctx.company.id, claim.id, { status: 'open' });

    expect(result).toMatchObject({ status: 'error', message: CLOSED_MESSAGE });
    expect((await reloadClaim(claim.id)).status).toBe('closed');
  });

  it('rejects an unknown status', async () => {
    const ctx = await claimContext();
    const claim = await createClaim(db, ctx.client);

    const result = await submitStatus(ctx.company.id, claim.id, { status: 'archivado' });

    expect(result.fieldErrors).toMatchObject({ status: ['El estado no es válido.'] });
    expect((await reloadClaim(claim.id)).status).toBe('open');
  });

  it('never reaches a claim of another company', async () => {
    const ctx = await claimContext();
    const other = await createUserWithCompany(db);
    const foreign = await createClaim(db, await createClient(db, { companyId: other.company.id }));

    const result = await submitStatus(ctx.company.id, foreign.id, { status: 'closed' });

    expect(result).toMatchObject({ status: 'error', message: 'Reclamo no encontrado.' });
    expect((await reloadClaim(foreign.id)).status).toBe('open');
  });
});
