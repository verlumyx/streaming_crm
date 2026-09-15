import { beforeEach, describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import { db } from '@/db/client';
import { companies } from '@/modules/company/models/company.model';
import { initialActionState } from '@/modules/shared/actions/action-state';
import { uuidv7 } from '@/modules/shared/uuid';
import CompaniesPage from '@/app/[companyId]/companies/page';
import CompanyCreatePage from '@/app/[companyId]/companies/create/page';
import CompanyShowPage from '@/app/[companyId]/companies/[id]/page';
import CompanyEditPage from '@/app/[companyId]/companies/[id]/edit/page';
import {
  createCompanyAction,
  updateCompanyAction,
  updateCompanyStatusAction,
} from '@/app/[companyId]/companies/actions';
import { resetDb } from '../../../helpers/reset-db';
import { setSessionUser, expectRedirect } from '../../../helpers/session-mock';
import { createUserWithCompany } from '../../../helpers/company-context';
import { formData } from '../../../helpers/form-data';

const FORBIDDEN = 'No tienes permiso para acceder a esta sección.';

/**
 * The Companies module is exclusive to the system owner (`users.is_system_owner`).
 * It is NOT managed by role permissions: even a role with `permissionType = 'all'` is blocked.
 */
describe('Empresas: acceso exclusivo del dueño del sistema', () => {
  beforeEach(resetDb);

  it('a non owner with a full access role cannot open any company page', async () => {
    const { user, company, role } = await createUserWithCompany(db);
    expect(role.permissionType).toBe('all');
    setSessionUser(user);
    const forbidden = `/${company.id}/dashboard?error=forbidden`;

    await expectRedirect(
      CompaniesPage({
        params: Promise.resolve({ companyId: company.id }),
        searchParams: Promise.resolve({}),
      }),
      forbidden,
    );
    await expectRedirect(
      CompanyCreatePage({ params: Promise.resolve({ companyId: company.id }) }),
      forbidden,
    );
    await expectRedirect(
      CompanyShowPage({ params: Promise.resolve({ companyId: company.id, id: company.id }) }),
      forbidden,
    );
    await expectRedirect(
      CompanyEditPage({ params: Promise.resolve({ companyId: company.id, id: company.id }) }),
      forbidden,
    );
  });

  it('a non owner cannot store a company', async () => {
    const { user, company } = await createUserWithCompany(db);
    setSessionUser(user);

    const result = await createCompanyAction(
      company.id,
      initialActionState,
      formData({ id: uuidv7(), name: 'Blocked Company' }),
    );

    expect(result).toMatchObject({ status: 'error', message: FORBIDDEN });
    expect(await db.select().from(companies).where(eq(companies.name, 'Blocked Company'))).toHaveLength(0);
  });

  it('a non owner cannot update a company', async () => {
    const { user, company } = await createUserWithCompany(db);
    setSessionUser(user);

    const result = await updateCompanyAction(
      company.id,
      company.id,
      initialActionState,
      formData({ name: 'Renamed' }),
    );

    expect(result).toMatchObject({ status: 'error', message: FORBIDDEN });
    const [row] = await db.select().from(companies).where(eq(companies.id, company.id));
    expect(row.name).toBe(company.name);
  });

  it('a non owner cannot update company status', async () => {
    const { user, company } = await createUserWithCompany(db);
    setSessionUser(user);

    const result = await updateCompanyStatusAction(company.id, company.id, 'inactive');

    expect(result).toMatchObject({ status: 'error', message: FORBIDDEN });
    const [row] = await db.select().from(companies).where(eq(companies.id, company.id));
    expect(row.status).toBe('active');
  });

  it('a guest is blocked too', async () => {
    const { company } = await createUserWithCompany(db);
    setSessionUser(null);

    const result = await updateCompanyStatusAction(company.id, company.id, 'inactive');

    expect(result).toMatchObject({ status: 'error', message: FORBIDDEN });
  });

  it('a system owner can access every company view', async () => {
    const { user, company } = await createUserWithCompany(db, { isSystemOwner: true });
    setSessionUser(user);

    const index = await CompaniesPage({
      params: Promise.resolve({ companyId: company.id }),
      searchParams: Promise.resolve({}),
    });
    const create = await CompanyCreatePage({ params: Promise.resolve({ companyId: company.id }) });
    const show = await CompanyShowPage({
      params: Promise.resolve({ companyId: company.id, id: company.id }),
    });
    const edit = await CompanyEditPage({
      params: Promise.resolve({ companyId: company.id, id: company.id }),
    });

    expect(index.props.companies).toHaveLength(1);
    expect(create.props.children.props.companyId).toBe(company.id);
    expect(show.props.company.id).toBe(company.id);
    expect(edit.props.children.props.company.id).toBe(company.id);
  });

  it('a system owner can open an inactive company in the list', async () => {
    const { user, company } = await createUserWithCompany(db, {
      isSystemOwner: true,
      companyStatus: 'inactive',
    });
    setSessionUser(user);

    const index = await CompaniesPage({
      params: Promise.resolve({ companyId: company.id }),
      searchParams: Promise.resolve({}),
    });

    expect(index.props.companies.map((c: { id: string }) => c.id)).toContain(company.id);
  });
});
