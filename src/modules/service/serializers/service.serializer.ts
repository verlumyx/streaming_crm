import type { ServiceRow } from '../models/service.model';

export type ServiceDto = {
  id: string;
  code: string;
  name: string;
  logoUrl: string | null;
  maxProfiles: number;
  active: boolean;
  createdAt: string;
  updatedAt: string | null;
};

/** Minimal shape for selects in other modules (plan form). */
export type ServiceOptionDto = {
  id: string;
  code: string;
  name: string;
  maxProfiles: number;
};

export function toServiceDto(row: ServiceRow): ServiceDto {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    logoUrl: row.logoUrl,
    maxProfiles: row.maxProfiles,
    active: row.active,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt?.toISOString() ?? null,
  };
}

export function toServiceOptionDto(row: Pick<ServiceRow, 'id' | 'code' | 'name' | 'maxProfiles'>): ServiceOptionDto {
  return { id: row.id, code: row.code, name: row.name, maxProfiles: row.maxProfiles };
}
