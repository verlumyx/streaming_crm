import { beforeEach, describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import { db } from '@/db/client';
import { claims } from '@/modules/claim/models/claim.model';
import { resetDb } from '../../../helpers/reset-db';
import { expectRedirect, setSessionUser } from '../../../helpers/session-mock';
import { createUserWithCompany } from '../../../helpers/company-context';
import { createClient } from '../../../factories/client.factory';
import { allClaims, claimContext, submitCreate } from './claim-test-utils';

describe('Crear reclamo', () => {
  beforeEach(resetDb);

  it('creates an open claim with its code, the client and the session user', async () => {
    const ctx = await claimContext();

    const id = '0192f3a0-0000-7000-8000-0000000000aa';
    await expectRedirect(
      submitCreate(ctx.company.id, {
        id,
        clientId: ctx.client.id,
        subject: 'No carga Netflix',
        description: 'El perfil pide contraseña.',
        channel: 'whatsapp',
      }),
      `/${ctx.company.id}/claims/${id}`,
    );

    const [claim] = await db.select().from(claims).where(eq(claims.id, id));
    expect(claim).toMatchObject({
      companyId: ctx.company.id,
      code: 'REC000001',
      clientId: ctx.client.id,
      subject: 'No carga Netflix',
      description: 'El perfil pide contraseña.',
      channel: 'whatsapp',
      status: 'open',
      resolutionNotes: null,
      reportedBy: ctx.user.id,
      resolvedBy: null,
      resolvedAt: null,
      deletedAt: null,
    });
  });

  it('numbers the code sequentially per company', async () => {
    const ctx = await claimContext();

    for (const subject of ['Uno', 'Dos']) {
      await expectRedirect(
        submitCreate(ctx.company.id, { clientId: ctx.client.id, subject, description: 'x' }),
        `/${ctx.company.id}/claims/`,
      );
    }

    const other = await createUserWithCompany(db);
    setSessionUser(other.user);
    const otherClient = await createClient(db, { companyId: other.company.id });
    await expectRedirect(
      submitCreate(other.company.id, { clientId: otherClient.id, subject: 'Tres', description: 'x' }),
      `/${other.company.id}/claims/`,
    );

    const rows = await allClaims();
    expect(rows.filter((r) => r.companyId === ctx.company.id).map((r) => r.code)).toEqual(['REC000001', 'REC000002']);
    expect(rows.filter((r) => r.companyId === other.company.id).map((r) => r.code)).toEqual(['REC000001']);
  });

  it('assigns distinct codes to concurrent creates', async () => {
    const ctx = await claimContext();

    const results = await Promise.allSettled(
      [1, 2, 3, 4, 5].map((n) =>
        submitCreate(ctx.company.id, { clientId: ctx.client.id, subject: `Reclamo ${n}`, description: 'x' }),
      ),
    );

    expect(results.every((r) => r.status === 'rejected')).toBe(true); // todas redirigen
    const codes = (await allClaims()).map((r) => r.code);
    expect(codes).toEqual(['REC000001', 'REC000002', 'REC000003', 'REC000004', 'REC000005']);
  });

  it('defaults the channel to other when the form omits it', async () => {
    const ctx = await claimContext();

    await expectRedirect(
      submitCreate(ctx.company.id, { clientId: ctx.client.id, subject: 'Sin canal', description: 'x' }),
      `/${ctx.company.id}/claims/`,
    );

    expect((await allClaims())[0].channel).toBe('other');
  });

  it('reports the required fields', async () => {
    const ctx = await claimContext();

    const result = await submitCreate(ctx.company.id, { clientId: '', subject: '', description: '' });

    expect(result.fieldErrors).toMatchObject({
      clientId: ['El cliente es obligatorio.'],
      subject: ['El asunto es obligatorio.'],
      description: ['La descripción es obligatorio.'],
    });
    expect(await allClaims()).toHaveLength(0);
  });

  it('refuses a client of another company', async () => {
    const ctx = await claimContext();
    const other = await createUserWithCompany(db);
    const foreignClient = await createClient(db, { companyId: other.company.id });

    const result = await submitCreate(ctx.company.id, {
      clientId: foreignClient.id,
      subject: 'Ajeno',
      description: 'x',
    });

    expect(result).toMatchObject({ status: 'error', fieldErrors: { clientId: ['El cliente no existe en esta empresa.'] } });
    expect(await allClaims()).toHaveLength(0);
  });
});
