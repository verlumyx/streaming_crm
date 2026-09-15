'use client';

import { useState } from 'react';
import { ChevronDown, ChevronRight, FileText, Folder, FolderOpen } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import type { PermissionTreeModuleDto } from '../types/Role';

type Props = {
  modules: PermissionTreeModuleDto[];
  /** Selected action strings. */
  selected: string[];
  onChange: (selected: string[]) => void;
  disabled?: boolean;
};

/** Module → actions tree with expand/collapse, "select whole module" and a partial state. */
export function RolePermissionsTree({ modules, selected, onChange, disabled = false }: Props) {
  const [expanded, setExpanded] = useState<string[]>([]);

  if (modules.length === 0) {
    return <p className="text-muted-foreground text-sm">No hay permisos disponibles.</p>;
  }

  const toggleExpanded = (moduleId: string) =>
    setExpanded((prev) => (prev.includes(moduleId) ? prev.filter((id) => id !== moduleId) : [...prev, moduleId]));

  const togglePermission = (action: string) => {
    if (disabled) return;
    onChange(selected.includes(action) ? selected.filter((a) => a !== action) : [...selected, action]);
  };

  const toggleModule = (module: PermissionTreeModuleDto) => {
    if (disabled) return;
    const actions = module.permissions.map((p) => p.action);
    const isFull = actions.every((a) => selected.includes(a));
    onChange(isFull ? selected.filter((a) => !actions.includes(a)) : [...new Set([...selected, ...actions])]);
  };

  return (
    <div className="flex flex-col gap-1">
      {modules.map((module) => {
        const isExpanded = expanded.includes(module.id);
        const selectedCount = module.permissions.filter((p) => selected.includes(p.action)).length;
        const isFull = module.permissions.length > 0 && selectedCount === module.permissions.length;
        const isPartial = selectedCount > 0 && !isFull;

        return (
          <div key={module.id} className="flex flex-col gap-1">
            <div className="hover:bg-muted flex items-center gap-2 rounded-md px-2 py-1.5">
              <button
                type="button"
                onClick={() => toggleExpanded(module.id)}
                className="hover:bg-accent rounded p-0.5"
                aria-label={isExpanded ? `Contraer ${module.label}` : `Expandir ${module.label}`}
                aria-expanded={isExpanded}
              >
                {isExpanded ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
              </button>
              {isExpanded ? (
                <FolderOpen className="text-muted-foreground size-4" />
              ) : (
                <Folder className="text-muted-foreground size-4" />
              )}
              <Checkbox
                id={`module-${module.id}`}
                checked={isFull ? true : isPartial ? 'indeterminate' : false}
                onCheckedChange={() => toggleModule(module)}
                disabled={disabled}
                className={cn(isPartial && 'border-primary bg-primary/50 text-primary-foreground')}
              />
              <label htmlFor={`module-${module.id}`} className="flex-1 cursor-pointer text-sm font-semibold">
                {module.label}
              </label>
              <span className="text-muted-foreground text-xs tabular-nums">
                {selectedCount}/{module.permissions.length}
              </span>
            </div>

            {isExpanded && (
              <div className="ml-6 flex flex-col gap-1">
                {module.permissions.map((permission) => (
                  <div key={permission.id} className="hover:bg-muted flex items-center gap-2 rounded-md px-2 py-1">
                    <span className="w-5" />
                    <FileText className="text-muted-foreground size-4" />
                    <Checkbox
                      id={`permission-${permission.id}`}
                      checked={selected.includes(permission.action)}
                      onCheckedChange={() => togglePermission(permission.action)}
                      disabled={disabled}
                    />
                    <label htmlFor={`permission-${permission.id}`} className="cursor-pointer text-sm">
                      {permission.label}
                    </label>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
