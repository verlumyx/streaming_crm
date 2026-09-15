import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '@/db/client';
import { uuidv7 } from '@/modules/shared/uuid';
import ServiceShowPage from '@/app/[companyId]/services/[id]/page';
import { resetDb } from '../../../helpers/reset-db';
import { setSessionUser, expectNotFound, expectRedirect } from '../../../helpers/session-mock';
import { assignRoleWithPermissions, createUserWithCompany } from '../../../helpers/company-context';
import { createService } from '../../../factories/catalog.factory';
import { createCompany } from '../../../factories/company.factory';

const params = (companyId: string, id: string) => ({ params: Promise.resolve({ companyId, id }) });

describe('Ver servicio', () => {
  beforeEach(resetDb);

  it('the service show page renders read-only', async () => {
    const { user, company } = await createUserWithCompany(db);
    const service = await createService(db, { companyId: company.id, name: 'Netflix', maxProfiles: 5 });
    setSessionUser(user);

    const element = await ServiceShowPage(params(company.id, service.id));

    expect(element.props.service).toMatchObject({ id: service.id, name: 'Netflix', code: service.code, maxProfiles: 5 });
    expect(Object.keys(element.props).sort()).toEqual(['companyId', 'service']);
  });

  it('a user with only services.show can view a service', async () => {
    const { user, company } = await createUserWithCompany(db);
    const service = await createService(db, { companyId: company.id });
    await assignRoleWithPermissions(db, user.id, company.id, ['services.show']);
    setSessionUser(user);

    const element = await ServiceShowPage(params(company.id, service.id));

    expect(element.props.service).toMatchObject({ id: service.id });
  });

  it('showing a missing service is a 404', async () => {
    const { user, company } = await createUserWithCompany(db);
    setSessionUser(user);

    await expectNotFound(ServiceShowPage(params(company.id, uuidv7())));
    await expectNotFound(ServiceShowPage(params(company.id, 'not-a-uuid')));
  });

  it('a service from another company cannot be viewed', async () => {
    const { user, company } = await createUserWithCompany(db);
    const foreign = await createService(db, { companyId: (await createCompany(db)).id });
    setSessionUser(user);

    await expectNotFound(ServiceShowPage(params(company.id, foreign.id)));
  });

  it('a user without permission cannot see a service', async () => {
    const { user, company } = await createUserWithCompany(db);
    const service = await createService(db, { companyId: company.id });
    await assignRoleWithPermissions(db, user.id, company.id, ['services.list']);
    setSessionUser(user);

    await expectRedirect(ServiceShowPage(params(company.id, service.id)), `/${company.id}/dashboard?error=forbidden`);
  });
});
