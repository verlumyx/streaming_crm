import { z } from 'zod';
import { PERMISSION_TYPES } from '../models/role.model';
import { OWNER_ONLY_MODULES, PERMISSION_REGISTRY } from '@/modules/shared/permissions/registry';
import { optionalText, requiredText } from '@/modules/shared/validation/fields';

/** Actions a role may hold: every registered permission except owner-only modules (`companies`). */
export const ASSIGNABLE_PERMISSION_ACTIONS: readonly string[] = PERMISSION_REGISTRY.filter(
  (module) => !(OWNER_ONLY_MODULES as readonly string[]).includes(module.id),
).flatMap((module) => module.permissions.map((permission) => permission.id));

const assignable = new Set(ASSIGNABLE_PERMISSION_ACTIONS);

/** The form sends the selection as a JSON array in a hidden `permissions` input. */
function parseJsonArray(value: unknown): unknown {
  if (value === undefined || value === null || value === '') return [];
  if (typeof value !== 'string') return value;
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

const permissionsField = z.preprocess(
  parseJsonArray,
  z
    .array(z.string({ message: 'Los permisos no son válidos.' }), { message: 'Los permisos no son válidos.' })
    .refine((actions) => actions.every((action) => assignable.has(action)), {
      message: 'Uno o más permisos no son válidos.',
    })
    .transform((actions) => [...new Set(actions)]),
);

/** Fields shared by Crear and Actualizar (before normalization). */
export const roleFieldsSchema = z.object({
  name: requiredText('El nombre', 255),
  description: optionalText('La descripción', 1000),
  permissionType: z.enum(PERMISSION_TYPES, { message: 'El tipo de permisos no es válido.' }).default('custom'),
  permissions: permissionsField,
});

/** Only `custom` roles store individual permissions; `all` passes every check on its own. */
export function keepCustomPermissions<T extends { permissionType: string; permissions: string[] }>(input: T): T {
  return { ...input, permissions: input.permissionType === 'custom' ? input.permissions : [] };
}

/** Actualizar. Name uniqueness and the `Administrador` lock are business rules (service). */
export const updateRoleSchema = roleFieldsSchema.transform(keepCustomPermissions);

export type UpdateRoleInput = z.infer<typeof updateRoleSchema>;
