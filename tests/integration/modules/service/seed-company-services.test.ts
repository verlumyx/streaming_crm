import { beforeEach, describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import { db } from '@/db/client';
import { streamingConfig } from '@/config/streaming';
import { services } from '@/modules/service/models/service.model';
import { SeedCompanyServicesService } from '@/modules/service/services/seed-company-services.service';
import { resetDb } from '../../../helpers/reset-db';
import { createCompany } from '../../../factories/company.factory';

describe('Precarga del catálogo de servicios', () => {
  beforeEach(resetDb);

  it('preloads the streaming catalogue into a company with sequential codes and logos', async () => {
    const company = await createCompany(db);

    await db.transaction((tx) => new SeedCompanyServicesService(tx).execute(company.id));

    const rows = await db.select().from(services).where(eq(services.companyId, company.id));
    expect(rows).toHaveLength(streamingConfig.defaultServices.length);
    expect(rows.map((r) => r.code).sort()[0]).toBe('SER000001');

    const netflix = rows.find((r) => r.name === 'Netflix');
    expect(netflix).toMatchObject({ maxProfiles: 5, active: true, logoUrl: '/images/streaming/netflix.svg' });
  });

  it('preloaded services are scoped to that company only', async () => {
    const company = await createCompany(db);
    const other = await createCompany(db);

    await db.transaction((tx) => new SeedCompanyServicesService(tx).execute(company.id));

    expect(await db.select().from(services).where(eq(services.companyId, other.id))).toHaveLength(0);
  });
});
