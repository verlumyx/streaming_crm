import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '@/db/client';
import { uuidv7 } from '@/modules/shared/uuid';
import CompanyShowPage from '@/app/[companyId]/companies/[id]/page';
import CompanyEditPage from '@/app/[companyId]/companies/[id]/edit/page';
import { resetDb } from '../../../helpers/reset-db';
import { setSessionUser, expectNotFound } from '../../../helpers/session-mock';
import { createUserWithCompany } from '../../../helpers/company-context';
import { createCompany } from '../../../factories/company.factory';

const params = (companyId: string, id: string) => ({ params: Promise.resolve({ companyId, id }) });

describe('Ver / editar empresa', () => {
  beforeEach(resetDb);

  it('show binds the target company id and not the prefix company id', async () => {
    const { user, company } = await createUserWithCompany(db, { isSystemOwner: true });
    const target = await createCompany(db, { name: 'Target', description: 'Detalle', createdBy: user.id });
    setSessionUser(user);

    const element = await CompanyShowPage(params(company.id, target.id));

    expect(element.props.companyId).toBe(company.id);
    expect(element.props.company).toMatchObject({
      id: target.id,
      name: 'Target',
      description: 'Detalle',
      status: 'active',
    });
  });

  it('edit binds the target company id and not the prefix company id', async () => {
    const { user, company } = await createUserWithCompany(db, { isSystemOwner: true });
    const target = await createCompany(db, { name: 'Target', createdBy: user.id });
    setSessionUser(user);

    const element = await CompanyEditPage(params(company.id, target.id));

    expect(element.props.children.props.company).toMatchObject({ id: target.id, name: 'Target' });
  });

  it('a missing or malformed company id is a 404', async () => {
    const { user, company } = await createUserWithCompany(db, { isSystemOwner: true });
    setSessionUser(user);

    await expectNotFound(CompanyShowPage(params(company.id, uuidv7())));
    await expectNotFound(CompanyShowPage(params(company.id, 'not-a-uuid')));
    await expectNotFound(CompanyEditPage(params(company.id, uuidv7())));
  });
});
