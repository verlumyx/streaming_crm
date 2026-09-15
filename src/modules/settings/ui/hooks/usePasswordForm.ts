'use client';

import { useRef, useState, useTransition, type FormEvent } from 'react';
import { toast } from 'sonner';
import { z } from 'zod';
import { authClient } from '@/lib/auth-client';
import { changePasswordSchema } from '@/modules/settings/validation/change-password.schema';
import { changePasswordErrors } from '@/modules/settings/validation/auth-error-messages';
import type { PasswordFormData, PasswordFormErrors } from '../types/Settings';
import { useRecentlySuccessful } from './useRecentlySuccessful';

const EMPTY: PasswordFormData = { currentPassword: '', password: '', passwordConfirmation: '' };

export function usePasswordForm() {
  const currentPasswordRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const [data, setDataState] = useState<PasswordFormData>(EMPTY);
  const [errors, setErrors] = useState<PasswordFormErrors>({});
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [pending, startTransition] = useTransition();
  const recentlySuccessful = useRecentlySuccessful(savedAt);

  /** Like Inertia's `resetOnError`: clear every field and focus the offending one. */
  const fail = (nextErrors: PasswordFormErrors) => {
    setErrors(nextErrors);
    setDataState(EMPTY);
    if (nextErrors.form) toast.error(nextErrors.form);
    if (nextErrors.currentPassword) currentPasswordRef.current?.focus();
    else if (nextErrors.password) passwordRef.current?.focus();
  };

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrors({});

    const parsed = changePasswordSchema.safeParse(data);
    if (!parsed.success) {
      const fieldErrors = z.flattenError(parsed.error).fieldErrors;
      fail({ currentPassword: fieldErrors.currentPassword?.[0], password: fieldErrors.password?.[0] });
      return;
    }

    startTransition(async () => {
      const { error } = await authClient.changePassword({
        currentPassword: parsed.data.currentPassword,
        newPassword: parsed.data.password,
        revokeOtherSessions: false,
      });

      if (error) {
        fail(changePasswordErrors(error));
        return;
      }

      setDataState(EMPTY);
      setSavedAt(Date.now());
    });
  };

  const setData = <K extends keyof PasswordFormData>(key: K, value: PasswordFormData[K]) =>
    setDataState((prev) => ({ ...prev, [key]: value }));

  return { data, setData, errors, pending, submit, recentlySuccessful, currentPasswordRef, passwordRef };
}
