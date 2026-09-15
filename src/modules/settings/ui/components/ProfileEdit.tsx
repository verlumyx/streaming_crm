'use client';

import type { SettingsProfileDto } from '@/modules/settings/serializers/settings-profile.serializer';
import { ProfileFormProvider } from '../contexts/ProfileFormContext';
import { useProfileForm } from '../hooks/useProfileForm';
import { ProfileForm } from './ProfileForm';

export function ProfileEdit({ companyId, profile }: { companyId: string; profile: SettingsProfileDto }) {
  const form = useProfileForm({ companyId, profile });

  return (
    <ProfileFormProvider value={form}>
      <ProfileForm />
    </ProfileFormProvider>
  );
}
