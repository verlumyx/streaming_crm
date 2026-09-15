'use client';

import { useActionState, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { initialActionState } from '@/modules/shared/actions/action-state';
import { createRefundAction, updateRefundAction } from '@/app/[companyId]/refunds/actions';
import type { RefundableSaleDto, RefundDto } from '@/modules/refund/serializers/refund.serializer';

export type RefundFormData = {
  id: string;
  saleId: string;
  amount: number;
  reason: string;
};

type Options =
  | { mode: 'create'; companyId: string; initialId: string; sales: RefundableSaleDto[]; refund?: undefined }
  | { mode: 'edit'; companyId: string; refund: RefundDto; initialId?: undefined; sales?: undefined };

/** Refund form (crear / editar inline). In edit mode only the amount and the reason are sent; the sale is immutable. */
export function useRefundForm(options: Options) {
  const { mode, companyId, refund } = options;
  const sales = options.sales ?? [];

  const [data, setDataState] = useState<RefundFormData>({
    id: refund?.id ?? options.initialId ?? '',
    saleId: refund?.saleId ?? '',
    amount: refund?.amount ?? 0,
    reason: refund?.reason ?? '',
  });

  // companyId / id are bound here — the action never reads them from FormData.
  const action =
    mode === 'create' ? createRefundAction.bind(null, companyId) : updateRefundAction.bind(null, companyId, refund.id);

  const [state, formAction, pending] = useActionState(action, initialActionState);

  useEffect(() => {
    if (state.status === 'error' && state.message && !state.fieldErrors) toast.error(state.message);
  }, [state]);

  const setData = <K extends keyof RefundFormData>(key: K, value: RefundFormData[K]) =>
    setDataState((prev) => ({ ...prev, [key]: value }));

  /** Selecting a sale pre-fills the amount with its price when the amount is still empty. */
  const selectSale = (saleId: string | null) =>
    setDataState((prev) => {
      const sale = sales.find((s) => s.id === saleId);
      return { ...prev, saleId: saleId ?? '', amount: sale && !prev.amount ? sale.price : prev.amount };
    });

  return { mode, companyId, refund, sales, data, setData, selectSale, formAction, pending, errors: state.fieldErrors ?? {} };
}

export type RefundFormState = ReturnType<typeof useRefundForm>;
