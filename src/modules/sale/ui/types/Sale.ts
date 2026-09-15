import type { SaleSearchFilters } from '@/modules/sale/commands/search-sale.command';

/** Query-string filters of the list (entity type is `SaleDto` from the serializer). */
export type SaleFilters = SaleSearchFilters;

export type SaleMeta = {
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
};

/** `details.unavailableProfiles` of a `conflict` action state. */
export type SaleUnavailableProfile = { id: string; label: string };

export function unavailableProfilesOf(details: Record<string, unknown> | undefined): SaleUnavailableProfile[] {
  const list = details?.unavailableProfiles;
  return Array.isArray(list) ? (list as SaleUnavailableProfile[]) : [];
}
