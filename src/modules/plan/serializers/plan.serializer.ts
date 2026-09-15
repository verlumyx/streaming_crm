import type { PlanCapacity } from '../models/plan.model';
import type { PlanRecord, PlanServiceRef } from '../repositories/plan.repository';

export type PlanServiceDto = PlanServiceRef;

export type PlanDto = {
  id: string;
  code: string;
  serviceId: string;
  service: PlanServiceDto;
  name: string;
  capacity: PlanCapacity;
  durationDays: number;
  /** `numeric(10,2)` column, serialized as a number. */
  salePrice: number;
  /** `numeric(5,2)` column, serialized as a number. */
  roiTargetPct: number;
  active: boolean;
  createdAt: string;
  updatedAt: string | null;
};

export function toPlanDto(record: PlanRecord): PlanDto {
  return {
    id: record.id,
    code: record.code,
    serviceId: record.serviceId,
    service: { ...record.service },
    name: record.name,
    capacity: record.capacity,
    durationDays: record.durationDays,
    salePrice: Number(record.salePrice),
    roiTargetPct: Number(record.roiTargetPct),
    active: record.active,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt?.toISOString() ?? null,
  };
}
