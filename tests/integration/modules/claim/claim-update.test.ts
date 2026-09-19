import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '@/db/client';
import { uuidv7 } from '@/modules/shared/uuid';
import { resetDb } from '../../../helpers/reset-db';
import { expectRedirect } from '../../../helpers/session-mock';
import { createUserWithCompany } from '../../../helpers/company-context';
import { createClient } from '../../../factories/client.factory';
import { createClaim } from '../../../factories/claim.factory';
import { CLOSED_MESSAGE, claimContext, reloadClaim, submitUpdate } from './claim-test-utils';

const validValues = (clientId: string) => ({
  clientId,
  subject: 'Asunto corregido',
  description: 'Descripción corregida',
  channel: 'phone',
});

describe('Actualizar reclamo', () => {
  beforeEach(resetDb);

  it('updates the data and redirects to the detail page', async () => {
    const ctx = await claimContext();
    const secondClient = await createClient(db, { companyId: ctx.company.id });
    const claim = await createClaim(db, ctx.client);

    await expectRedirect(
      submitUpdate(ctx.company.id, claim.id, validValues(secondClient.id)),
      `/${ctx.company.id}/claims/${claim.id}`,
    );

    expect(await reloadClaim(claim.id)).toMatchObject({
      clientId: secondClient.id,
      subject: 'Asunto corregido',
      description: 'Descripción corregida',
      channel: 'phone',
      code: claim.code,
      status: 'open',
    });
  });

  it('never changes the code, the status nor the resolution notes', async () => {
    const ctx = await claimContext();
    const claim = await createClaim(db, ctx.client, { status: 'resolved', resolutionNotes: 'Notas previas' });

    await expectRedirect(
      submitUpdate(ctx.company.id, claim.id, {
        ...validValues(ctx.client.id),
        code: 'REC999999',
        status: 'closed',
        resolutionNotes: 'hackeado',
      }),
      `/${ctx.company.id}/claims/${claim.id}`,
    );

    expect(await reloadClaim(claim.id)).toMatchObject({
      code: claim.code,
      status: 'resolved',
      resolutionNotes: 'Notas previas',
    });
  });

  it('refuses to update a closed claim', async () => {
    const ctx = await claimContext();
    const claim = await createClaim(db, ctx.client, { status: 'closed' });

    const result = await submitUpdate(ctx.company.id, claim.id, validValues(ctx.client.id));

    expect(result).toMatchObject({ status: 'error', message: CLOSED_MESSAGE });
    expect((await reloadClaim(claim.id)).subject).toBe(claim.subject);
  });

  it('reports the required fields without touching the row', async () => {
    const ctx = await claimContext();
    const claim = await createClaim(db, ctx.client);

    const result = await submitUpdate(ctx.company.id, claim.id, { clientId: '', subject: '', description: '' });

    expect(result.fieldErrors).toMatchObject({
      clientId: ['El cliente es obligatorio.'],
      subject: ['El asunto es obligatorio.'],
      description: ['La descripción es obligatorio.'],
    });
    expect((await reloadClaim(claim.id)).subject).toBe(claim.subject);
  });

  it('refuses a client of another company', async () => {
    const ctx = await claimContext();
    const claim = await createClaim(db, ctx.client);
    const other = await createUserWithCompany(db);
    const foreignClient = await createClient(db, { companyId: other.company.id });

    const result = await submitUpdate(ctx.company.id, claim.id, validValues(foreignClient.id));

    expect(result.fieldErrors).toMatchObject({ clientId: ['El cliente no existe en esta empresa.'] });
    expect((await reloadClaim(claim.id)).clientId).toBe(ctx.client.id);
  });

  it('answers not found for a malformed id and for a claim of another company', async () => {
    const ctx = await claimContext();
    const other = await createUserWithCompany(db);
    const foreign = await createClaim(db, await createClient(db, { companyId: other.company.id }));

    expect(await submitUpdate(ctx.company.id, 'no-es-uuid', validValues(ctx.client.id))).toMatchObject({
      status: 'error',
      message: 'Reclamo no encontrado.',
    });
    expect(await submitUpdate(ctx.company.id, uuidv7(), validValues(ctx.client.id))).toMatchObject({
      status: 'error',
      message: 'Reclamo no encontrado.',
    });
    expect(await submitUpdate(ctx.company.id, foreign.id, validValues(ctx.client.id))).toMatchObject({
      status: 'error',
      message: 'Reclamo no encontrado.',
    });
    expect((await reloadClaim(foreign.id)).subject).toBe(foreign.subject);
  });
});
