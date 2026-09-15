export type PermissionDefinition = {
  /** Action string, e.g. `users.list`. Stored on `app_role_permissions.permission`. */
  id: string;
  label: string;
  order: number;
};

export type ModuleDefinition = {
  /** Module slug, e.g. `users`, `manual-transactions`. */
  id: string;
  label: string;
  icon: string;
  order: number;
  permissions: readonly PermissionDefinition[];
};
