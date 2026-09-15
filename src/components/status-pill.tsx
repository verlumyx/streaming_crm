import type { ReactNode } from 'react';

export type StatusKind =
  'activo' | 'porvencer' | 'vencido' | 'libre' | 'moroso' | 'inactivo' | 'pagado' | 'pendiente';

const ESTADOS: Record<StatusKind, { label: string; className: string }> = {
  activo: { label: 'Activo', className: 'bg-ok-soft text-ok' },
  porvencer: { label: 'Por vencer', className: 'bg-warn-soft text-warn' },
  vencido: { label: 'Vencido', className: 'bg-bad-soft text-bad' },
  libre: { label: 'Libre', className: 'bg-info-soft text-info' },
  moroso: { label: 'Con deuda', className: 'bg-warn-soft text-warn' },
  inactivo: { label: 'Inactivo', className: 'bg-mute-soft text-mute' },
  pagado: { label: 'Pagado', className: 'bg-ok-soft text-ok' },
  pendiente: { label: 'Pendiente', className: 'bg-warn-soft text-warn' },
};

interface StatusPillProps {
  kind: StatusKind;
  children?: ReactNode;
  dot?: boolean;
}

/** Pastilla de estado con punto de color (diseño StreamCRM). */
export function StatusPill({ kind, children, dot = true }: StatusPillProps) {
  const e = ESTADOS[kind] ?? ESTADOS.inactivo;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[12.5px] font-bold whitespace-nowrap ${e.className}`}
    >
      {dot && <span className="size-1.5 rounded-full bg-current opacity-85" />}
      {children ?? e.label}
    </span>
  );
}
