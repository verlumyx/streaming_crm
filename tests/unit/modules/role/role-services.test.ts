import { describe, expect, it } from 'vitest';
import { RoleCreateService } from '@/modules/role/services/role-create.service';
import { RoleFindService } from '@/modules/role/services/role-find.service';
import { RoleUpdateService } from '@/modules/role/services/role-update.service';
import { RoleUpdateStatusService } from '@/modules/role/services/role-update-status.service';
import { RoleActiveListService } from '@/modules/role/services/role-active-list.service';
import { CreateRoleCommand } from '@/modules/role/commands/create-role.command';
import { UpdateRoleCommand } from '@/modules/role/commands/update-role.command';
import { UpdateStatusRoleCommand } from '@/modules/role/commands/update-status-role.command';
import { RoleNotFoundException } from '@/modules/role/exceptions/role-not-found.exception';
import { RoleNameAlreadyExistsException } from '@/modules/role/exceptions/role-name-already-exists.exception';
import { AdministratorRoleNotEditableException } from '@/modules/role/exceptions/administrator-role-not-editable.exception';
import { AdministratorRoleStatusLockedException } from '@/modules/role/exceptions/administrator-role-status-locked.exception';
import { createRoleSchema } from '@/modules/role/validation/create-role.schema';
import { updateRoleSchema } from '@/modules/role/validation/update-role.schema';
import { FakeRoleRepository } from './fake-role.repository';

const COMPANY = '0192f3a0-0000-7000-8000-00000000c001';
const OTHER_COMPANY = '0192f3a0-0000-7000-8000-00000000c002';
const ROLE_1 = '0192f3a0-0000-7000-8000-000000000001';
const ROLE_2 = '0192f3a0-0000-7000-8000-000000000002';

const newRole = (id: string, name: string, companyId = COMPANY) =>
  new CreateRoleCommand(id, companyId, name, null, 'custom', ['clients.list']);

describe('RoleCreateService', () => {
  it('creates an active role with its permissions', async () => {
    const repository = new FakeRoleRepository();

    const role = await new RoleCreateService(repository).execute(newRole(ROLE_1, 'Editor'));

    expect(role).toMatchObject({ status: 'active', companyId: COMPANY, permissions: ['clients.list'] });
  });

  it('rejects a duplicated name in the same company (case-insensitive) but allows it in another', async () => {
    const repository = new FakeRoleRepository();
    const service = new RoleCreateService(repository);
    await service.execute(newRole(ROLE_1, 'Editor'));

    await expect(service.execute(newRole(ROLE_2, 'EDITOR'))).rejects.toBeInstanceOf(RoleNameAlreadyExistsException);
    await expect(service.execute(newRole(ROLE_2, 'Editor', OTHER_COMPANY))).resolves.toMatchObject({
      companyId: OTHER_COMPANY,
    });
  });
});

describe('RoleUpdateService', () => {
  it('replaces the permissions and keeps its own name', async () => {
    const repository = new FakeRoleRepository();
    repository.seed({ id: ROLE_1, companyId: COMPANY, name: 'Editor', permissions: ['clients.list'] });

    const role = await new RoleUpdateService(repository).execute(
      ROLE_1,
      COMPANY,
      new UpdateRoleCommand('Editor', 'desc', 'custom', ['sales.list']),
    );

    expect(role).toMatchObject({ name: 'Editor', description: 'desc', permissions: ['sales.list'] });
  });

  it('refuses to edit the Administrador role', async () => {
    const repository = new FakeRoleRepository();
    repository.seed({ id: ROLE_1, companyId: COMPANY, name: 'Administrador', permissionType: 'all' });

    await expect(
      new RoleUpdateService(repository).execute(ROLE_1, COMPANY, new UpdateRoleCommand('Hacked', null, 'custom', [])),
    ).rejects.toBeInstanceOf(AdministratorRoleNotEditableException);
    expect(repository.rows[0]).toMatchObject({ name: 'Administrador', permissionType: 'all' });
  });

  it('rejects another role name and a role of another company', async () => {
    const repository = new FakeRoleRepository();
    repository.seed({ id: ROLE_1, companyId: COMPANY, name: 'Editor' });
    repository.seed({ id: ROLE_2, companyId: COMPANY, name: 'Viewer' });
    const service = new RoleUpdateService(repository);

    await expect(service.execute(ROLE_2, COMPANY, new UpdateRoleCommand('editor', null, 'custom', []))).rejects.toBeInstanceOf(
      RoleNameAlreadyExistsException,
    );
    await expect(service.execute(ROLE_1, OTHER_COMPANY, new UpdateRoleCommand('X', null, 'custom', []))).rejects.toBeInstanceOf(
      RoleNotFoundException,
    );
  });
});

describe('RoleUpdateStatusService / RoleFindService / RoleActiveListService', () => {
  it('changes the status of a regular role', async () => {
    const repository = new FakeRoleRepository();
    repository.seed({ id: ROLE_1, companyId: COMPANY, name: 'Editor' });

    const role = await new RoleUpdateStatusService(repository).execute(ROLE_1, COMPANY, new UpdateStatusRoleCommand('inactive'));

    expect(role.status).toBe('inactive');
  });

  it('refuses to change the Administrador role status', async () => {
    const repository = new FakeRoleRepository();
    repository.seed({ id: ROLE_1, companyId: COMPANY, name: 'Administrador', permissionType: 'all' });

    await expect(
      new RoleUpdateStatusService(repository).execute(ROLE_1, COMPANY, new UpdateStatusRoleCommand('inactive')),
    ).rejects.toBeInstanceOf(AdministratorRoleStatusLockedException);
    expect(repository.rows[0].status).toBe('active');
  });

  it('finds only roles of the company and lists the active ones by name', async () => {
    const repository = new FakeRoleRepository();
    repository.seed({ id: ROLE_1, companyId: COMPANY, name: 'Zeta' });
    repository.seed({ id: ROLE_2, companyId: COMPANY, name: 'Alfa', status: 'inactive' });
    repository.seed({ id: '0192f3a0-0000-7000-8000-000000000003', companyId: COMPANY, name: 'Beta' });

    await expect(new RoleFindService(repository).execute(ROLE_1, OTHER_COMPANY)).rejects.toBeInstanceOf(RoleNotFoundException);
    expect((await new RoleActiveListService(repository).execute(COMPANY)).map((r) => r.name)).toEqual(['Beta', 'Zeta']);
  });
});

describe('role schemas', () => {
  it('parses the JSON permissions, removes duplicates and clears them for all roles', () => {
    const custom = createRoleSchema.parse({
      id: ROLE_1,
      name: ' Editor ',
      description: '',
      permissions: JSON.stringify(['clients.list', 'clients.list', 'roles.list']),
    });
    const all = updateRoleSchema.parse({ name: 'Todo', permissionType: 'all', permissions: '["clients.list"]' });

    expect(custom).toMatchObject({ name: 'Editor', description: null, permissionType: 'custom', permissions: ['clients.list', 'roles.list'] });
    expect(all.permissions).toEqual([]);
  });

  it('rejects owner-only and unknown permissions', () => {
    expect(updateRoleSchema.safeParse({ name: 'X', permissions: '["companies.create"]' }).success).toBe(false);
    expect(updateRoleSchema.safeParse({ name: 'X', permissions: '["foo.bar"]' }).success).toBe(false);
  });
});
