import type { ClientRow, ClientStatus } from '../models/client.model';
import type { SaleCapacity, SaleStatus } from '@/modules/sale/models/sale.model';
import type { ClientMetrics, ClientPlatform, ClientSaleSummary } from '../repositories/client.repository';

export type ClientPlatformDto = { id: string; name: string; code: string };

export type ClientDto = {
  id: string;
  code: string;
  name: string;
  phone: string | null;
  email: string | null;
  status: ClientStatus;
  notes: string | null;
  createdAt: string;
  updatedAt: string | null;
  /** Services the client has through active sales (listing only). */
  platforms: ClientPlatformDto[];
};

export type ClientSaleDto = {
  id: string;
  code: string;
  status: SaleStatus;
  capacity: SaleCapacity;
  price: number;
  endDate: string;
  serviceName: string;
  profileNumbers: number[];
  accountEmail: string | null;
};

export type ClientMetricsDto = ClientMetrics;

export function toClientDto(row: ClientRow, platforms: ClientPlatform[] = []): ClientDto {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    phone: row.phone,
    email: row.email,
    status: row.status,
    notes: row.notes,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt?.toISOString() ?? null,
    platforms: platforms.map(({ id, name, code }) => ({ id, name, code })),
  };
}

export function toClientSaleDto(sale: ClientSaleSummary): ClientSaleDto {
  return { ...sale, profileNumbers: [...sale.profileNumbers] };
}
