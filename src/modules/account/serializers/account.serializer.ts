import type {
  AccountRenewalRow,
  AccountRenewalType,
  AccountRow,
  AccountStatus,
  ProfileRow,
  ProfileStatus,
} from '../models/account.model';
import type { AccountListItem, AccountServiceRef, ProfilesSummary } from '../repositories/account.repository';

export type AccountServiceDto = { id: string; code: string; name: string; maxProfiles: number };

export type ProfilesSummaryDto = ProfilesSummary;

/** Never carries the password (encrypted or not): credentials only travel through `revealAccountCredentialsAction`. */
export type AccountDto = {
  id: string;
  code: string;
  serviceId: string;
  service: AccountServiceDto;
  email: string;
  cost: number;
  purchaseDate: string;
  nextRenewal: string;
  status: AccountStatus;
  notes: string | null;
  profilesSummary: ProfilesSummaryDto;
  createdAt: string;
  updatedAt: string | null;
};

export type ProfileDto = {
  id: string;
  number: number;
  pin: string | null;
  status: ProfileStatus;
  notes: string | null;
};

export type AccountRenewalDto = {
  id: string;
  type: AccountRenewalType;
  amount: number;
  periodStart: string;
  periodEnd: string;
  paidAt: string;
  notes: string | null;
  createdAt: string;
};

export function summarizeProfiles(rows: Pick<ProfileRow, 'status'>[]): ProfilesSummaryDto {
  return {
    total: rows.length,
    available: rows.filter((p) => p.status === 'available').length,
    occupied: rows.filter((p) => p.status === 'occupied').length,
    maintenance: rows.filter((p) => p.status === 'maintenance').length,
  };
}

export function toAccountDto(row: AccountRow, service: AccountServiceRef, profilesSummary: ProfilesSummary): AccountDto {
  return {
    id: row.id,
    code: row.code,
    serviceId: row.serviceId,
    service: { id: service.id, code: service.code, name: service.name, maxProfiles: service.maxProfiles },
    email: row.email,
    cost: Number(row.cost),
    purchaseDate: row.purchaseDate,
    nextRenewal: row.nextRenewal,
    status: row.status,
    notes: row.notes,
    profilesSummary: { ...profilesSummary },
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt?.toISOString() ?? null,
  };
}

export function toAccountListItemDto(item: AccountListItem): AccountDto {
  return toAccountDto(item.account, item.service, item.profilesSummary);
}

export function toProfileDto(row: ProfileRow): ProfileDto {
  return { id: row.id, number: row.number, pin: row.pin, status: row.status, notes: row.notes };
}

export function toAccountRenewalDto(row: AccountRenewalRow): AccountRenewalDto {
  return {
    id: row.id,
    type: row.type,
    amount: Number(row.amount),
    periodStart: row.periodStart,
    periodEnd: row.periodEnd,
    paidAt: row.paidAt,
    notes: row.notes,
    createdAt: row.createdAt.toISOString(),
  };
}
