import type { ClientRow } from '../models/client.model';
import type { SaleCapacity, SaleStatus } from '@/modules/sale/models/sale.model';
import type { CreateClientCommand } from '../commands/create-client.command';
import type { SearchClientCommand } from '../commands/search-client.command';
import type { UpdateClientCommand } from '../commands/update-client.command';
import type { UpdateStatusClientCommand } from '../commands/update-status-client.command';

/** A service the client currently has through an active sale. */
export type ClientPlatform = { id: string; name: string; code: string };

export type ClientMetrics = {
  /** Σ price of active sales. */
  monthlyIncome: number;
  /** Σ price of expired sales (receivable). */
  pendingDebt: number;
  /** Σ price of every sale + Σ price of every renewal. */
  totalPaid: number;
};

/** Active or expired sale of the client, with the profiles it occupies. */
export type ClientSaleSummary = {
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

export interface ClientRepository {
  create(command: CreateClientCommand): Promise<void>;
  findById(id: string, companyId: string): Promise<ClientRow | null>;
  findOrFail(id: string, companyId: string): Promise<ClientRow>;
  update(row: ClientRow, command: UpdateClientCommand): Promise<void>;
  updateStatus(row: ClientRow, command: UpdateStatusClientCommand): Promise<void>;
  search(command: SearchClientCommand): Promise<{ data: ClientRow[]; total: number }>;

  existsByEmail(email: string, companyId: string, ignoreId?: string): Promise<boolean>;
  activePlatformsByClient(clientIds: string[], companyId: string): Promise<Record<string, ClientPlatform[]>>;
  metrics(clientId: string, companyId: string): Promise<ClientMetrics>;
  currentSales(clientId: string, companyId: string): Promise<ClientSaleSummary[]>;
}
