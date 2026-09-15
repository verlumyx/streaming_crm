import type { LucideIcon } from 'lucide-react';
import type { ComponentProps, ReactNode } from 'react';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

/* ------------------------------------------------------------------ */
/* PageShell                                                           */
/* ------------------------------------------------------------------ */

interface PageShellProps {
  title: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
  /** Enlace "volver" sobre el título (p. ej. `<BackLink>`). */
  back?: ReactNode;
  children: ReactNode;
  className?: string;
}

/**
 * Contenedor común de las páginas de módulo (diseño StreamCRM):
 * título grande, subtítulo y acciones a la derecha.
 */
export function PageShell({ title, subtitle, actions, back, children, className }: PageShellProps) {
  return (
    <div className={cn('mx-auto w-full max-w-7xl p-6 pb-14', className)}>
      <div className="flex flex-col gap-5">
        {back}
        <div className="flex flex-col items-start justify-between gap-4 sm:flex-row">
          <div>
            <h1 className="text-[27px] font-extrabold tracking-tight">{title}</h1>
            {subtitle && <p className="text-muted-foreground mt-1 text-[14.5px]">{subtitle}</p>}
          </div>
          {actions && <div className="flex flex-wrap gap-2.5">{actions}</div>}
        </div>
        {children}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* ListGrid — "tabla" en CSS grid                                       */
/* ------------------------------------------------------------------ */

interface ListGridProps {
  children: ReactNode;
  className?: string;
}

/** Tarjeta contenedora de la lista (cabecera + filas + pie). */
export function ListGrid({ children, className }: ListGridProps) {
  return <Card className={cn('gap-0 overflow-hidden rounded-2xl py-0', className)}>{children}</Card>;
}

interface ListGridHeaderProps {
  /** Clase de columnas, p. ej. `lg:grid-cols-[0.9fr_2.2fr_1.2fr_0.9fr_1.2fr]`. */
  columns: string;
  children: ReactNode;
  className?: string;
}

/** Fila de cabecera; oculta en móvil, grid a partir de `lg`. */
export function ListGridHeader({ columns, children, className }: ListGridHeaderProps) {
  return (
    <div
      className={cn('bg-muted hidden h-12 items-center gap-3.5 border-b px-5 lg:grid', columns, className)}
    >
      {children}
    </div>
  );
}

interface ListGridHeadCellProps {
  children: ReactNode;
  align?: 'left' | 'right' | 'center';
  className?: string;
}

/** Celda de cabecera (texto en mayúsculas). */
export function ListGridHeadCell({ children, align = 'left', className }: ListGridHeadCellProps) {
  return (
    <div
      className={cn(
        'text-muted-foreground text-[11.5px] font-bold tracking-wider uppercase',
        align === 'right' && 'text-right',
        align === 'center' && 'text-center',
        className,
      )}
    >
      {children}
    </div>
  );
}

interface ListGridBodyProps {
  children: ReactNode;
  className?: string;
}

export function ListGridBody({ children, className }: ListGridBodyProps) {
  return <div className={cn('flex flex-col', className)}>{children}</div>;
}

interface ListGridRowProps extends Omit<ComponentProps<'div'>, 'children'> {
  /** Misma clase de columnas que la cabecera. */
  columns: string;
  children: ReactNode;
}

/**
 * Fila clicable. En móvil se reduce a `grid-cols-[1fr_auto]` (contenido + acciones);
 * las celdas secundarias deben llevar `hidden lg:block`.
 */
export function ListGridRow({ columns, children, className, ...props }: ListGridRowProps) {
  return (
    <div
      className={cn(
        'hover:bg-muted grid min-h-[66px] cursor-pointer grid-cols-[1fr_auto] items-center gap-3.5 border-b px-5 py-3 transition-colors last:border-b-0 lg:py-0',
        columns,
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* EmptyState                                                          */
/* ------------------------------------------------------------------ */

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

/** Estado vacío de una lista o sección. */
export function EmptyState({ icon: Icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center gap-2 p-12 text-center', className)}>
      {Icon && (
        <span className="bg-primary-soft text-primary mb-1 grid size-12 place-items-center rounded-2xl">
          <Icon className="size-6" />
        </span>
      )}
      <p className="text-base font-bold tracking-tight">{title}</p>
      {description && <p className="text-muted-foreground max-w-md text-sm">{description}</p>}
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* ListFooter                                                          */
/* ------------------------------------------------------------------ */

interface ListFooterProps {
  shown: number;
  total: number;
  /** Sustantivo en singular, p. ej. `cliente`. */
  noun: string;
  /** Plural explícito cuando no basta con añadir `s`. */
  nounPlural?: string;
  children?: ReactNode;
  className?: string;
}

/** Pie de lista: "12 de 48 clientes". */
export function ListFooter({ shown, total, noun, nounPlural, children, className }: ListFooterProps) {
  const label = total === 1 ? noun : (nounPlural ?? `${noun}s`);
  return (
    <div
      className={cn(
        'text-muted-foreground flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 text-[13px] font-semibold',
        className,
      )}
    >
      <span>
        {shown} de {total} {label}
      </span>
      {children}
    </div>
  );
}
