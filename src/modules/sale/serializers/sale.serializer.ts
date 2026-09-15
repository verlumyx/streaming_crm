import type { SaleCapacity, SaleRenewalRow, SaleStatus } from '../models/sale.model';
import type { ProfileStatus } from '@/modules/account/models/account.model';
import type { ClientStatus } from '@/modules/client/models/client.model';
import type { TransactionCategory, TransactionRow, TransactionType } from '@/modules/transaction/models/transaction.model';
import {
  canBeReactivated,
  canBeRenewed,
  daysUntilExpiration,
  isInGracePeriod,
  type SaleRuleContext,
} from '../domain/sale-rules';
import type {
  SaleAgentOption,
  SaleAvailableProfile,
  SaleClientOption,
  SaleDetail,
  SaleListItem,
  SalePlanOption,
  SaleProfileItem,
  SaleServiceOption,
} from '../repositories/sale.repository';
import type { SaleOverview } from '../services/sale-find.service';

export type SaleDto = {
  id: string;
  code: string;
  clientId: string;
  planId: string;
  serviceId: string;
  agentId: string;
  capacity: SaleCapacity;
  /** Snapshot taken from the plan when the sale was created (or reactivated). */
  durationDays: number;
  price: number;
  startDate: string;
  endDate: string;
  status: SaleStatus;
  cancelledAt: string | null;
  cancellationReason: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string | null;
  client: { id: string; name: string; code: string } | null;
  /** CURRENT plan values (used to pre-fill the renewal dialog). */
  plan: { id: string; name: string; code: string; durationDays: number; salePrice: number } | null;
  service: { id: string; name: string; code: string } | null;
  agent: { id: string; name: string } | null;
  isInGracePeriod: boolean;
  canBeRenewed: boolean;
  canBeReactivated: boolean;
  daysUntilExpiration: number;
};

export type SaleProfileDto = {
  id: string;
  profileId: string;
  number: number;
  profileStatus: ProfileStatus;
  account: { id: string; code: string; email: string };
  createdAt: string;
};

export type SaleRenewalDto = {
  id: string;
  renewedAt: string;
  previousEndDate: string;
  newEndDate: string;
  durationDays: number;
  price: number;
  renewedBy: string | null;
  notes: string | null;
  createdAt: string;
};

export type SaleTransactionDto = {
  id: string;
  type: TransactionType;
  category: TransactionCategory;
  amount: number;
  date: string;
  description: string;
};

export type SaleDetailDto = SaleDto & {
  saleProfiles: SaleProfileDto[];
  renewals: SaleRenewalDto[];
  transactions: SaleTransactionDto[];
  /** Profiles a replacement must pick (1, or the service max for a full account). */
  requiredProfileCount: number;
};

export type SaleClientOptionDto = { id: string; name: string; code: string; status: ClientStatus };
export type SaleServiceOptionDto = SaleServiceOption;
export type SaleAgentOptionDto = SaleAgentOption;
export type SalePlanOptionDto = Omit<SalePlanOption, 'salePrice'> & { salePrice: number };
export type SaleAvailableProfileDto = SaleAvailableProfile;

export function toSaleDto(item: SaleListItem, context: SaleRuleContext): SaleDto {
  return {
    id: item.id,
    code: item.code,
    clientId: item.clientId,
    planId: item.planId,
    serviceId: item.serviceId,
    agentId: item.agentId,
    capacity: item.capacity,
    durationDays: item.durationDays,
    price: Number(item.price),
    startDate: item.startDate,
    endDate: item.endDate,
    status: item.status,
    cancelledAt: item.cancelledAt?.toISOString() ?? null,
    cancellationReason: item.cancellationReason,
    notes: item.notes,
    createdAt: item.createdAt.toISOString(),
    updatedAt: item.updatedAt?.toISOString() ?? null,
    client: item.client ? { id: item.client.id, name: item.client.name, code: item.client.code } : null,
    plan: item.plan
      ? {
          id: item.plan.id,
          name: item.plan.name,
          code: item.plan.code,
          durationDays: item.plan.durationDays,
          salePrice: Number(item.plan.salePrice),
        }
      : null,
    service: item.service ? { id: item.service.id, name: item.service.name, code: item.service.code } : null,
    agent: item.agent ? { id: item.agent.id, name: item.agent.name } : null,
    isInGracePeriod: isInGracePeriod(item, context.today, context.graceDays),
    canBeRenewed: canBeRenewed(item, context.today, context.graceDays),
    canBeReactivated: canBeReactivated(item, context.today, context.graceDays),
    daysUntilExpiration: daysUntilExpiration(item, context.today),
  };
}

function toSaleProfileDto(row: SaleProfileItem): SaleProfileDto {
  return { ...row, account: { ...row.account }, createdAt: row.createdAt.toISOString() };
}

function toSaleRenewalDto(row: SaleRenewalRow): SaleRenewalDto {
  return {
    id: row.id,
    renewedAt: row.renewedAt,
    previousEndDate: row.previousEndDate,
    newEndDate: row.newEndDate,
    durationDays: row.durationDays,
    price: Number(row.price),
    renewedBy: row.renewedBy,
    notes: row.notes,
    createdAt: row.createdAt.toISOString(),
  };
}

function toSaleTransactionDto(row: TransactionRow): SaleTransactionDto {
  return {
    id: row.id,
    type: row.type,
    category: row.category,
    amount: Number(row.amount),
    date: row.date,
    description: row.description,
  };
}

export function toSaleDetailDto(overview: SaleOverview, context: SaleRuleContext): SaleDetailDto {
  const sale: SaleDetail = overview.sale;
  return {
    ...toSaleDto(sale, context),
    saleProfiles: sale.saleProfiles.map(toSaleProfileDto),
    renewals: sale.renewals.map(toSaleRenewalDto),
    transactions: overview.transactions.map(toSaleTransactionDto),
    requiredProfileCount: overview.requiredProfileCount,
  };
}

export function toSaleClientOptionDto(row: SaleClientOption): SaleClientOptionDto {
  return { id: row.id, name: row.name, code: row.code, status: row.status };
}

export function toSalePlanOptionDto(row: SalePlanOption): SalePlanOptionDto {
  return { ...row, salePrice: Number(row.salePrice) };
}

export function toSaleAvailableProfileDto(row: SaleAvailableProfile): SaleAvailableProfileDto {
  return { ...row };
}
