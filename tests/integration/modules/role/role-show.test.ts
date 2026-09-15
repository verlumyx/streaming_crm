import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '@/db/client';
import { uuidv7 } from '@/modules/shared/uuid';
import RoleShowPage from '@/app/[companyId]/roles/[id]/page';
import RoleEditPage from '@/app/[companyId]/roles/[id]/edit/page';
import { resetDb } from '../../../helpers/reset-db';
import { setSessionUser, expectNotFound, expectRedirect } from '../../../helpers/session-mock';
import { assignRoleWithPermissions, createUserWithCompany } from '../../../helpers/company-context';
import { createCompany } from '../../../factories/company.factory';
import { createRole } from '../../../factories/role.factory';

const params = (companyId: string, id: string) => ({ params: Promise.resolve({ companyId, id }) });

describe('Ver rol', () => {
  beforeEach(resetDb);

  it('roles.show binds the role id and exposes its granted permissions', async () => {
    const { user, company } = await createUserWithCompany(db);
    const role = await createRole(db, { companyId: company.id, name: 'Vendedor' }, ['sales.list', 'clients.list']);
    setSessionUser(user);

    const element = await RoleShowPage(params(company.id, role.id));

    expect(company.id).not.toBe(role.id);
    expect(element.props.role).toMatchObject({
      id: role.id,
      name: 'Vendedor',
      permissions: ['clients.list', 'sales.list'],
      isAdministrator: false,
    });
    expect(element.props).toMatchObject({ canUpdate: true, canUpdateStatus: true, modules: expect.any(Array) });
  });

  it('roles.edit binds the role id and not the company id', async () => {
    const { user, company } = await createUserWithCompany(db);
    const role = await createRole(db, { companyId: company.id });
    setSessionUser(user);

    const element = await RoleEditPage(params(company.id, role.id));

    expect(element.props.children.props.role).toMatchObject({ id: role.id });
  });

  it('the Administrador edit page renders flagged as administrator', async () => {
    const { user, company, role } = await createUserWithCompany(db);
    setSessionUser(user);

    const element = await RoleEditPage(params(company.id, role.id));

    expect(element.props.children.props.role).toMatchObject({ name: 'Administrador', isAdministrator: true });
  });

  it('showing a missing role is a 404', async () => {
    const { user, company } = await createUserWithCompany(db);
    setSessionUser(user);

    await expectNotFound(RoleShowPage(params(company.id, uuidv7())));
    await expectNotFound(RoleShowPage(params(company.id, 'not-a-uuid')));
    await expectNotFound(RoleEditPage(params(company.id, uuidv7())));
  });

  it('a role from another company is a 404', async () => {
    const { user, company } = await createUserWithCompany(db);
    const foreign = await createRole(db, { companyId: (await createCompany(db)).id });
    setSessionUser(user);

    await expectNotFound(RoleShowPage(params(company.id, foreign.id)));
    await expectNotFound(RoleEditPage(params(company.id, foreign.id)));
  });

  it('a user without roles.show / roles.update cannot open the show and edit views', async () => {
    const { user, company } = await createUserWithCompany(db);
    await assignRoleWithPermissions(db, user.id, company.id, ['roles.list']);
    const role = await createRole(db, { companyId: company.id });
    setSessionUser(user);

    await expectRedirect(RoleShowPage(params(company.id, role.id)), `/${company.id}/dashboard?error=forbidden`);
    await expectRedirect(RoleEditPage(params(company.id, role.id)), `/${company.id}/dashboard?error=forbidden`);
  });

  it('granting the matching permissions allows access to each view', async () => {
    const { user, company } = await createUserWithCompany(db);
    await assignRoleWithPermissions(db, user.id, company.id, ['roles.list', 'roles.create', 'roles.show', 'roles.update']);
    const role = await createRole(db, { companyId: company.id });
    setSessionUser(user);

    const show = await RoleShowPage(params(company.id, role.id));
    const edit = await RoleEditPage(params(company.id, role.id));

    expect(show.props.role.id).toBe(role.id);
    expect(show.props).toMatchObject({ canUpdate: true, canUpdateStatus: false });
    expect(edit.props.children.props.role.id).toBe(role.id);
  });
});
