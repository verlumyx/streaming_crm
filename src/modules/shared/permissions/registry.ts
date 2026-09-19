import type { ModuleDefinition } from './types';
import { USER_MODULE } from '@/modules/user/permissions';
import { ROLE_MODULE } from '@/modules/role/permissions';
import { COMPANY_MODULE } from '@/modules/company/permissions';
import { CLIENT_MODULE } from '@/modules/client/permissions';
import { SERVICE_MODULE } from '@/modules/service/permissions';
import { PLAN_MODULE } from '@/modules/plan/permissions';
import { ACCOUNT_MODULE } from '@/modules/account/permissions';
import { SALE_MODULE } from '@/modules/sale/permissions';
import { MANUAL_TRANSACTION_MODULE } from '@/modules/manual-transaction/permissions';
import { REFUND_MODULE } from '@/modules/refund/permissions';
import { CLAIM_MODULE } from '@/modules/claim/permissions';
import { REPORT_MODULE } from '@/modules/report/permissions';
import { BOT_MODULE } from '@/modules/bot/permissions';

/** Every module's permission catalogue. Seeded into `app_modules` / `app_permissions` by `pnpm db:seed`. */
export const PERMISSION_REGISTRY: readonly ModuleDefinition[] = [
  USER_MODULE,
  ROLE_MODULE,
  COMPANY_MODULE,
  CLIENT_MODULE,
  SERVICE_MODULE,
  PLAN_MODULE,
  ACCOUNT_MODULE,
  SALE_MODULE,
  MANUAL_TRANSACTION_MODULE,
  REFUND_MODULE,
  CLAIM_MODULE,
  REPORT_MODULE,
  BOT_MODULE,
];

/** Modules gated on `is_system_owner` only: hidden from the roles tree and excluded from `permissionType = 'all'`. */
export const OWNER_ONLY_MODULES = ['companies'] as const;

export const ALL_PERMISSION_ACTIONS: readonly string[] = PERMISSION_REGISTRY.flatMap((m) =>
  m.permissions.map((p) => p.id),
);
