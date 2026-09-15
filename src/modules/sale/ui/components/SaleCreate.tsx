'use client';

import type {
  SaleAvailableProfileDto,
  SaleClientOptionDto,
  SalePlanOptionDto,
} from '@/modules/sale/serializers/sale.serializer';
import { SaleFormProvider } from '../contexts/SaleFormContext';
import { useSaleForm } from '../hooks/useSaleForm';
import { SaleWizard } from './SaleWizard';

type Props = {
  companyId: string;
  initialId: string;
  today: string;
  clients: SaleClientOptionDto[];
  plans: SalePlanOptionDto[];
  availableProfiles: SaleAvailableProfileDto[];
  preselectedClientId: string | null;
};

/** Crear: instantiates the wizard hook and exposes it through the context. */
export function SaleCreate(props: Props) {
  const form = useSaleForm(props);

  return (
    <SaleFormProvider value={form}>
      <SaleWizard />
    </SaleFormProvider>
  );
}
