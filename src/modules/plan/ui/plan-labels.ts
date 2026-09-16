import type { PlanCapacity } from '@/modules/plan/models/plan.model';

/** `1 día` / `30 días`. */
export const planDurationLabel = (days: number) => `${days} día${days === 1 ? '' : 's'}`;

export const PLAN_CAPACITY_LABELS: Record<PlanCapacity, string> = {
  profile: 'Perfil',
  full_account: 'Cuenta completa',
};
