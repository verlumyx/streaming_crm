import type { ReactNode } from 'react';

interface FormSectionHeadProps {
  step: number | string;
  title: string;
  sub?: string;
  children?: ReactNode;
}

/** Cabecera numerada de sección de formulario (diseño StreamCRM). */
export function FormSectionHead({ step, title, sub, children }: FormSectionHeadProps) {
  return (
    <div className="flex items-center gap-3 border-b p-5">
      <span className="bg-primary-soft text-primary grid size-[30px] shrink-0 place-items-center rounded-[9px] text-sm font-extrabold">
        {step}
      </span>
      <div className="mr-auto">
        <div className="text-base font-bold tracking-tight">{title}</div>
        {sub && <div className="text-muted-foreground mt-0.5 text-[13px]">{sub}</div>}
      </div>
      {children}
    </div>
  );
}
