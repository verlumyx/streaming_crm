import Link from 'next/link';
import type { ReactNode } from 'react';
import { Building2, Calendar, Clock, Edit, FileText } from 'lucide-react';
import { BackLink } from '@/components/back-link';
import { StatusPill } from '@/components/status-pill';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { formatDateTime } from '@/lib/format';
import { companyRoutes } from '@/modules/company/routes';
import type { CompanyDto } from '@/modules/company/serializers/company.serializer';
import { CompanyStatusButton } from './CompanyStatusButton';

type Props = { companyId: string; company: CompanyDto };

/** Ver: hero with actions, information and audit data. Server component. */
export function CompanyShow({ companyId, company }: Props) {
  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-5 p-6 pb-14">
      <BackLink href={companyRoutes.index(companyId)}>Empresas</BackLink>

      <Card className="flex-row flex-wrap items-center justify-between gap-5 rounded-2xl p-5">
        <div className="flex items-center gap-[18px]">
          <span className="bg-primary-soft text-primary grid size-16 shrink-0 place-items-center rounded-2xl">
            <Building2 className="size-8" />
          </span>
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-extrabold tracking-tight">{company.name}</h1>
              <StatusPill kind={company.status === 'inactive' ? 'inactivo' : 'activo'} />
            </div>
            <span className="text-muted-foreground text-[13.5px] font-medium">Detalles de la empresa</span>
          </div>
        </div>

        <div className="flex flex-wrap gap-2.5">
          <CompanyStatusButton companyId={companyId} targetCompanyId={company.id} status={company.status} />
          <Button asChild variant="outline" className="bg-card h-10 rounded-[11px] px-4 font-semibold">
            <Link href={companyRoutes.edit(companyId, company.id)}>
              <Edit />
              Editar
            </Link>
          </Button>
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <Card className="gap-4 rounded-2xl p-5">
          <SectionTitle>Información</SectionTitle>
          <Field label="Nombre">{company.name}</Field>
          <Field label="Descripción" icon={<FileText className="size-3.5" />}>
            <span className="whitespace-pre-wrap">{company.description ?? '—'}</span>
          </Field>
        </Card>

        <Card className="gap-4 rounded-2xl p-5">
          <SectionTitle>Auditoría</SectionTitle>
          <Field label="Fecha de creación" icon={<Calendar className="size-3.5" />}>
            {formatDateTime(company.createdAt)}
          </Field>
          {company.updatedAt && (
            <Field label="Última actualización" icon={<Clock className="size-3.5" />}>
              {formatDateTime(company.updatedAt)}
            </Field>
          )}
        </Card>
      </div>
    </div>
  );
}

function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <h3 className="text-muted-foreground border-b pb-2 text-[12px] font-bold tracking-wider uppercase">
      {children}
    </h3>
  );
}

function Field({ label, icon, children }: { label: string; icon?: ReactNode; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-muted-foreground inline-flex items-center gap-1.5 text-[12.5px] font-semibold">
        {icon}
        {label}
      </span>
      <span className="text-sm font-medium">{children}</span>
    </div>
  );
}
