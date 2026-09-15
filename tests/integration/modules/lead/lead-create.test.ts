import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '@/db/client';
import { leads } from '@/modules/lead/models/lead.model';
import { initialActionState } from '@/modules/shared/actions/action-state';
import { isUuid } from '@/modules/shared/uuid';
import { createLeadAction } from '@/app/contact/actions';
import { resetDb } from '../../../helpers/reset-db';
import { setSessionUser, expectRedirect } from '../../../helpers/session-mock';
import { formData } from '../../../helpers/form-data';

const SENT = '/contact?sent=1';

function submit(values: Record<string, string>) {
  return createLeadAction(initialActionState, formData(values));
}

describe('Formulario de contacto (leads)', () => {
  beforeEach(async () => {
    await resetDb();
    setSessionUser(null);
  });

  it('a guest can submit the contact form and a pending lead is stored', async () => {
    await expectRedirect(
      submit({ name: 'Ada Lovelace', email: 'ada@example.com', phone: '+56 912345678' }),
      SENT,
    );

    const rows = await db.select().from(leads);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      name: 'Ada Lovelace',
      email: 'ada@example.com',
      phone: '+56 912345678',
      status: 'pending',
      deletedAt: null,
    });
    expect(isUuid(rows[0].id)).toBe(true);
  });

  it('the id is generated on the server and never taken from the form', async () => {
    const forged = '0192f3a0-0000-7000-8000-000000000001';

    await expectRedirect(
      submit({ id: forged, name: 'Ada', email: 'ada@example.com', phone: '+56 9', status: 'reviewed' }),
      SENT,
    );

    const [row] = await db.select().from(leads);
    expect(row.id).not.toBe(forged);
    expect(row.status).toBe('pending');
  });

  it('the contact form requires name, email and phone', async () => {
    const result = await submit({ name: '', email: '', phone: '' });

    expect(result.status).toBe('error');
    expect(result.fieldErrors?.name?.[0]).toBe('El nombre es obligatorio.');
    expect(result.fieldErrors?.email?.[0]).toBe('El correo es obligatorio.');
    expect(result.fieldErrors?.phone?.[0]).toBe('El teléfono es obligatorio.');
    expect(await db.select().from(leads)).toHaveLength(0);
  });

  it('missing fields are reported too', async () => {
    const result = await submit({});

    expect(Object.keys(result.fieldErrors ?? {}).sort()).toEqual(['email', 'name', 'phone']);
  });

  it('the contact form rejects an invalid email', async () => {
    const result = await submit({ name: 'Ada Lovelace', email: 'not-an-email', phone: '+56912345678' });

    expect(result.fieldErrors?.email).toEqual(['Ingresa un correo válido.']);
    expect(await db.select().from(leads)).toHaveLength(0);
  });

  it('the contact form enforces the maximum lengths', async () => {
    const result = await submit({
      name: 'a'.repeat(256),
      email: `${'a'.repeat(250)}@x.com`,
      phone: '1'.repeat(31),
    });

    expect(result.fieldErrors?.name?.[0]).toBe('El nombre no puede superar 255 caracteres.');
    expect(result.fieldErrors?.email?.[0]).toBe('El correo no puede superar 255 caracteres.');
    expect(result.fieldErrors?.phone?.[0]).toBe('El teléfono no puede superar 30 caracteres.');
  });

  it('a filled honeypot silently succeeds without storing anything', async () => {
    await expectRedirect(
      submit({ name: 'Bot', email: 'bot@spam.com', phone: '+1 555', website: 'http://spam.example' }),
      SENT,
    );

    expect(await db.select().from(leads)).toHaveLength(0);
  });

  it('a filled honeypot succeeds even with invalid data (no validation hints for bots)', async () => {
    await expectRedirect(submit({ name: '', email: 'x', phone: '', website: 'spam' }), SENT);

    expect(await db.select().from(leads)).toHaveLength(0);
  });
});
