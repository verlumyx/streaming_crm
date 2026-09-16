import { describe, expect, it } from 'vitest';
import {
  canBeApproved,
  canBeCancelled,
  canBeReactivated,
  canBeRenewed,
  daysUntilExpiration,
  isInGracePeriod,
  profileCoherenceError,
  profileLabel,
  requiredProfileCount,
  saleEndDate,
  unavailableProfiles,
  type LockedProfile,
} from '@/modules/sale/domain/sale-rules';

const TODAY = '2026-09-14';
const GRACE = 3;

const profile = (overrides: Partial<LockedProfile> = {}): LockedProfile => ({
  id: 'p1',
  number: 1,
  status: 'available',
  accountId: 'a1',
  accountEmail: 'cuenta@x.com',
  accountCompanyId: 'c1',
  accountServiceId: 's1',
  linkedToSale: false,
  heldByAnotherSale: false,
  ...overrides,
});

describe('sale rules: approval and expulsion', () => {
  it('only a pending sale can be approved or rejected', () => {
    expect(canBeApproved({ status: 'pending' })).toBe(true);
    for (const status of ['active', 'expired', 'cancelled', 'rejected'] as const) {
      expect(canBeApproved({ status })).toBe(false);
    }
  });

  it('only approved sales still in their cycle can be expelled', () => {
    expect(canBeCancelled({ status: 'active' })).toBe(true);
    expect(canBeCancelled({ status: 'expired' })).toBe(true);
    for (const status of ['pending', 'cancelled', 'rejected'] as const) {
      expect(canBeCancelled({ status })).toBe(false);
    }
  });

  it('pending and rejected sales are neither renewable nor reactivable', () => {
    for (const status of ['pending', 'rejected'] as const) {
      expect(canBeRenewed({ status, endDate: '2026-09-20' }, TODAY, GRACE)).toBe(false);
      expect(canBeReactivated({ status, endDate: '2026-09-01' }, TODAY, GRACE)).toBe(false);
    }
  });
});

describe('sale rules: grace period, renew, reactivate', () => {
  it('only an expired sale can be in the grace period, up to endDate + graceDays inclusive', () => {
    expect(isInGracePeriod({ status: 'active', endDate: '2026-09-13' }, TODAY, GRACE)).toBe(false);
    expect(isInGracePeriod({ status: 'cancelled', endDate: '2026-09-13' }, TODAY, GRACE)).toBe(false);
    expect(isInGracePeriod({ status: 'expired', endDate: '2026-09-13' }, TODAY, GRACE)).toBe(true);
    expect(isInGracePeriod({ status: 'expired', endDate: '2026-09-11' }, TODAY, GRACE)).toBe(true);
    expect(isInGracePeriod({ status: 'expired', endDate: '2026-09-10' }, TODAY, GRACE)).toBe(false);
    expect(isInGracePeriod({ status: 'expired', endDate: '2026-09-14' }, TODAY, 0)).toBe(true);
    expect(isInGracePeriod({ status: 'expired', endDate: '2026-09-13' }, TODAY, 0)).toBe(false);
  });

  it('a sale can be renewed when active or expired within grace', () => {
    expect(canBeRenewed({ status: 'active', endDate: '2026-01-01' }, TODAY, GRACE)).toBe(true);
    expect(canBeRenewed({ status: 'expired', endDate: '2026-09-12' }, TODAY, GRACE)).toBe(true);
    expect(canBeRenewed({ status: 'expired', endDate: '2026-09-01' }, TODAY, GRACE)).toBe(false);
    expect(canBeRenewed({ status: 'cancelled', endDate: '2026-10-01' }, TODAY, GRACE)).toBe(false);
  });

  it('a sale can be reactivated when cancelled or expired beyond grace', () => {
    expect(canBeReactivated({ status: 'cancelled', endDate: '2026-10-01' }, TODAY, GRACE)).toBe(true);
    expect(canBeReactivated({ status: 'expired', endDate: '2026-09-01' }, TODAY, GRACE)).toBe(true);
    expect(canBeReactivated({ status: 'expired', endDate: '2026-09-12' }, TODAY, GRACE)).toBe(false);
    expect(canBeReactivated({ status: 'active', endDate: '2026-09-01' }, TODAY, GRACE)).toBe(false);
  });

  it('days until expiration are signed', () => {
    expect(daysUntilExpiration({ status: 'active', endDate: '2026-09-21' }, TODAY)).toBe(7);
    expect(daysUntilExpiration({ status: 'active', endDate: TODAY }, TODAY)).toBe(0);
    expect(daysUntilExpiration({ status: 'expired', endDate: '2026-09-04' }, TODAY)).toBe(-10);
    expect(daysUntilExpiration({ status: 'active', endDate: '2027-01-01' }, '2026-12-31')).toBe(1);
  });

  it('required profile count depends on the capacity', () => {
    expect(requiredProfileCount('profile', 5)).toBe(1);
    expect(requiredProfileCount('full_account', 5)).toBe(5);
  });
});

describe('sale rules: profile coherence and availability', () => {
  const target = { companyId: 'c1', serviceId: 's1', capacity: 'profile' as const, maxProfiles: 2 };

  it('accepts one coherent profile for a profile plan', () => {
    expect(profileCoherenceError(['p1'], [profile()], target)).toBeNull();
  });

  it('rejects missing, duplicated or empty selections', () => {
    expect(profileCoherenceError([], [], target)).toBe('Selecciona al menos un perfil.');
    expect(profileCoherenceError(['p1', 'p2'], [profile()], target)).toBe('Uno o más perfiles no existen.');
    expect(profileCoherenceError(['p1', 'p1'], [profile()], target)).toBe('Uno o más perfiles no existen.');
  });

  it('rejects profiles of another company or service', () => {
    expect(profileCoherenceError(['p1'], [profile({ accountCompanyId: 'c2' })], target)).toMatch(/servicio del plan/);
    expect(profileCoherenceError(['p1'], [profile({ accountServiceId: 's2' })], target)).toMatch(/servicio del plan/);
  });

  it('enforces the capacity', () => {
    const two = [profile(), profile({ id: 'p2', number: 2 })];
    expect(profileCoherenceError(['p1', 'p2'], two, target)).toMatch(/exactamente 1 perfil/);

    const full = { ...target, capacity: 'full_account' as const };
    expect(profileCoherenceError(['p1', 'p2'], two, full)).toBeNull();
    expect(profileCoherenceError(['p1'], [profile()], full)).toBe(
      'Un plan de cuenta completa requiere exactamente 2 perfiles.',
    );
    expect(
      profileCoherenceError(['p1', 'p2'], [profile(), profile({ id: 'p2', accountId: 'a2' })], full),
    ).toMatch(/misma cuenta/);
  });

  it('lists unavailable profiles with a readable label', () => {
    const locked = [
      profile(),
      profile({ id: 'p2', number: 2, status: 'occupied' }),
      profile({ id: 'p3', number: 3, status: 'maintenance' }),
    ];
    expect(unavailableProfiles(locked)).toEqual([
      { id: 'p2', label: 'cuenta@x.com · Perfil 2' },
      { id: 'p3', label: 'cuenta@x.com · Perfil 3' },
    ]);
    expect(profileLabel(null, 4)).toBe('— · Perfil 4');
  });

  it('on reactivation a profile still occupied by the same sale is acceptable, unless a newer sale holds it', () => {
    const own = profile({ status: 'occupied', linkedToSale: true });
    const taken = profile({ id: 'p2', number: 2, status: 'occupied', linkedToSale: true, heldByAnotherSale: true });
    const foreign = profile({ id: 'p3', number: 3, status: 'occupied' });

    expect(unavailableProfiles([own, taken, foreign], { allowOwnOccupied: true }).map((p) => p.id)).toEqual([
      'p2',
      'p3',
    ]);
    expect(unavailableProfiles([own]).map((p) => p.id)).toEqual(['p1']);
  });
});

describe('sale rules: end date', () => {
  it('a 30-day duration renews on the same day of the next month', () => {
    expect(saleEndDate('2026-09-16', 30)).toBe('2026-10-16');
    expect(saleEndDate('2026-10-15', 30)).toBe('2026-11-15');
    expect(saleEndDate('2026-12-31', 30)).toBe('2027-01-31');
  });

  it('a 30-day sale made on a day the next month lacks renews on its last day', () => {
    expect(saleEndDate('2026-10-31', 30)).toBe('2026-11-30');
    expect(saleEndDate('2026-01-31', 30)).toBe('2026-02-28');
    expect(saleEndDate('2026-01-30', 30)).toBe('2026-02-28');
    expect(saleEndDate('2028-01-31', 30)).toBe('2028-02-29');
  });

  it('other durations add calendar days', () => {
    expect(saleEndDate('2026-09-16', 1)).toBe('2026-09-17');
    expect(saleEndDate('2026-09-16', 3)).toBe('2026-09-19');
    expect(saleEndDate('2026-09-16', 7)).toBe('2026-09-23');
    expect(saleEndDate('2026-09-16', 15)).toBe('2026-10-01');
  });
});
