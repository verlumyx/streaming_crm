'use client';

import { useActionState, useEffect, useState, useTransition } from 'react';
import { toast } from 'sonner';
import { authClient } from '@/lib/auth-client';
import { initialActionState } from '@/modules/shared/actions/action-state';
import { updateProfileAction } from '@/app/[companyId]/settings/actions';
import { settingsRoutes } from '@/modules/settings/routes';
import type { SettingsProfileDto } from '@/modules/settings/serializers/settings-profile.serializer';
import { settingsAuthErrorMessage } from '@/modules/settings/validation/auth-error-messages';
import type { SettingsActionState } from '../types/Settings';
import { useRecentlySuccessful } from './useRecentlySuccessful';

export type ProfileFormData = { name: string; email: string };

type Options = { companyId: string; profile: SettingsProfileDto };

export function useProfileForm({ companyId, profile }: Options) {
  const [data, setDataState] = useState<ProfileFormData>({ name: profile.name, email: profile.email });

  // companyId is bound here; the user always comes from the session on the server.
  const [state, formAction, pending] = useActionState<SettingsActionState, FormData>(
    updateProfileAction.bind(null, companyId),
    initialActionState,
  );

  useEffect(() => {
    if (state.status === 'error' && state.message && !state.fieldErrors) toast.error(state.message);
  }, [state]);

  const recentlySuccessful = useRecentlySuccessful(state.status === 'success' ? state.savedAt : null);

  const [isSendingVerification, startSendingVerification] = useTransition();
  const [verificationLinkSent, setVerificationLinkSent] = useState(false);

  const resendVerification = () => {
    startSendingVerification(async () => {
      const { error } = await authClient.sendVerificationEmail({
        email: profile.email,
        callbackURL: settingsRoutes.profile(companyId),
      });
      if (error) {
        toast.error(settingsAuthErrorMessage(error, 'No pudimos enviar el correo de verificación. Intenta de nuevo.'));
        return;
      }
      setVerificationLinkSent(true);
    });
  };

  const setData = <K extends keyof ProfileFormData>(key: K, value: ProfileFormData[K]) =>
    setDataState((prev) => ({ ...prev, [key]: value }));

  return {
    profile,
    data,
    setData,
    formAction,
    pending,
    errors: state.status === 'success' ? {} : (state.fieldErrors ?? {}),
    recentlySuccessful,
    resendVerification,
    isSendingVerification,
    verificationLinkSent,
  };
}
