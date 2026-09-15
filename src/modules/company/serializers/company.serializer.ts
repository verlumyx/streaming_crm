import type { CompanyRow, CompanyStatus } from '../models/company.model';

export type CompanyDto = {
  id: string;
  name: string;
  status: CompanyStatus;
  description: string | null;
  createdAt: string;
  updatedAt: string | null;
};

export function toCompanyDto(row: CompanyRow): CompanyDto {
  return {
    id: row.id,
    name: row.name,
    status: row.status,
    description: row.description,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt?.toISOString() ?? null,
  };
}
