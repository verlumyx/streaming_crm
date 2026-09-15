'use client';

import { PasswordFormProvider } from '../contexts/PasswordFormContext';
import { usePasswordForm } from '../hooks/usePasswordForm';
import { PasswordForm } from './PasswordForm';

export function PasswordEdit() {
  const form = usePasswordForm();

  return (
    <PasswordFormProvider value={form}>
      <PasswordForm />
    </PasswordFormProvider>
  );
}
