import type { ClaimChannel, ClaimStatus } from '../models/claim.model';
import type { ClaimClientOption, ClaimClientRef, ClaimDetail, ClaimListItem, ClaimUserRef } from '../repositories/claim.repository';

export type ClaimListItemDto = {
  id: string;
  code: string;
  clientId: string;
  client: ClaimClientRef | null;
  subject: string;
  channel: ClaimChannel;
  status: ClaimStatus;
  /** `closed` es terminal: la UI oculta editar y cambiar estado. */
  isClosed: boolean;
  resolvedAt: string | null;
  createdAt: string;
  updatedAt: string | null;
};

export type ClaimDto = ClaimListItemDto & {
  description: string;
  resolutionNotes: string | null;
  reportedByUser: ClaimUserRef;
  resolvedByUser: ClaimUserRef;
};

export type ClaimClientOptionDto = { id: string; name: string; code: string; isActive: boolean };

export function toClaimListItemDto(row: ClaimListItem): ClaimListItemDto {
  return {
    id: row.id,
    code: row.code,
    clientId: row.clientId,
    client: row.client,
    subject: row.subject,
    channel: row.channel,
    status: row.status,
    isClosed: row.status === 'closed',
    resolvedAt: row.resolvedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt?.toISOString() ?? null,
  };
}

export function toClaimDto(row: ClaimDetail): ClaimDto {
  return {
    ...toClaimListItemDto(row),
    description: row.description,
    resolutionNotes: row.resolutionNotes,
    reportedByUser: row.reportedByUser,
    resolvedByUser: row.resolvedByUser,
  };
}

export function toClaimClientOptionDto(row: ClaimClientOption): ClaimClientOptionDto {
  return { id: row.id, name: row.name, code: row.code, isActive: row.status === 'active' };
}
