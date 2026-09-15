import { beforeEach, describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import { db } from '@/db/client';
import { user } from '@/db/auth-schema';
import { initialActionState } from '@/modules/shared/actions/action-state';
import { updateProfileAction } from '@/app/[companyId]/settings/actions';
import SettingsProfilePage from '@/app/[companyId]/settings/profile/page';
import SettingsTwoFactorPage from '@/app/[companyId]/settings/two-factor/page';
import { resetDb } from '../../../helpers/reset-db';
import { setSessionUser } from '../../../helpers/session-mock';
import { createUserWithCompany } from '../../../helpers/company-context';
import { formData } from '../../../helpers/form-data';
import { createUser } from '../../../factories/user.factory';

const findUser = async (id: string) => (await db.select().from(user).where(eq(user.id, id)))[0];

describe('Perfil', () => {
  beforeEach(resetDb);

  it('profile page is displayed with the data from the database', async () => {
    const { user: sessionUser, company } = await createUserWithCompany(db);
    setSessionUser(sessionUser);

    const element = await SettingsProfilePage({ params: Promise.resolve({ companyId: company.id }) });

    expect(element.props.companyId).toBe(company.id);
    expect(element.props.profile).toEqual({
      id: sessionUser.id,
      name: sessionUser.name,
      email: sessionUser.email,
      emailVerified: true,
      twoFactorEnabled: false,
    });
  });

  it('profile information can be updated and a new email is unverified', async () => {
    const { user: sessionUser, company } = await createUserWithCompany(db);
    setSessionUser(sessionUser);

    const result = await updateProfileAction(
      company.id,
      initialActionState,
      formData({ name: 'Test User', email: 'Test@Example.com' }),
    );

    expect(result).toMatchObject({ status: 'success', message: 'Guardado.' });
    const row = await findUser(sessionUser.id);
    expect(row).toMatchObject({ name: 'Test User', email: 'test@example.com', emailVerified: false });
  });

  it('email verification status is unchanged when the email address is unchanged', async () => {
    const { user: sessionUser, company } = await createUserWithCompany(db);
    setSessionUser(sessionUser);

    const result = await updateProfileAction(
      company.id,
      initialActionState,
      formData({ name: 'Test User', email: sessionUser.email.toUpperCase() }),
    );

    expect(result.status).toBe('success');
    const row = await findUser(sessionUser.id);
    expect(row).toMatchObject({ name: 'Test User', email: sessionUser.email, emailVerified: true });
  });

  it('an email used by another user is rejected', async () => {
    const { user: sessionUser, company } = await createUserWithCompany(db);
    await createUser(db, { email: 'tomado@example.com' });
    setSessionUser(sessionUser);

    const result = await updateProfileAction(
      company.id,
      initialActionState,
      formData({ name: 'Otro Nombre', email: 'tomado@example.com' }),
    );

    expect(result.status).toBe('error');
    expect(result.status !== 'success' && result.fieldErrors?.email?.[0]).toBe('Este correo ya está en uso.');
    const row = await findUser(sessionUser.id);
    expect(row).toMatchObject({ name: sessionUser.name, email: sessionUser.email, emailVerified: true });
  });

  it('name and email are validated', async () => {
    const { user: sessionUser, company } = await createUserWithCompany(db);
    setSessionUser(sessionUser);

    const result = await updateProfileAction(company.id, initialActionState, formData({ name: '', email: 'x' }));

    expect(result.status).toBe('error');
    if (result.status === 'success') return;
    expect(result.fieldErrors?.name?.[0]).toBe('El nombre es obligatorio.');
    expect(result.fieldErrors?.email?.[0]).toBe('El correo no es válido.');
  });

  it('only updates the session user and requires a session', async () => {
    const { user: sessionUser, company } = await createUserWithCompany(db);
    const other = await createUser(db);

    setSessionUser(null);
    const guest = await updateProfileAction(company.id, initialActionState, formData({ name: 'X', email: 'x@x.com' }));
    expect(guest).toMatchObject({ status: 'error', message: 'Tu sesión ha expirado. Inicia sesión de nuevo.' });

    setSessionUser(sessionUser);
    await updateProfileAction(
      company.id,
      initialActionState,
      formData({ id: other.id, userId: other.id, name: 'Cambiado', email: sessionUser.email }),
    );
    expect((await findUser(other.id)).name).toBe(other.name);
    expect((await findUser(sessionUser.id)).name).toBe('Cambiado');
  });
});

describe('Autenticación de dos factores', () => {
  beforeEach(resetDb);

  it('two factor settings page reads the flag from the database', async () => {
    const { user: sessionUser } = await createUserWithCompany(db);
    setSessionUser(sessionUser);

    let element = await SettingsTwoFactorPage();
    expect(element.props.twoFactorEnabled).toBe(false);

    await db.update(user).set({ twoFactorEnabled: true }).where(eq(user.id, sessionUser.id));
    element = await SettingsTwoFactorPage();
    expect(element.props.twoFactorEnabled).toBe(true);
  });
});
