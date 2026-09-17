import { sql } from 'drizzle-orm';
import { db } from '@/db/client';

/** Truncates every app + auth table. Use in `beforeEach` of integration tests. */
export async function resetDb(): Promise<void> {
  await db.execute(
    sql.raw(`TRUNCATE TABLE
      app_bot_messages, app_bot_conversations, app_bot_contacts, app_bot_events,
      app_bot_channels, app_bot_settings, app_knowledge_chunks, app_knowledge_documents,
      app_transactions, app_refunds, app_manual_transaction_lines, app_manual_transactions,
      app_sale_renewals, app_sale_profiles, app_sales, app_account_renewals, app_profiles, app_accounts,
      app_plans, app_services, app_clients, app_leads,
      app_role_permissions, app_roles, user_company, app_companies,
      app_permissions, app_modules, app_menus,
      app_api_tokens, two_factors, verifications, accounts, sessions, users
      RESTART IDENTITY CASCADE`),
  );
}
