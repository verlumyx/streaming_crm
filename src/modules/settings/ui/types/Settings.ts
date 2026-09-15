import type { ActionState } from '@/modules/shared/actions/action-state';

/** Settings actions may stay on the page and report success instead of redirecting. */
export type SettingsSuccessState = { status: 'success'; message: string; savedAt: number };
export type SettingsActionState = ActionState | SettingsSuccessState;

export type PasswordFormField = 'currentPassword' | 'password' | 'passwordConfirmation';
export type PasswordFormData = Record<PasswordFormField, string>;
export type PasswordFormErrors = Partial<Record<PasswordFormField | 'form', string>>;

export type TwoFactorPasswordMode = 'enable' | 'disable' | 'regenerate';
export type TwoFactorSetupStep = 'setup' | 'verify' | 'codes';
