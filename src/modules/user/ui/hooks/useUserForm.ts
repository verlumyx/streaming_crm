'use client';

import { useActionState, useEffect, useState, useTransition } from 'react';
import { toast } from 'sonner';
import { initialActionState } from '@/modules/shared/actions/action-state';
import { checkUserEmailAction, createUserAction, updateUserAction } from '@/app/[companyId]/users/actions';
import type { RoleOptionDto } from '@/modules/role/serializers/role.serializer';
import type { UserDto } from '@/modules/user/serializers/user.serializer';

export type UserFormData = {
  id: string;
  email: string;
  name: string;
  password: string;
  passwordConfirmation: string;
  roleId: string;
  existingUserId: string;
};

export type ExistingUser = { id: string; name: string };

type Options =
  | { mode: 'create'; companyId: string; initialId: string; roles: RoleOptionDto[]; user?: undefined }
  | { mode: 'edit'; companyId: string; user: UserDto; roles: RoleOptionDto[]; initialId?: undefined };

export function useUserForm(options: Options) {
  const { mode, companyId, user, roles } = options;

  const [data, setDataState] = useState<UserFormData>(() => ({
    id: user?.id ?? options.initialId ?? '',
    email: user?.email ?? '',
    name: user?.name ?? '',
    password: '',
    passwordConfirmation: '',
    roleId: user?.role?.id ?? '',
    existingUserId: '',
  }));

  // Create flow: step 1 asks only for the email.
  const [emailStep, setEmailStep] = useState(mode === 'create');
  const [existingUser, setExistingUser] = useState<ExistingUser | null>(null);
  const [alreadyInCompany, setAlreadyInCompany] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [isCheckingEmail, startEmailCheck] = useTransition();

  // companyId / id are bound here — the action never reads them from FormData.
  const action =
    mode === 'create' ? createUserAction.bind(null, companyId) : updateUserAction.bind(null, companyId, user.id);

  const [state, formAction, pending] = useActionState(action, initialActionState);

  useEffect(() => {
    if (state.status === 'error' && state.message) toast.error(state.message);
  }, [state]);

  const setData = <K extends keyof UserFormData>(key: K, value: UserFormData[K]) =>
    setDataState((prev) => ({ ...prev, [key]: value }));

  const handleEmailCheck = (email: string) => {
    setAlreadyInCompany(false);
    setEmailError(null);

    startEmailCheck(async () => {
      const result = await checkUserEmailAction(companyId, email);

      if (result.status !== 'ok') {
        const message = result.fieldErrors?.email?.[0] ?? result.message ?? 'No se pudo verificar el email.';
        setEmailError(message);
        return;
      }
      if (result.alreadyInCompany) {
        setAlreadyInCompany(true);
        return;
      }

      setExistingUser(result.user);
      setDataState((prev) => ({
        ...prev,
        email: email.trim().toLowerCase(),
        name: result.user?.name ?? '',
        existingUserId: result.user?.id ?? '',
        password: '',
        passwordConfirmation: '',
      }));
      setEmailStep(false);
    });
  };

  const handleChangeEmail = () => {
    setEmailStep(true);
    setExistingUser(null);
    setAlreadyInCompany(false);
    setEmailError(null);
    setDataState((prev) => ({ ...prev, existingUserId: '', name: '', password: '', passwordConfirmation: '' }));
  };

  return {
    mode,
    data,
    setData,
    roles,
    formAction,
    pending,
    errors: state.fieldErrors ?? {},
    emailStep,
    existingUser,
    alreadyInCompany,
    emailError,
    isCheckingEmail,
    handleEmailCheck,
    handleChangeEmail,
  };
}
