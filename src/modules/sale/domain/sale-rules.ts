import { addDays, addMonths, diffInDays } from '@/lib/format';
import type { SaleCapacity, SaleStatus } from '../models/sale.model';
import type { ProfileStatus } from '@/modules/account/models/account.model';

/**
 * Pure business rules of a sale. They never read the clock or the config:
 * `today` (ISO date) and `graceDays` are always passed by the caller.
 */
export type SaleRuleSubject = { status: SaleStatus; endDate: string };

export type SaleRuleContext = { today: string; graceDays: number };

/** Expired, but `endDate + graceDays` has not passed yet: still renewable and keeps its profiles. */
export function isInGracePeriod(sale: SaleRuleSubject, today: string, graceDays: number): boolean {
  return sale.status === 'expired' && addDays(sale.endDate, graceDays) >= today;
}

/** Por aprobar: the payment has not been verified yet (no profiles occupied, no ledger entry). */
export function canBeApproved(sale: Pick<SaleRuleSubject, 'status'>): boolean {
  return sale.status === 'pending';
}

/** Expulsar applies only to approved sales still in their cycle. */
export function canBeCancelled(sale: Pick<SaleRuleSubject, 'status'>): boolean {
  return sale.status === 'active' || sale.status === 'expired';
}

/** Renewable when active, or expired within the grace period. */
export function canBeRenewed(sale: SaleRuleSubject, today: string, graceDays: number): boolean {
  return sale.status === 'active' || isInGracePeriod(sale, today, graceDays);
}

/** Reactivable when cancelled, or expired beyond the grace period. */
export function canBeReactivated(sale: SaleRuleSubject, today: string, graceDays: number): boolean {
  if (sale.status === 'cancelled') return true;
  return sale.status === 'expired' && !isInGracePeriod(sale, today, graceDays);
}

/** Signed days from `today` to `endDate` (negative once expired). */
export function daysUntilExpiration(sale: SaleRuleSubject, today: string): number {
  return diffInDays(today, sale.endDate);
}

/** A 30-day duration is a calendar month: it renews on the same day of the next month. */
export const MONTHLY_DURATION_DAYS = 30;

/**
 * End (renewal) date of a period starting on `fromDate`. 30 days → same day of the next month, or the last day
 * of that month when it is shorter (31 → 30, 29/30/31 of January → end of February); other durations add days.
 */
export function saleEndDate(fromDate: string, durationDays: number): string {
  return durationDays === MONTHLY_DURATION_DAYS ? addMonths(fromDate, 1) : addDays(fromDate, durationDays);
}

/** Profiles a sale must occupy: 1 per `profile` sale, every profile of the account for `full_account`. */
export function requiredProfileCount(capacity: SaleCapacity, maxProfiles: number): number {
  return capacity === 'full_account' ? maxProfiles : 1;
}

/** A profile row locked for assignment, with the account it belongs to. */
export type LockedProfile = {
  id: string;
  number: number;
  status: ProfileStatus;
  accountId: string;
  accountEmail: string;
  accountCompanyId: string;
  accountServiceId: string;
  /** The profile is linked to the sale being processed (reactivation). */
  linkedToSale: boolean;
  /** Another approved, non-cancelled sale linked this profile after this one (it is really held by someone else). */
  heldByAnotherSale: boolean;
  /**
   * A recent `pending` sale (not this one) already asked for this profile. Approving that one will
   * occupy it, so selling it again would oversell the inventory.
   */
  reservedByPendingSale: boolean;
};

export type ProfileTarget = {
  companyId: string;
  serviceId: string;
  capacity: SaleCapacity;
  maxProfiles: number;
};

/**
 * Coherence of the requested profiles against a plan / sale snapshot.
 * Returns the Spanish error message, or `null` when coherent. Availability is checked separately.
 */
export function profileCoherenceError(
  requestedIds: readonly string[],
  profiles: readonly LockedProfile[],
  target: ProfileTarget,
): string | null {
  const uniqueIds = new Set(requestedIds);
  if (uniqueIds.size === 0) return 'Selecciona al menos un perfil.';
  if (uniqueIds.size !== requestedIds.length || profiles.length !== uniqueIds.size) {
    return 'Uno o más perfiles no existen.';
  }

  const foreign = profiles.some(
    (p) => p.accountCompanyId !== target.companyId || p.accountServiceId !== target.serviceId,
  );
  if (foreign) return 'Todos los perfiles deben pertenecer a cuentas del servicio del plan seleccionado.';

  if (target.capacity === 'profile' && profiles.length !== 1) {
    return 'Un plan de capacidad "perfil" requiere exactamente 1 perfil.';
  }

  if (target.capacity === 'full_account') {
    if (profiles.length !== target.maxProfiles) {
      return `Un plan de cuenta completa requiere exactamente ${target.maxProfiles} perfiles.`;
    }
    if (new Set(profiles.map((p) => p.accountId)).size > 1) {
      return 'Todos los perfiles de una cuenta completa deben pertenecer a la misma cuenta.';
    }
  }

  return null;
}

export type UnavailableProfile = { id: string; label: string };

/**
 * Profiles that cannot be assigned.
 *
 * `available` passes, unless another recent `pending` sale already committed the profile — that is
 * what stops two customers from paying for the same one. Approval passes `allowPendingReservation`
 * because there the race is already decided by `occupied`: whoever approves first takes it and the
 * other approval then legitimately conflicts.
 *
 * With `allowOwnOccupied` (reactivation), a profile still occupied by THIS sale — linked to it and
 * not held by a newer active/expired sale — passes too.
 */
export function unavailableProfiles(
  profiles: readonly LockedProfile[],
  options: { allowOwnOccupied?: boolean; allowPendingReservation?: boolean } = {},
): UnavailableProfile[] {
  return profiles
    .filter((p) => {
      if (p.reservedByPendingSale && !options.allowPendingReservation) return true;
      if (p.status === 'available') return false;
      const ownOccupied = p.status === 'occupied' && p.linkedToSale && !p.heldByAnotherSale;
      return !(options.allowOwnOccupied && ownOccupied);
    })
    .map((p) => ({ id: p.id, label: profileLabel(p.accountEmail, p.number) }));
}

/** `cuenta@x.com · Perfil 2`. */
export function profileLabel(accountEmail: string | null, number: number): string {
  return `${accountEmail ?? '—'} · Perfil ${number}`;
}
