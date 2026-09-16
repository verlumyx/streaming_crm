import 'dotenv/config';
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from '@/db/schema';
import { addDays, todayIsoDate } from '@/lib/format';
import { uuidv7 } from '@/modules/shared/uuid';
import { generateNextCode, lockCompanySequence } from '@/modules/shared/infrastructure/sequential-code';
import { user } from '@/db/auth-schema';
import { clients, CLIENT_CODE_PREFIX } from '@/modules/client/models/client.model';
import { services, SERVICE_CODE_PREFIX } from '@/modules/service/models/service.model';
import { plans, PLAN_CODE_PREFIX } from '@/modules/plan/models/plan.model';
import { sales, SALE_CODE_PREFIX } from '@/modules/sale/models/sale.model';
import { ADMIN } from '../helpers';

export type SaleFixture = { saleId: string; saleCode: string; clientName: string; price: number };

/**
 * Creates an active sale (with its own client, service and plan) directly in the dev database, so refund specs
 * don't depend on the sale wizard. Codes use the app's per-company sequence helpers.
 */
export async function createSaleFixture(companyId: string, opts: { clientName: string; price: number }): Promise<SaleFixture> {
  const sql = postgres(process.env.DATABASE_URL!, { max: 1, prepare: false });
  const db = drizzle(sql, { schema, casing: 'snake_case' });

  try {
    return await db.transaction(async (tx) => {
      const [admin] = await tx.select({ id: user.id }).from(user).where(eq(user.email, ADMIN.email)).limit(1);
      const today = todayIsoDate();
      const suffix = uuidv7().slice(-6);

      const nextCode = async (table: typeof clients | typeof services | typeof plans | typeof sales, prefix: string) => {
        await lockCompanySequence(tx, companyId, prefix);
        return generateNextCode(tx, table, companyId, prefix);
      };

      const clientId = uuidv7();
      await tx.insert(clients).values({
        id: clientId,
        companyId,
        code: await nextCode(clients, CLIENT_CODE_PREFIX),
        name: opts.clientName,
        status: 'active',
      });

      const serviceId = uuidv7();
      await tx.insert(services).values({
        id: serviceId,
        companyId,
        code: await nextCode(services, SERVICE_CODE_PREFIX),
        name: `Servicio E2E ${suffix}`,
        maxProfiles: 1,
        active: true,
      });

      const planId = uuidv7();
      await tx.insert(plans).values({
        id: planId,
        companyId,
        serviceId,
        code: await nextCode(plans, PLAN_CODE_PREFIX),
        name: `Plan E2E ${suffix}`,
        capacity: 'profile',
        durationDays: 30,
        salePrice: opts.price.toFixed(2),
        roiTargetPct: '20.00',
        active: true,
      });

      const saleId = uuidv7();
      const saleCode = await nextCode(sales, SALE_CODE_PREFIX);
      await tx.insert(sales).values({
        id: saleId,
        companyId,
        code: saleCode,
        clientId,
        planId,
        agentId: admin.id,
        serviceId,
        capacity: 'profile',
        durationDays: 30,
        price: opts.price.toFixed(2),
        startDate: today,
        endDate: addDays(today, 30),
        status: 'active',
        approvedAt: new Date(),
        approvedBy: admin.id,
      });

      return { saleId, saleCode, clientName: opts.clientName, price: opts.price };
    });
  } finally {
    await sql.end();
  }
}
