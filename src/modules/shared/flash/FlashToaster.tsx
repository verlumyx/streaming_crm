'use client';

import { Suspense, useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import type { Flash } from './flash';
import { clearFlashAction } from './flash-actions';

type Props = { flash: Flash | null };

const QUERY_ERRORS: Record<string, string> = {
  forbidden: 'No tienes permiso para acceder a esta sección.',
  'not-found': 'El recurso solicitado no existe.',
  'company-inactive':
    'La empresa a la que intentaste acceder está inactiva o tu acceso a ella no está activo. Te redirigimos a una empresa activa.',
};

function FlashToasterInner({ flash }: Props) {
  const params = useSearchParams();
  const queryError = params.get('error');
  const shown = useRef<string | null>(null);

  useEffect(() => {
    const key = flash ? `${flash.type}:${flash.message}` : queryError ? `query:${queryError}` : null;
    if (!key || shown.current === key) return;
    shown.current = key;

    if (flash) {
      if (flash.type === 'success') toast.success(flash.message);
      else toast.error(flash.message);
      void clearFlashAction();
    } else if (queryError) {
      toast.error(QUERY_ERRORS[queryError] ?? queryError);
    }
  }, [flash, queryError]);

  return null;
}

/** Shows the one-shot flash (set by Server Actions) and `?error=` flags (set by page guards) as toasts. */
export function FlashToaster(props: Props) {
  return (
    <Suspense fallback={null}>
      <FlashToasterInner {...props} />
    </Suspense>
  );
}
