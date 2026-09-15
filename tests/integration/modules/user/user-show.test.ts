import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '@/db/client';
import { uuidv7 } from '@/modules/shared/uuid';
import UserShowPage from '@/app/[companyId]/users/[id]/page';
import UserEditPage from '@/app/[companyId]/users/[id]/edit/page';
import { resetDb } from '../../../helpers/reset-db';
import { setSessionUser, expectNotFound, expectRedirect } from '../../../helpers/session-mock';
import { addMembership, assignRoleWithPermissions, createUserWithCompany } from '../../../helpers/company-context';
import { createCompany } from '../../../factories/company.factory';
import { createUser } from '../../../factories/user.factory';
import { createRole } from '../../../factories/role.factory';

const params = (companyId: string, id: string) => ({ params: Promise.resolve({ companyId, id }) });

describe('Ver usuario', () => {
  beforeEach(resetDb);

  it('users.show binds the user id and exposes the membership in this company', async () => {
    const { user: actor, company } = await createUserWithCompany(db);
    const role = await createRole(db, { companyId: company.id, name: 'Soporte' });
    const target = await createUser(db, { name: 'Target', emailVerified: false });
    await addMembership(db, target.id, company.id, { roleId: role.id, status: 'inactive' });
    setSessionUser(actor);

    const element = await UserShowPage(params(company.id, target.id));

    expect(company.id).not.toBe(target.id);
    expect(element.props.user).toMatchObject({
      id: target.id,
      name: 'Target',
      email: target.email,
      emailVerified: false,
      status: 'inactive',
      role: { id: role.id, name: 'Soporte' },
      companyName: company.name,
    });
    expect(element.props).toMatchObject({ canUpdate: true, canUpdateStatus: true });
  });

  it('users.edit binds the user id and offers the active roles', async () => {
    const { user: actor, company } = await createUserWithCompany(db);
    const target = await createUser(db);
    await addMembership(db, target.id, company.id);
    setSessionUser(actor);

    const element = await UserEditPage(params(company.id, target.id));

    expect(element.props.children.props.user).toMatchObject({ id: target.id, role: null });
    expect(element.props.children.props.roles.map((r: { name: string }) => r.name)).toEqual(['Administrador']);
  });

  it('showing a missing user or a user of another company is a 404', async () => {
    const { user: actor, company } = await createUserWithCompany(db);
    const outsider = await createUser(db);
    await addMembership(db, outsider.id, (await createCompany(db)).id);
    setSessionUser(actor);

    await expectNotFound(UserShowPage(params(company.id, uuidv7())));
    await expectNotFound(UserShowPage(params(company.id, 'not-a-uuid')));
    await expectNotFound(UserShowPage(params(company.id, outsider.id)));
    await expectNotFound(UserEditPage(params(company.id, outsider.id)));
  });

  it('a user without users.show / users.update cannot open the show and edit views', async () => {
    const { user: actor, company } = await createUserWithCompany(db);
    await assignRoleWithPermissions(db, actor.id, company.id, ['users.list']);
    setSessionUser(actor);

    await expectRedirect(UserShowPage(params(company.id, actor.id)), `/${company.id}/dashboard?error=forbidden`);
    await expectRedirect(UserEditPage(params(company.id, actor.id)), `/${company.id}/dashboard?error=forbidden`);
  });

  it('granting the matching permissions allows access to the user views', async () => {
    const { user: actor, company } = await createUserWithCompany(db);
    await assignRoleWithPermissions(db, actor.id, company.id, ['users.list', 'users.create', 'users.show', 'users.update']);
    const target = await createUser(db);
    await addMembership(db, target.id, company.id);
    setSessionUser(actor);

    const show = await UserShowPage(params(company.id, target.id));
    const edit = await UserEditPage(params(company.id, target.id));

    expect(show.props.user.id).toBe(target.id);
    expect(show.props).toMatchObject({ canUpdate: true, canUpdateStatus: false });
    expect(edit.props.children.props.user.id).toBe(target.id);
  });
});
